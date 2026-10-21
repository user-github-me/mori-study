import { createStudyRequest, getWorkspace } from '@/lib/storage';
import { apiError, assertLocalWrite, readJson } from '../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(
      { requests: (await getWorkspace()).requests },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalWrite(request);
    return Response.json(await createStudyRequest(await readJson(request, 100_000)), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
