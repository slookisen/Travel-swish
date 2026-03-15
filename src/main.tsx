import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BUILD_META } from './buildMeta';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
