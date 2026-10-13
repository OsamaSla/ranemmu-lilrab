import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Web-only root HTML for static export. Runs in Node.js at build time,
// not in the browser. Keep PWA tags here (single source of truth);
// scripts/pwa-head.mjs only backfills pages missing them.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* App Title */}
        <title>رنموا للرب</title>

        {/* PWA */}
        <link rel="manifest" href="/ranemmu-lilrab/manifest.json" />
        <link rel="apple-touch-icon" href="/ranemmu-lilrab/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/ranemmu-lilrab/icons/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/ranemmu-lilrab/icons/icon-512.png" />
        <meta name="theme-color" content="#184D55" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="رنموا للرب" />

        {/* Umami analytics - shared website ID, filter by Path in dashboard */}
        <script defer src="https://cloud.umami.is/script.js" data-website-id="4bf9e517-428f-466b-a83e-5873974e1e8f" />

        {/* Service worker */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}

const sw = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/ranemmu-lilrab/sw.js',{scope:'/ranemmu-lilrab/'});});}`;
