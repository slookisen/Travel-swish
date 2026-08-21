import type { Mode } from '../dataset';
import type { StoredProfile, TripContext } from '../profile/engine';

export type Screen = 'landing' | 'brief' | 'swipe' | 'profile' | 'results' | 'saved';

export type ResultSource = 'google_places' | 'brave' | 'starter' | 'unknown';
export type ResultFeedback = 'useful' | 'not_relevant' | 'visited' | 'wrong_info';

export type ResultItem = {
  id: string;
  name: string;
  match: number;
  why: string;
  cat: string;
  url?: string;
  sourceUrl?: string;
  source: ResultSource;
  rating?: number;
  rating_count?: number;
  address?: string;
  lat?: number;
  lng?: number;
};

export type SavedResult = ResultItem & {
  destination: string;
  mode: Mode;
  savedAt: number;
};

export type RecommendationRun = {
  id: string;
  destination: string;
  mode: Mode;
  provider: string;
  createdAt: number;
  itemIds: string[];
};

export type TripDraft = {
  destination: string;
  mode: Mode;
  context: TripContext;
};

export type LocalAppState = {
  version: 3;
  profile: StoredProfile;
  trip: TripDraft;
  saved: Record<string, SavedResult>;
  feedback: Record<string, ResultFeedback>;
  recentRuns: RecommendationRun[];
};

export type ClientIdentity = {
  userId: string;
  sessionId: string;
};
