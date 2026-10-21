import { z } from 'zod';
import { MoriError } from '@/lib/storage';
import { validationMessage } from '@/lib/schema';

export function assertLocalWrite(request: Request) {
  const host = request.headers.get('host') || new URL(request.url).host;
  const hostname = new URL(`http://${host}`).hostname;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
    throw new MoriError('Mori write APIs are available only on localhost.', 403);
  }
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    throw new MoriError('Cross-site writes are not allowed.', 403);
  const origin = request.headers.get('origin');
  if (origin) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new MoriError('Invalid request origin.', 403);
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== host)
      throw new MoriError('Cross-origin writes are not allowed.', 403);
  }
}

export function apiError(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      { error: validationMessage(error), issues: error.issues },
      { status: 422 },
    );
  if (error instanceof MoriError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error('[Mori API]', error instanceof Error ? error.message : 'Unexpected error');
  return Response.json(
    {
      error:
        'Mori could not complete this operation. Your existing data has been preserved. Check the local terminal for details.',
    },
    { status: 500 },
  );
}

async function readBody(request: Request, limit: number): Promise<Buffer> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit)
    throw new MoriError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new MoriError('Request body is required.');
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new MoriError('Request is too large.', 413);
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(parts);
}

export async function readJson(request: Request, limit = 20 * 1024 * 1024): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new MoriError('Use Content-Type: application/json.', 415);
  const bytes = await readBody(request, limit);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new MoriError('Request body must contain valid JSON.');
  }
}

export async function readFormData(request: Request) {
  const bytes = await readBody(request, 100 * 1024 * 1024);
  try {
    return await new Response(Uint8Array.from(bytes).buffer, {
      headers: { 'content-type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new MoriError('Could not read this upload. Send multipart/form-data.');
  }
}
