import { createCourseDeck } from '@/lib/deck';
import { getCourse, MoriError } from '@/lib/storage';
import { apiError } from '../../../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const format = new URL(request.url).searchParams.get('format') || 'pptx';
    if (format !== 'pptx')
      throw new MoriError(
        'This endpoint exports pptx. Use the JSON or Markdown download for other formats.',
        400,
      );
    const course = await getCourse((await context.params).id);
    if (!course) throw new MoriError('Course not found.', 404);
    const deck = await createCourseDeck(course, { baseUrl: new URL(request.url).origin });
    return new Response(Uint8Array.from(deck).buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${course.id}.pptx"`,
        'Content-Length': String(deck.byteLength),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
