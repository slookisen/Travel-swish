import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BUILD_META } from './buildMeta';

// --- Basepath sanity check (debug aid for GitHub Pages blank-screen issues) ---
const expectedBase = (import.meta as any).env?.BASE_URL ?? '/';
const loc = window.location.pathname;
if (!loc.startsWith(expectedBase.replace(/\/$/, ''))) {
  console.warn(
    `[Travel Swipe] basepath mismatch: expected "${expectedBase}", got "${loc}". ` +
    `This may cause blank screens on GitHub Pages.`
  );
}
console.info(`[Travel Swipe] ${BUILD_META.version} loaded at ${loc} (base=${expectedBase})`);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${expectedBase}sw.js`, { scope: expectedBase }).catch((error) => {
      console.warn('[Travel Swipe] service worker registration failed', error);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
