import en from './i18n/en.json';
import no from './i18n/no.json';
import sv from './i18n/sv.json';
import type { Lang } from './types';

const dict: Record<Lang, Record<string, string>> = {
  en: en as any,
  no: no as any,
  sv: sv as any,
};

export function t(lang: Lang, key: string): string {
  return dict[lang]?.[key] ?? dict.en?.[key] ?? key;
}

export function hasKey(lang: Lang, key: string) {
  return Boolean(dict[lang]?.[key]);
}

export function missingKeysFor(langs: Lang[], keys: string[]) {
  const out: Record<string, Lang[]> = {};
  for (const k of keys) {
    const missing: Lang[] = [];
    for (const l of langs) {
      if (!hasKey(l, k)) missing.push(l);
    }
    if (missing.length) out[k] = missing;
  }
  return out;
}
