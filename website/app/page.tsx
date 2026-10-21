import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-static';

/** The authored, repository-owned HTML is rendered at build time, never from user input. */
export default async function Home() {
  const directory = process.env.MORI_SITE_SOURCE || path.resolve('website');
  const html = await readFile(path.join(directory, 'index.html'), 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1];
  if (!body) throw new Error('The website template must have a body.');
  const repository = process.env.MORI_REPOSITORY || 'https://github.com/user-github-me/mori-study';
  const basePath = process.env.MORI_SITE_BASE_PATH || '';
  const content = body
    .replaceAll('__MORI_REPOSITORY__', repository)
    .replaceAll('href="./', `href="${basePath}/`)
    .replaceAll('src="./', `src="${basePath}/`);
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
}
