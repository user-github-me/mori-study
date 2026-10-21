import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';

const basePath = process.env.MORI_SITE_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Mori Study — your personal study space',
  description:
    'Give your AI agent a source and a learning goal. It creates lessons, visual slides, quizzes, practice, and more; Mori Study validates and serves your personal study pack.',
  icons: { icon: `${basePath}/favicon.svg` },
  openGraph: {
    title: 'Mori Study — a little clarity, every day',
    description: 'An open-source study portal, brought to life by your AI agent.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-repository={
        process.env.MORI_REPOSITORY || 'https://github.com/user-github-me/mori-study'
      }
      data-npm-published={String(process.env.MORI_NPM_PUBLISHED === '1')}
      data-release-published={String(process.env.MORI_RELEASE_PUBLISHED === '1')}
      data-release-version={process.env.MORI_RELEASE_VERSION || '0.1.0'}
    >
      <head>
        <meta name="theme-color" content="#f8f9f3" />
        <link rel="stylesheet" href={`${basePath}/styles.css`} />
        <link
          rel="preload"
          href={`${basePath}/assets/dm-sans.ttf`}
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        {children}
        <Script src={`${basePath}/site.js`} strategy="afterInteractive" />
      </body>
    </html>
  );
}
