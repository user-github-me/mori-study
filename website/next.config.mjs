const basePath = process.env.MORI_SITE_BASE_PATH || '';
if (basePath && !/^\/[A-Za-z0-9_/-]+$/.test(basePath))
  throw new Error('MORI_SITE_BASE_PATH must be a leading-slash URL path without a trailing slash.');
if (basePath.endsWith('/')) throw new Error('MORI_SITE_BASE_PATH must not end in a slash.');

export default {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  devIndicators: false,
};
