import { Share } from '@capacitor/share';
import type { AppLanguage } from './i18n';
import type { ResultItem } from './types';

export const PUBLIC_APP_URL = 'https://slookisen.github.io/Travel-swish/';
export type ShareOutcome = { status: 'shared' | 'copied' | 'cancelled' | 'manual'; text: string };

function campaignUrl(kind: 'result' | 'list') {
  const url = new URL(PUBLIC_APP_URL);
  url.searchParams.set('utm_source', 'user_share');
  url.searchParams.set('utm_medium', 'social');
  url.searchParams.set('utm_campaign', kind === 'result' ? 'shared_result' : 'shared_shortlist');
  return url.toString();
}

export function resultSharePayload(item: ResultItem, destination: string, language: AppLanguage) {
  const appUrl = campaignUrl('result');
  const place = item.url ? `\n${language === 'en' ? 'Place' : 'Sted'}: ${item.url}` : '';
  const text = language === 'en'
    ? `✨ ${item.name} is one of my Travel Swipe matches in ${destination}.\n${item.why}${place}\n\nSwipe your way to personal travel, experience and food ideas:`
    : `✨ ${item.name} er et av mine Travel Swipe-treff i ${destination}.\n${item.why}${place}\n\nSveip deg frem til personlige tips om reiser, opplevelser og mat:`;
  return { title: `Travel Swipe · ${destination}`, text, url: appUrl };
}

export function listSharePayload(items: ResultItem[], destination: string, language: AppLanguage) {
  const appUrl = campaignUrl('list');
  const list = items.slice(0, 6).map((item, index) => `${index + 1}. ${item.name}`).join('\n');
  const text = language === 'en'
    ? `🗺️ My personal Travel Swipe picks in ${destination}:\n\n${list}\n\nFind trips, experiences and food that feel like you:`
    : `🗺️ Mine personlige Travel Swipe-treff i ${destination}:\n\n${list}\n\nFinn reiser, opplevelser og mat som føles som deg:`;
  return { title: `Travel Swipe · ${destination}`, text, url: appUrl };
}

function wasCancelled(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return name === 'AbortError' || message.includes('cancel') || message.includes('dismiss');
}

export async function shareTravelSwish(payload: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  const manualText = `${payload.text}\n${payload.url}`;
  try {
    const support = await Share.canShare();
    if (support.value) {
      await Share.share({ ...payload, dialogTitle: payload.title });
      return { status: 'shared', text: manualText };
    }
  } catch (error) {
    if (wasCancelled(error)) return { status: 'cancelled', text: manualText };
  }

  try {
    await navigator.clipboard.writeText(manualText);
    return { status: 'copied', text: manualText };
  } catch {
    return { status: 'manual', text: manualText };
  }
}
