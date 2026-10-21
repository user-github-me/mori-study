import type { NextConfig } from 'next';
const config: NextConfig = {
  devIndicators: false,
  distDir: process.env.MORI_NEXT_DIR || '.next',
  serverExternalPackages: ['pdfjs-dist', 'mathjax-full', 'pptxgenjs', 'sharp'],
  poweredByHeader: false,
};
export default config;
