import { getWorkspace, importCourse } from '@/lib/storage';
import { apiError, assertLocalWrite, readJson } from '../_utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(
      { courses: (await getWorkspace()).courses },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertLocalWrite(request);
    return Response.json({ course: await importCourse(await readJson(request)) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
