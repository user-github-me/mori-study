import { z } from 'zod';
import { describeFile, MAX_FILE_SIZE } from '@/lib/extract';
import { getWorkspace, MoriError, saveFileSource, saveTextSource } from '@/lib/storage';
import { apiError, assertLocalWrite, readFormData, readJson } from '../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(
      { sources: (await getWorkspace()).sources },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalWrite(request);
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const form = await readFormData(request);
      const files = [...form.getAll('files'), ...form.getAll('file')].filter(
        (value): value is File => typeof value !== 'string',
      );
      if (!files.length) throw new MoriError('Choose a source file to upload.');
      if (files.length > 10) throw new MoriError('Upload at most 10 files at a time.');
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE)
          throw new MoriError(`${file.name} exceeds the 25 MB per-file limit.`, 413);
        if (!file.size) throw new MoriError(`${file.name} is empty.`, 422);
        try {
          describeFile(file.name);
        } catch (error) {
          throw new MoriError(error instanceof Error ? error.message : 'Unsupported file.', 415);
        }
      }
      const sources = [];
      const errors = [];
      for (const file of files) {
        try {
          sources.push(await saveFileSource(file.name, new Uint8Array(await file.arrayBuffer())));
        } catch (error) {
          errors.push({
            name: file.name,
            error: error instanceof Error ? error.message : 'Could not read this file.',
          });
        }
      }
      if (!sources.length)
        throw new MoriError(errors.map((item) => `${item.name}: ${item.error}`).join('\n'), 422);
      return Response.json({ sources, ...(errors.length ? { errors } : {}) }, { status: 201 });
    }
    const input = z
      .object({
        name: z.string().max(180).optional(),
        text: z.string().max(1_000_000).optional(),
        url: z.string().max(2_000).optional(),
      })
      .parse(await readJson(request, 5 * 1024 * 1024));
    return Response.json({ sources: [await saveTextSource(input)] }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
