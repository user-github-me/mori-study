import path from 'node:path';
import { unzipSync } from 'fflate';
import type { Source } from './types';

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 1_000_000;
const MAX_EXPANDED_OFFICE_SIZE = 64 * 1024 * 1024;
const fileTypes: Record<string, { type: Source['type']; mime: string }> = {
  '.pdf': { type: 'pdf', mime: 'application/pdf' },
  '.txt': { type: 'text', mime: 'text/plain; charset=utf-8' },
  '.md': { type: 'text', mime: 'text/markdown; charset=utf-8' },
  '.markdown': { type: 'text', mime: 'text/markdown; charset=utf-8' },
  '.csv': { type: 'text', mime: 'text/csv; charset=utf-8' },
  '.docx': {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  '.pptx': {
    type: 'document',
    mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  '.png': { type: 'image', mime: 'image/png' },
  '.jpg': { type: 'image', mime: 'image/jpeg' },
  '.jpeg': { type: 'image', mime: 'image/jpeg' },
  '.webp': { type: 'image', mime: 'image/webp' },
  '.gif': { type: 'image', mime: 'image/gif' },
};

export function describeFile(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  const descriptor = fileTypes[extension];
  if (!descriptor)
    throw new Error(
      'Supported files: PDF, DOCX, PPTX, TXT, Markdown, CSV, PNG, JPG, WebP, and GIF.',
    );
  return { ...descriptor, extension };
}

function boundText(value: string) {
  const clean = value.replace(/\u0000/g, '').trim();
  return clean.length > MAX_TEXT_LENGTH
    ? `${clean.slice(0, MAX_TEXT_LENGTH)}\n\n[Extraction truncated at ${MAX_TEXT_LENGTH.toLocaleString()} characters. Read the original file for remaining content.]`
    : clean;
}

function decodeXml(value: string) {
  return value.replace(
    /&#(x[\da-f]+|\d+);|&(lt|gt|amp|quot|apos);/gi,
    (match, code: string | undefined, named: string | undefined) => {
      if (code) {
        const point = code.toLowerCase().startsWith('x')
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
      }
      return (
        ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[
          named?.toLowerCase() || ''
        ] || match
      );
    },
  );
}

function xmlText(xml: string, prefix: 'w' | 'a') {
  // Parse only text runs. Never load DTDs, external entities, macros, or links.
  const paragraphs = xml.split(new RegExp(`</${prefix}:p>`));
  return paragraphs
    .map((paragraph) => {
      const tokens = paragraph.matchAll(
        new RegExp(`<${prefix}:(?:t(?:\\s[^>]*)?>[\\s\\S]*?<\\/${prefix}:t>|tab\\s*\\/>)`, 'g'),
      );
      return Array.from(tokens, ([token]) =>
        token.includes(':tab') ? '\t' : decodeXml(token.replace(/^<[^>]+>|<\/[^>]+>$/g, '')),
      ).join('');
    })
    .filter(Boolean)
    .join('\n');
}

function extractOffice(bytes: Uint8Array, extension: string) {
  let expanded = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      const wanted =
        extension === '.docx'
          ? /^word\/(document|footnotes|endnotes)\.xml$/.test(file.name)
          : /^ppt\/slides\/slide\d+\.xml$/.test(file.name);
      if (wanted) {
        expanded += file.originalSize;
        if (expanded > MAX_EXPANDED_OFFICE_SIZE)
          throw new Error(
            'This document expands beyond the 64 MB extraction limit. Split it into smaller files.',
          );
      }
      return wanted;
    },
  });
  const names = Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!names.length)
    throw new Error('This file does not contain readable DOCX/PPTX document data.');
  const parts = names.map((name) => {
    const content = xmlText(
      new TextDecoder().decode(files[name]),
      extension === '.docx' ? 'w' : 'a',
    );
    const slide = name.match(/slide(\d+)\.xml$/)?.[1];
    return slide ? `[Slide ${slide}]\n${content}` : content;
  });
  const content = boundText(parts.join('\n\n'));
  return (
    content ||
    '[No text was found. This document may contain scanned pages or diagrams. Ask your agent to inspect the original file visually.]'
  );
}

export async function extractText(
  bytes: Uint8Array,
  filename: string,
): Promise<string | undefined> {
  const { type, extension } = describeFile(filename);
  if (bytes.byteLength === 0) throw new Error('This file is empty.');
  if (bytes.byteLength > MAX_FILE_SIZE) throw new Error('Each file must be 25 MB or smaller.');
  if (type === 'image') return undefined;
  if (type === 'text') return boundText(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
  if (type === 'document') return extractOffice(bytes, extension);

  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: new Uint8Array(bytes),
    // pdfjs-dist 6 removed the unsafe font-code eval path (and isEvalSupported).
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  let pdf;
  try {
    pdf = await task.promise;
    const pages: string[] = [];
    let length = 0;
    const pageLimit = Math.min(pdf.numPages, 500);
    for (let number = 1; number <= pageLimit; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      let body = '';
      for (const item of content.items) {
        if ('str' in item) body += item.str + (item.hasEOL ? '\n' : ' ');
      }
      pages.push(`[Page ${number}]\n${body.trim()}`);
      length += body.length;
      page.cleanup();
      if (length > MAX_TEXT_LENGTH) {
        pages.push('[Extraction truncated. Inspect the original PDF for remaining pages.]');
        break;
      }
    }
    if (pdf.numPages > pageLimit)
      pages.push(
        `[Extraction includes the first ${pageLimit} of ${pdf.numPages} pages. Read the original for remaining pages.]`,
      );
    const extracted = boundText(pages.join('\n\n'));
    const hasText = pages.some((page) => page.replace(/^\[Page \d+\]\s*/, '').trim());
    return hasText
      ? extracted
      : '[This PDF has no selectable text. It may be scanned. Ask your agent to inspect the original pages visually; Mori has not performed OCR.]';
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException')
      throw new Error('This PDF is password protected. Upload an unlocked copy.');
    throw new Error(
      `Could not extract this PDF: ${error instanceof Error ? error.message : 'invalid document'}`,
    );
  } finally {
    await task.destroy();
  }
}
