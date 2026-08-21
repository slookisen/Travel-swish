import { z } from 'zod';
import { createEmptyStoredProfile, type TripContext } from '../profile/engine';
import type { ClientIdentity, LocalAppState } from './types';

const APP_STATE_KEY = 'travel_swish_app_v3';
const LEGACY_PROFILE_KEY = 'travel_swish_profile_v2';
const LEGACY_TRIP_KEY = 'travel_swish_trip_v2';
const USER_ID_KEY = 'ts_user_id_v3';
const SESSION_ID_KEY = 'ts_session_id_v3';

export const DEFAULT_CONTEXT: TripContext = {
  party: 'couple',
  pace: 'balanced',
  budget: 'balanced',
  discovery: 'mix',
};

const reactionSchema = z.object({
  cardId: z.string().min(1),
  reaction: z.enum(['love', 'like', 'skip', 'dislike']),
  answeredAt: z.number().finite(),
});

const storedProfileSchema = z.object({
  version: z.literal(2),
  reactions: z.object({
    experiences: z.record(reactionSchema),
    restaurants: z.record(reactionSchema),
  }),
  corrections: z.record(z.number().min(-1).max(1)),
});

const contextSchema = z.object({
  party: z.enum(['solo', 'couple', 'friends', 'family']),
  pace: z.enum(['slow', 'balanced', 'full']),
  budget: z.enum(['value', 'balanced', 'premium']),
  discovery: z.enum(['icons', 'mix', 'hidden']),
});

const resultSchema = z.object({
  id: z.string(),
  name: z.string(),
  match: z.number(),
  why: z.string(),
  cat: z.string(),
  url: z.string().optional(),
  sourceUrl: z.string().optional(),
  source: z.enum(['google_places', 'brave', 'starter', 'unknown']),
  rating: z.number().optional(),
  rating_count: z.number().optional(),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  destination: z.string(),
  mode: z.enum(['experiences', 'restaurants']),
  savedAt: z.number(),
});

const appStateSchema = z.object({
  version: z.literal(3),
  profile: storedProfileSchema,
  trip: z.object({
    destination: z.string(),
    mode: z.enum(['experiences', 'restaurants']),
    context: contextSchema,
  }),
  saved: z.record(resultSchema),
  feedback: z.record(z.enum(['useful', 'not_relevant', 'visited', 'wrong_info'])),
  recentRuns: z.array(z.object({
    id: z.string(),
    destination: z.string(),
    mode: z.enum(['experiences', 'restaurants']),
    provider: z.string(),
    createdAt: z.number(),
    itemIds: z.array(z.string()),
  })).max(20),
});

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function defaultState(): LocalAppState {
  return {
    version: 3,
    profile: createEmptyStoredProfile(),
    trip: { destination: '', mode: 'experiences', context: DEFAULT_CONTEXT },
    saved: {},
    feedback: {},
    recentRuns: [],
  };
}

export function loadAppState(): LocalAppState {
  if (typeof window === 'undefined') return defaultState();

  const current = appStateSchema.safeParse(safeParse(localStorage.getItem(APP_STATE_KEY)));
  if (current.success) {
    const normalizedSaved = Object.fromEntries(Object.values(current.data.saved).map((item) => [
      `${item.mode}:${item.destination.trim().toLowerCase()}:${item.id}`,
      item,
    ]));
    return { ...current.data, saved: normalizedSaved };
  }

  // One-time, non-destructive migration from the V2 draft keys.
  const next = defaultState();
  const legacyProfile = storedProfileSchema.safeParse(safeParse(localStorage.getItem(LEGACY_PROFILE_KEY)));
  if (legacyProfile.success) next.profile = legacyProfile.data;

  const legacyTrip = z.object({
    destination: z.string().optional(),
    mode: z.enum(['experiences', 'restaurants']).optional(),
    context: contextSchema.partial().optional(),
  }).safeParse(safeParse(localStorage.getItem(LEGACY_TRIP_KEY)));
  if (legacyTrip.success) {
    next.trip = {
      destination: legacyTrip.data.destination ?? '',
      mode: legacyTrip.data.mode ?? 'experiences',
      context: { ...DEFAULT_CONTEXT, ...legacyTrip.data.context },
    };
  }

  saveAppState(next);
  return next;
}

export function saveAppState(state: LocalAppState): void {
  if (typeof window === 'undefined') return;
  const parsed = appStateSchema.safeParse(state);
  if (!parsed.success) {
    console.warn('Travel Swish: refused to persist invalid local state', parsed.error.issues);
    return;
  }
  try {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(parsed.data));
  } catch (error) {
    console.warn('Travel Swish: local state could not be saved', error);
  }
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getClientIdentity(): ClientIdentity {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = localStorage.getItem('ts_user_id_v2') || makeId('user');
    localStorage.setItem(USER_ID_KEY, userId);
  }
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = makeId('session');
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return { userId, sessionId };
}
