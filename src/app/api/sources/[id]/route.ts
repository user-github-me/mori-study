import { getSourceAsset } from '@/lib/storage';
import { apiError } from '../../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { source, body, mime } = await getSourceAsset((await context.params).id);
    const filename = encodeURIComponent(source.name).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    const inline =
      source.type === 'pdf' ||
      source.type === 'image' ||
      source.type === 'text' ||
      source.type === 'link';
    return new Response(typeof body === 'string' ? body : Uint8Array.from(body).buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${filename}`,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
