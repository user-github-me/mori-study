import { getWorkspace, workspaceId } from '@/lib/storage';
import { apiError } from '../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await getWorkspace(), {
      headers: { 'Cache-Control': 'no-store', 'X-Mori-Workspace': workspaceId() },
    });
  } catch (error) {
    return apiError(error);
  }
}
