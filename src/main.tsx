import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { BUILD_META } from './buildMeta';
import { LanguageProvider } from './app/i18n';
import './styles.css';

// --- Basepath sanity check (debug aid for GitHub Pages blank-screen issues) ---
const expectedBase = (import.meta as any).env?.BASE_URL ?? '/';
const loc = window.location.pathname;
if (!loc.startsWith(expectedBase.replace(/\/$/, ''))) {
  console.warn(
    `[Travel-Swish] basepath mismatch: expected "${expectedBase}", got "${loc}". ` +
    `This may cause blank screens on GitHub Pages.`
  );
}
console.info(`[Travel-Swish] ${BUILD_META.version} loaded at ${loc} (base=${expectedBase})`);

if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform() && /^https?:$/.test(window.location.protocol)) {
  window.addEventListener('load', () => {
    const serviceWorkerUrl = new URL('sw.js', new URL(expectedBase, window.location.href)).toString();
    void navigator.serviceWorker.register(serviceWorkerUrl, { scope: expectedBase }).catch((error) => {
      console.warn('[Travel-Swish] service worker registration failed', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider><App /></LanguageProvider>
  </React.StrictMode>
);
