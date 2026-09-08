import { z } from 'zod';
import type { Mode } from '../dataset';
import type { PreferenceProfile, TripContext } from '../profile/engine';
import { profileToBackend } from '../profile/engine';
import type { ClientIdentity, DiscoveryTripContext, ResultFeedback, ResultItem, SearchKind } from './types';
import type { AppLanguage } from './i18n';

const DEFAULT_BACKEND_URL = 'https://travel-swish-backend.onrender.com';
export const BACKEND_URL = String(import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');

const resultSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().min(1),
  match: z.coerce.number().default(50),
  why: z.string().default(''),
  cat: z.string().default(''),
  url: z.string().optional().default(''),
  source: z.string().optional().default('unknown'),
  rating: z.coerce.number().optional(),
  rating_count: z.coerce.number().optional(),
  snippet: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  website_url: z.string().optional(),
  maps_url: z.string().optional(),
});

const recsSchema = z.object({
  items: z.array(resultSchema),
  run_id: z.string().optional(),
  provider: z.string().optional(),
  model_version: z.string().optional(),
  served_from_prefetch: z.boolean().optional(),
  next_token: z.string().nullable().optional(),
  next_status: z.string().optional(),
  next_seed: z.number().nullable().optional(),
});

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly retryAfterSeconds = 0, readonly code = '') {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson(path: string, options: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      const retryHeader = response.headers.get('Retry-After') || '';
      const seconds = /^\d+(\.\d+)?$/.test(retryHeader) ? Number(retryHeader) : (Date.parse(retryHeader) - Date.now()) / 1000;
      const retryAfter = response.status === 429 ? Math.max(1, Math.ceil(Number.isFinite(seconds) ? seconds : 30)) : 0;
      const body = await response.json().catch(() => ({}));
      throw new ApiError(`HTTP ${response.status}`, response.status, retryAfter, typeof body.detail === 'string' ? body.detail : '');
    }
    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request aborted', undefined, 0, signal?.aborted ? 'cancelled' : 'timeout');
    }
    // Browsers intentionally do not distinguish CORS from other network errors.
    if (error instanceof TypeError) throw new ApiError('Network unavailable', undefined, 0, navigator.onLine === false ? 'offline' : 'network');
    throw error;
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

function jsonPost(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function safeExternalUrl(value: string | undefined): string | undefined {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchRecommendations(input: {
  identity: ClientIdentity;
  mode: Mode;
  destination: string;
  context: TripContext;
  profile: PreferenceProfile;
  language: AppLanguage;
  searchKind?: SearchKind;
  queryText?: string;
  tripContext?: DiscoveryTripContext;
  excludeIds?: string[];
  prefetchToken?: string;
  seed?: number;
  signal?: AbortSignal;
}): Promise<{
  items: ResultItem[];
  runId: string;
  provider: string;
  servedFromPrefetch: boolean;
  nextToken: string;
  nextStatus: string;
  nextSeed: number | null;
}> {
  const { identity, mode, destination, context, profile, language } = input;
  const backendProfile = profileToBackend(profile, context);
  // One atomic request: never search using stale server preferences because a
  // preceding /prefs write failed. The versioned route also fails safely against
  // an old backend instead of silently ignoring the supplied current profile.
  const raw = await requestJson('/recs/personalized', jsonPost({
    user_id: identity.userId,
    session_id: identity.sessionId,
    mode,
    destination,
    limit: 9,
    max_queries: 6,
    current_prefs: backendProfile.prefs,
    client_version: '0.7.0',
    seed: input.seed ?? (Date.now() % 100000),
    language,
    search_lang: language,
    taste: backendProfile.taste,
    search_kind: input.searchKind || mode,
    query_text: String(input.queryText || '').trim().slice(0, 160),
    trip_context: input.tripContext || {},
    exclude_ids: (input.excludeIds || []).filter(Boolean).slice(-200),
    prefetch_token: input.prefetchToken || undefined,
  }), 40000, input.signal);
  const parsed = recsSchema.parse(raw);
  const provider = parsed.provider || parsed.items[0]?.source || 'live';
  return {
    runId: parsed.run_id || `live-${Date.now()}`,
    provider,
    servedFromPrefetch: Boolean(parsed.served_from_prefetch),
    nextToken: parsed.next_token || '',
    nextStatus: parsed.next_status || 'unavailable',
    nextSeed: typeof parsed.next_seed === 'number' ? parsed.next_seed : null,
    items: parsed.items.map((item) => ({
      id: item.id,
      name: item.name,
      match: Math.max(0, Math.min(100, item.match)),
      why: item.why || (language === 'en'
        ? 'Selected from your taste profile and trip brief.'
        : 'Valgt ut fra smaksprofilen og turbriefen din.'),
      cat: item.cat,
      url: safeExternalUrl(item.maps_url || item.url),
      sourceUrl: safeExternalUrl(item.website_url) !== safeExternalUrl(item.maps_url || item.url)
        ? safeExternalUrl(item.website_url)
        : undefined,
      source: item.source === 'google_places' || item.source === 'brave' ? item.source : 'unknown',
      rating: item.rating,
      rating_count: item.rating_count,
      address: item.snippet,
      lat: item.lat,
      lng: item.lng,
    })),
  };
}

export async function getRecommendationPrefetchStatus(token: string): Promise<string> {
  const raw = await requestJson(`/recs/prefetch/${encodeURIComponent(token)}`, { method: 'GET' }, 6000);
  return z.object({ status: z.string() }).parse(raw).status;
}

export async function deleteUserData(userId: string): Promise<void> {
  await requestJson(`/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }, 12000).then(() => undefined);
}

export async function postResultFeedback(input: {
  identity: ClientIdentity;
  runId: string;
  item: ResultItem;
  feedback: ResultFeedback;
  mode: Mode;
  destination: string;
}): Promise<void> {
  await requestJson('/feedback', jsonPost({
    user_id: input.identity.userId,
    session_id: input.identity.sessionId,
    run_id: input.runId,
    item_id: input.item.id,
    item_name: input.item.name,
    feedback: input.feedback,
    mode: input.mode,
    destination: input.destination,
    payload: { source: input.item.source, cat: input.item.cat, match: input.item.match },
    ts: Math.floor(Date.now() / 1000),
  }), 9000).then(() => undefined);
}
