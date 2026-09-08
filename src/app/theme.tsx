import { useSyncExternalStore } from 'react';
import { useLanguage } from './i18n';

type ThemePreference = 'system' | 'light' | 'dark';
declare global {
  interface Window {
    travelSwipeTheme: { getPreference(): ThemePreference; setPreference(value: ThemePreference): void };
  }
}
const subscribe = (listener: () => void) => {
  window.addEventListener('travel-swipe-theme', listener);
  return () => window.removeEventListener('travel-swipe-theme', listener);
};
const getPreference = () => window.travelSwipeTheme?.getPreference() || 'system';

export function ThemeSwitch() {
  const { copy } = useLanguage();
  const preference = useSyncExternalStore(subscribe, getPreference);
  return <label className="theme-switch" title={`${copy.theme.label}: ${copy.theme[preference]}`}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {preference === 'dark' ? <path d="M20.5 14.1A8.8 8.8 0 0 1 9.9 3.5 8.8 8.8 0 1 0 20.5 14.1Z" />
        : preference === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
          : <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>}
    </svg>
    <span aria-hidden="true">{copy.theme[preference]}</span>
    <select aria-label={copy.theme.label} value={preference} onChange={(event) => window.travelSwipeTheme.setPreference(event.target.value as ThemePreference)}>
      <option value="system">{copy.theme.system}</option>
      <option value="light">{copy.theme.light}</option>
      <option value="dark">{copy.theme.dark}</option>
    </select>
  </label>;
}
