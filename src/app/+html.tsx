import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Firebase Hosting is the canonical origin; GitHub Pages mirrors it.
// Keep in sync with scripts/canonical.mjs, which writes the per-route URL
// into every exported page.
const CANONICAL_ORIGIN = 'https://ranemmu-lilrab.web.app';

// Web-only root HTML for static export. Runs in Node.js at build time,
// not in the browser. Keep PWA tags here (single source of truth);
// scripts/pwa-head.mjs only backfills pages missing them.
export default function Root({ children }: PropsWithChildren) {
  const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');

  // The static export can only learn the route after parsing the file path
  // (scripts/canonical.mjs does that). This corrects the two cases it cannot:
  // the Pages SPA fallback (404.html boots as the shell) and direct *.html
  // visits. Runs before hydration and only touches the canonical href.
  const canonicalFix = `(function(){var o=${JSON.stringify(CANONICAL_ORIGIN)};var b=${JSON.stringify(base)};var p=window.location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);if(p.slice(-11)==='/index.html')p=p.slice(0,-10);else if(p.slice(-5)==='.html')p=p.slice(0,-5);if(!p||p.charAt(0)!=='/')p='/'+p;var l=document.querySelector('link[rel="canonical"]');if(l)l.setAttribute('href',o+p);})();`;

  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* App Title */}
        <title>رنموا للرب</title>

        {/* Canonical URL: Firebase is the original, GitHub Pages is the mirror */}
        <link rel="canonical" href={`${CANONICAL_ORIGIN}/`} />
        <script dangerouslySetInnerHTML={{ __html: canonicalFix }} />

        {/* PWA */}
        <link rel="manifest" href={`${base}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${base}/icons/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" sizes="192x192" href={`${base}/icons/icon-192.png`} />
        <link rel="icon" type="image/png" sizes="512x512" href={`${base}/icons/icon-512.png`} />
        <meta name="theme-color" content="#184D55" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="رنموا للرب" />

        {/* Umami analytics - shared website ID, filter by Path in dashboard */}
        <script defer src="https://cloud.umami.is/script.js" data-website-id="4bf9e517-428f-466b-a83e-5873974e1e8f" />

        {/* Service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${base}/sw.js',{scope:'${base ? base + '/' : '/'}'});});}`,
          }}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
