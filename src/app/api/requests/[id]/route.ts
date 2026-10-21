import { agentPrompt, getStudyRequest, MoriError } from '@/lib/storage';
import { apiError } from '../../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const request = await getStudyRequest((await context.params).id);
    if (!request) throw new MoriError('Request not found.', 404);
    return Response.json(
      { request, agentPrompt: agentPrompt(request) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
