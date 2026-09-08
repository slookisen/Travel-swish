import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getDeckCards, type DimId, type Mode } from './dataset';
import { computeProfile, selectNextCard, type Reaction, type TripContext } from './profile/engine';
import { getDimLabels } from './profile/labels';
import { ApiError, deleteUserData, fetchRecommendations, getRecommendationPrefetchStatus, postResultFeedback } from './app/api';
import { QuickHome } from './ui/QuickHome';
import { buildStarterResults } from './app/starterCatalog';
import { clearClientData, getClientIdentity, loadAppState, saveAppState } from './app/storage';
import type { DiscoveryTripContext, LocalAppState, ResultFeedback, ResultItem, SavedResult, Screen, SearchKind } from './app/types';
import { useLanguage } from './app/i18n';
import { ThemeSwitch } from './app/theme';
import { usePwaInstall } from './app/pwa';
import { listSharePayload, resultSharePayload, shareTravelSwish } from './app/share';
import {
  AppHeader, Brand, ContextChoice, formatContext, getTopAxes,
  getTopCategories, LanguageSwitch, LiveProfile, ProfileEditor, ReactionControls, ResultCard, SwipeCard,
} from './ui/components';

type ActiveSearch = {
  kind: SearchKind;
  queryText: string;
  tripContext: DiscoveryTripContext;
};

const regularSearch = (mode: Mode): ActiveSearch => ({ kind: mode, queryText: '', tripContext: {} });

function LegalFooter({ privacy, support, dark = false }: { privacy: string; support: string; dark?: boolean }) {
  const base = import.meta.env.BASE_URL;
  return <footer className={`legal-footer ${dark ? 'legal-footer--dark' : ''}`}><span>© {new Date().getFullYear()} Travel Swipe</span><nav aria-label={`${privacy} / ${support}`}><a href={`${base}privacy.html`}>{privacy}</a><a href={`${base}support.html`}>{support}</a></nav></footer>;
}

function sameSearch(left: ActiveSearch, right: ActiveSearch): boolean {
  return left.kind === right.kind
    && left.queryText === right.queryText
    && JSON.stringify(left.tripContext) === JSON.stringify(right.tripContext);
}

export default function App() {
  const { language, copy } = useLanguage();
  const initial = useMemo(loadAppState, []);
  const identity = useMemo(getClientIdentity, []);
  const hasHistory = Object.values(initial.profile.reactions).some((answers) => Object.keys(answers).length > 0);
  const [screen, setScreen] = useState<Screen>(hasHistory ? 'home' : 'landing');
  const [destination, setDestination] = useState(initial.trip.destination);
  const [mode, setMode] = useState<Mode>(initial.trip.mode);
  const [context, setContext] = useState<TripContext>(initial.trip.context);
  const [storedProfile, setStoredProfile] = useState(initial.profile);
  const [saved, setSaved] = useState(initial.saved);
  const [feedback, setFeedback] = useState(initial.feedback);
  const [recentRuns, setRecentRuns] = useState(initial.recentRuns);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [activeRunId, setActiveRunId] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultNotice, setResultNotice] = useState('');
  const [toast, setToast] = useState('');
  const [manualShareText, setManualShareText] = useState('');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [manualCopied, setManualCopied] = useState(false);
  const [showResultsPrompt, setShowResultsPrompt] = useState(false);
  const [dismissedPromptAt, setDismissedPromptAt] = useState(0);
  const [undoStack, setUndoStack] = useState<Array<{ mode: Mode; cardId: string }>>([]);
  const [preferredCardId, setPreferredCardId] = useState('');
  const [gestureBusy, setGestureBusy] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [searchError, setSearchError] = useState<ApiError | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const requestSequence = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const answeredCard = useRef('');
  const lastSearch = useRef<ActiveSearch>(regularSearch(initial.trip.mode));
  const [activeSearch, setActiveSearch] = useState<ActiveSearch>(() => regularSearch(initial.trip.mode));
  const [nextPrefetchToken, setNextPrefetchToken] = useState('');
  const [nextPrefetchStatus, setNextPrefetchStatus] = useState('unavailable');
  const [nextPrefetchSeed, setNextPrefetchSeed] = useState<number | null>(null);
  const [discoveryKind, setDiscoveryKind] = useState<Exclude<SearchKind, Mode>>('hotels');
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [tourAgeBand, setTourAgeBand] = useState('');
  const [tourDuration, setTourDuration] = useState('');
  const [deletingData, setDeletingData] = useState(false);
  const pwaInstall = usePwaInstall();

  const cards = useMemo(() => getDeckCards(mode, language), [mode, language]);
  const reactions = storedProfile.reactions[mode];
  const profile = useMemo(() => computeProfile(reactions, cards, storedProfile.corrections, {
    outcomes: Object.values(storedProfile.outcomes ?? {}).filter((outcome) => outcome.mode === mode),
  }), [reactions, cards, storedProfile.corrections, storedProfile.outcomes, mode]);
  const currentCard = useMemo(() => cards.find((card) => card.id === preferredCardId && !reactions[card.id]) ?? selectNextCard(cards, reactions, profile), [cards, reactions, profile, preferredCardId]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - clockNow) / 1000));
  const searchDisabled = loading || cooldown > 0;
  const enterSwipe = () => setScreen(destination.trim() ? 'swipe' : 'brief');
  const modalActive = Boolean(searchError || showResultsPrompt || showInstallHelp || manualShareText || loading);

  useEffect(() => {
    if (!modalActive) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.app-modal');
    if (!dialog) return;
    dialog.tabIndex = -1;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], textarea, input:not(:disabled)')).filter((node) => node.getClientRects().length);
    (focusable()[0] ?? dialog).focus();
    function trap(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (loading) cancelSearch();
        setSearchError(null); setShowInstallHelp(false); setManualShareText('');
        if (showResultsPrompt) { setShowResultsPrompt(false); setDismissedPromptAt(Math.max(1, profile.informativeCount)); }
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      if (!nodes.length) { event.preventDefault(); dialog?.focus(); return; }
      const index = nodes.indexOf(document.activeElement as HTMLElement);
      if (index === -1 || (!event.shiftKey && index === nodes.length - 1) || (event.shiftKey && index === 0)) {
        event.preventDefault(); nodes[event.shiftKey ? nodes.length - 1 : 0].focus();
      }
    }
    document.addEventListener('keydown', trap, true);
    return () => { document.removeEventListener('keydown', trap, true); if (previous?.isConnected) previous.focus(); };
  }, [modalActive, loading, showResultsPrompt, Boolean(searchError), Boolean(manualShareText), showInstallHelp]);

  useEffect(() => { answeredCard.current = ''; setGestureBusy(false); }, [currentCard?.id, mode]);

  useEffect(() => {
    requestSequence.current += 1;
    activeRequest.current?.abort();
    setLoading(false);
    setNextPrefetchToken('');
    setNextPrefetchStatus('unavailable');
    setNextPrefetchSeed(null);
    setSearchError(null);
  }, [mode, destination, context, language, storedProfile]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    setClockNow(Date.now());
    const timer = window.setInterval(() => {
      const now = Date.now();
      setClockNow(now);
      if (now >= cooldownUntil) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useLayoutEffect(() => {
    const state: LocalAppState = {
      version: 3,
      profile: storedProfile,
      trip: { destination, mode, context },
      saved,
      feedback,
      recentRuns,
    };
    // Persist before the confirmation is painted, including an immediate reload
    // after a swipe or feedback tap. This is a small, local-only state snapshot.
    saveAppState(state);
  }, [storedProfile, destination, mode, context, saved, feedback, recentRuns]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.classList.toggle('is-swipe-screen', screen === 'swipe' && !readingMode);
    return () => document.body.classList.remove('is-swipe-screen');
  }, [screen, readingMode]);

  useEffect(() => {
    if (screen !== 'swipe' || loading || !profile.ready || profile.informativeCount < 6 || showResultsPrompt) return;
    if (dismissedPromptAt === 0) {
      setShowResultsPrompt(true);
    }
  }, [dismissedPromptAt, loading, profile.informativeCount, profile.ready, screen, showResultsPrompt]);

  useEffect(() => {
    if (screen !== 'results' || !nextPrefetchToken || !['preparing', 'queued', 'running'].includes(nextPrefetchStatus)) return;
    let cancelled = false;
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > 180_000) { setNextPrefetchStatus('expired'); return; }
      if (document.hidden) return;
      void getRecommendationPrefetchStatus(nextPrefetchToken)
        .then((status) => {
          if (!cancelled) setNextPrefetchStatus(status);
        })
        .catch(() => { if (!cancelled) setNextPrefetchStatus('unavailable'); });
    }, 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [nextPrefetchStatus, nextPrefetchToken, screen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (screen !== 'swipe' || !currentCard || loading || gestureBusy || showResultsPrompt || event.repeat
        || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, [contenteditable="true"]'))) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowLeft') recordReaction('dislike');
      if (event.key === 'ArrowRight') recordReaction('like');
      if (event.key === 'ArrowDown') recordReaction('skip');
      if (event.key === 'ArrowUp') recordReaction('like');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function recordReaction(reaction: Reaction) {
    if (!currentCard || answeredCard.current === `${mode}:${currentCard.id}` || loading || showResultsPrompt) return;
    answeredCard.current = `${mode}:${currentCard.id}`;
    setUndoStack((current) => [...current, { mode, cardId: currentCard.id }].slice(-20));
    setPreferredCardId('');
    setStoredProfile((current) => ({
      ...current,
      reactions: {
        ...current.reactions,
        [mode]: {
          ...current.reactions[mode],
          [currentCard.id]: { cardId: currentCard.id, reaction, answeredAt: Date.now() },
        },
      },
    }));
  }

  function undoReaction() {
    const last = undoStack[undoStack.length - 1];
    if (!last || last.mode !== mode || gestureBusy || loading) return;
    setStoredProfile((current) => {
      const answers = { ...current.reactions[mode] };
      delete answers[last.cardId];
      return { ...current, reactions: { ...current.reactions, [mode]: answers } };
    });
    setUndoStack((current) => current.slice(0, -1));
    setPreferredCardId(last.cardId);
    setToast(copy.flow.undone);
  }

  function updateContext<K extends keyof TripContext>(key: K, value: TripContext[K]) {
    setContext((current) => ({ ...current, [key]: value }));
  }

  async function resetLocalData() {
    if (!window.confirm(copy.profile.confirmDelete)) return;
    setDeletingData(true);
    try {
      await deleteUserData(identity.userId);
      clearClientData();
      window.location.assign(import.meta.env.BASE_URL);
    } catch {
      setDeletingData(false);
      setToast(copy.profile.deleteFailed);
    }
  }

  async function findMatches(request: ActiveSearch = regularSearch(mode)) {
    if (loading || cooldownUntil > Date.now()) return;
    const cleanDestination = destination.trim();
    if (!cleanDestination) { setScreen('brief'); return; }
    const normalizedSearch: ActiveSearch = {
      kind: request.kind,
      queryText: request.queryText.trim().slice(0, 160),
      tripContext: request.tripContext,
    };
    if (normalizedSearch.kind === 'custom' && !normalizedSearch.queryText) return;
    if (!profile.ready) { enterSwipe(); return; }
    const isContinuation = screen === 'results' && sameSearch(normalizedSearch, activeSearch);
    const requestId = ++requestSequence.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    lastSearch.current = normalizedSearch;
    setLoading(true);
    setSearchError(null);
    setDismissedPromptAt(Math.max(1, profile.informativeCount));
    setShowResultsPrompt(false);
    setResultNotice('');
    try {
      const response = await fetchRecommendations({
        signal: controller.signal,
        identity,
        mode,
        destination: cleanDestination,
        context,
        profile,
        language,
        searchKind: normalizedSearch.kind,
        queryText: normalizedSearch.queryText,
        tripContext: normalizedSearch.tripContext,
        excludeIds: [...new Set([
          ...(isContinuation ? recentRuns.filter((run) => run.mode === mode && run.destination.toLowerCase() === cleanDestination.toLowerCase()
            && Date.now() - run.createdAt < 86_400_000).flatMap((run) => run.itemIds) : []),
          ...Object.values(storedProfile.outcomes ?? {}).filter((outcome) => outcome.mode === mode && (
            ['not_for_me', 'wrong_info'].includes(outcome.feedback)
            || (outcome.feedback === 'not_relevant' && outcome.destination.toLowerCase() === cleanDestination.toLowerCase() && Date.now() - outcome.answeredAt < 86_400_000)
          )).map((outcome) => outcome.itemId),
        ])].slice(-200),
        prefetchToken: isContinuation ? nextPrefetchToken : '',
        seed: isContinuation && nextPrefetchSeed !== null ? nextPrefetchSeed : undefined,
      });
      if (requestSequence.current !== requestId) return;
      if (!response.items.length) throw new Error('No live results');
      setResults(response.items);
      setVisibleCount(3);
      setActiveRunId(response.runId);
      setActiveSearch(normalizedSearch);
      setNextPrefetchToken(response.nextToken);
      setNextPrefetchStatus(response.nextStatus);
      setNextPrefetchSeed(response.nextSeed);
      setResultNotice(response.servedFromPrefetch ? copy.results.prefetchedNotice : copy.results.liveNotice);
      setRecentRuns((current) => [{
        id: response.runId, destination: cleanDestination, mode, provider: response.provider,
        createdAt: Date.now(), itemIds: response.items.map((item) => item.id),
      }, ...current.filter((run) => run.id !== response.runId)].slice(0, 20));
      setScreen('results');
    } catch (error) {
      if (requestSequence.current !== requestId) return;
      const apiError = error instanceof ApiError ? error : new ApiError('Search unavailable');
      setSearchError(apiError);
      if (apiError.status === 429) {
        setClockNow(Date.now());
        setCooldownUntil(Date.now() + apiError.retryAfterSeconds * 1000);
      }
      // Keep the previous selection intact; starter ideas are an explicit choice.
    } finally {
      if (requestSequence.current === requestId) { activeRequest.current = null; setLoading(false); }
    }
  }

  function cancelSearch() {
    requestSequence.current += 1;
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
  }

  function showStarterIdeas() {
    const starter = buildStarterResults(destination.trim(), mode, profile, context, language);
    setResults(starter);
    setVisibleCount(3);
    setActiveRunId(`starter-${Date.now()}`);
    setActiveSearch(regularSearch(mode));
    setResultNotice(copy.results.fallbackNotice);
    setSearchError(null);
    setNextPrefetchToken('');
    setNextPrefetchStatus('unavailable');
    setNextPrefetchSeed(null);
    setScreen('results');
  }

  function runDiscoverySearch() {
    const tripContext: DiscoveryTripContext = {
      party: context.party,
      pace: context.pace,
      budget: context.budget,
      discovery: context.discovery,
    };
    if (discoveryKind === 'tours' && tourAgeBand) tripContext.age_band = tourAgeBand;
    if (discoveryKind === 'tours' && tourDuration) tripContext.duration = tourDuration;
    void findMatches({ kind: discoveryKind, queryText: discoveryQuery, tripContext });
  }

  function resultKey(item: ResultItem, itemMode = mode, itemDestination = destination) {
    return `${itemMode}:${itemDestination.trim().toLowerCase()}:${item.id}`;
  }

  function toggleSaved(item: ResultItem, itemMode = mode, itemDestination = destination) {
    const key = resultKey(item, itemMode, itemDestination);
    setSaved((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = { ...item, destination: itemDestination.trim(), mode: itemMode, savedAt: Date.now() };
      return next;
    });
  }

  function recordResultFeedback(item: ResultItem, value: ResultFeedback, itemMode = mode, itemDestination = destination) {
    const key = resultKey(item, itemMode, itemDestination);
    setFeedback((current) => ({ ...current, [key]: value }));
    setStoredProfile((current) => ({ ...current, outcomes: {
      ...current.outcomes,
      [`${itemMode}:${item.id}`]: { itemId: item.id, category: item.cat, mode: itemMode, destination: itemDestination.trim(), feedback: value, answeredAt: Date.now() },
    } }));
    setToast(copy.flow.feedbackSaved);
    const isActiveResult = itemMode === mode
      && itemDestination.trim().toLowerCase() === destination.trim().toLowerCase()
      && results.some((result) => result.id === item.id);
    const runId = (isActiveResult ? activeRunId : '')
      || recentRuns.find((run) => run.mode === itemMode && run.destination.trim().toLowerCase() === itemDestination.trim().toLowerCase() && run.itemIds.includes(item.id))?.id;
    if (!runId || runId.startsWith('starter-')) return;
    void postResultFeedback({ identity, runId, item, feedback: value, mode: itemMode, destination: itemDestination.trim() }).catch(() => setToast(copy.flow.feedbackLocal));
  }

  async function handleInstall() {
    const outcome = await pwaInstall.install();
    if (outcome === 'manual') { setShowInstallHelp(true); return; }
    setToast(outcome === 'accepted' ? copy.pwa.installed : copy.pwa.installDismissed);
  }

  async function handleShare(payload: { title: string; text: string; url: string }) {
    const outcome = await shareTravelSwish(payload);
    if (outcome.status === 'shared') setToast(copy.results.shareShared);
    if (outcome.status === 'copied') setToast(copy.results.shareCopied);
    if (outcome.status === 'manual') { setManualCopied(false); setManualShareText(outcome.text); }
  }

  async function copyManualShare() {
    try {
      await navigator.clipboard.writeText(manualShareText);
      setManualCopied(true);
    } catch {
      const textarea = document.querySelector<HTMLTextAreaElement>('.app-modal textarea');
      textarea?.select();
    }
  }

  const topAxes = getTopAxes(profile, 2);
  const dimLabels = getDimLabels(language);
  const contextSummary = formatContext(context, language);
  const savedItems = Object.values(saved).sort((a, b) => b.savedAt - a.savedAt);
  const overlays = <>
    {toast && <div className="toast" role="status">{toast}</div>}
    {loading && <div className="app-modal search-progress" role="dialog" aria-modal="true" aria-labelledby="search-progress-title"><div className="app-modal__card"><span className="search-spinner" aria-hidden="true" /><h2 id="search-progress-title">{copy.flow.working}</h2><p>{copy.flow.workingHint}</p><button className="quiet-button" onClick={cancelSearch}>{copy.flow.cancel}</button></div></div>}
    {searchError && <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="search-error-title"><div className="app-modal__card">
      <h2 id="search-error-title">{copy.flow.errorTitle}</h2>
      <p>{searchError.status === 429 ? copy.flow.rateLimited : [401, 403].includes(searchError.status || 0) ? copy.flow.authError : searchError.status === 404 ? copy.flow.updateRequired : searchError.code === 'destination_unresolved' ? copy.flow.locationError : searchError.code === 'timeout' ? copy.flow.timeout : searchError.code === 'offline' ? copy.flow.offline : searchError.code === 'network' ? copy.flow.networkError : copy.flow.unavailable}</p>
      {searchError.code === 'network' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && <p>{copy.flow.localSearchHelp}</p>}
      <div className="app-modal__actions"><button className="secondary-button" onClick={() => setSearchError(null)}>{copy.results.close}</button>
        {![401, 403, 404].includes(searchError.status || 0) && <button className="primary-button" disabled={searchDisabled} onClick={() => void findMatches(lastSearch.current)}>{cooldown ? copy.flow.wait(cooldown) : copy.flow.retry}</button>}
      </div>
      {['experiences', 'restaurants'].includes(lastSearch.current.kind) && <button className="text-button starter-choice" onClick={showStarterIdeas}>{copy.flow.starters}</button>}
    </div></div>}
    {showInstallHelp && <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="install-help-title"><div className="app-modal__card"><h2 id="install-help-title">{copy.pwa.iosTitle}</h2><p>{copy.pwa.iosHelp}</p><div className="app-modal__actions"><button className="primary-button" onClick={() => setShowInstallHelp(false)}>{copy.results.close}</button></div></div></div>}
    {manualShareText && <div className="app-modal" role="dialog" aria-modal="true" aria-labelledby="share-manual-title"><div className="app-modal__card"><h2 id="share-manual-title">{copy.results.shareManualTitle}</h2><p>{copy.results.shareManualHelp}</p><textarea readOnly value={manualShareText} aria-label={copy.results.shareManualTitle} /><div className="app-modal__actions"><button className="secondary-button" onClick={() => setManualShareText('')}>{copy.results.close}</button><button className="primary-button" onClick={copyManualShare}>{manualCopied ? copy.results.copied : copy.results.copyShare}</button></div></div></div>}
    {showResultsPrompt && <div className="app-modal app-modal--results" role="dialog" aria-modal="true" aria-labelledby="results-ready-title"><div className="app-modal__card"><p className="panel-kicker">{copy.swipe.promptKicker}</p><h2 id="results-ready-title">{copy.swipe.promptTitle}</h2><p>{copy.swipe.promptLead(destination)}</p><div className="app-modal__actions"><button className="secondary-button" onClick={() => { setDismissedPromptAt(profile.informativeCount); setShowResultsPrompt(false); }}>{copy.swipe.keepSwiping}</button><button className="primary-button" onClick={() => void findMatches()}>{copy.swipe.promptAction} <span>→</span></button></div></div></div>}
  </>;

  if (screen === 'landing') {
    return (
      <><main className="landing" aria-hidden={modalActive || undefined}>
        <div className="landing__glow landing__glow--one" /><div className="landing__glow landing__glow--two" />
        <nav className="landing-nav"><Brand /><div className="landing-nav__actions">{savedItems.length > 0 && <button className="quiet-button quiet-button--light" onClick={() => setScreen('saved')}>{copy.landing.saved} ({savedItems.length})</button>}<button className="quiet-button quiet-button--light" onClick={() => setScreen('profile')}>{copy.landing.profile}</button>{pwaInstall.canInstall && <button className="quiet-button install-button" onClick={handleInstall}>↓ {copy.pwa.install}</button>}<ThemeSwitch /><LanguageSwitch dark /></div></nav>
        <section className="hero">
          <div className="hero__copy">
            <p className="hero__kicker"><span /> {copy.landing.kicker}</p>
            <h1>{copy.landing.title}<br /><em>{copy.landing.titleEm}</em></h1>
            <p className="hero__lead">{copy.landing.lead}</p>
            <div className="hero__actions"><button className="primary-button primary-button--hero" onClick={() => setScreen('brief')}>{copy.landing.start} <span>→</span></button><button className="play-link" onClick={() => setScreen('profile')}><span>◎</span> {copy.landing.explain}</button></div>
            <div className="trust-row"><span>{copy.landing.trust[0]}</span><i /><span>{copy.landing.trust[1]}</span><i /><span>{copy.landing.trust[2]}</span></div>
          </div>
          <div className="hero__visual" aria-label={copy.landing.previewAria}>
            <div className="orbit orbit--one" /><div className="orbit orbit--two" />
            <div className="preview-card preview-card--back"><span>03</span></div>
            <div className="preview-card"><div className="preview-card__top"><span>{copy.landing.previewCategory}</span><span>{copy.landing.previewAdaptive}</span></div><div className="preview-card__emoji">🛶</div><h2>{copy.landing.previewQuestion}</h2><p>{copy.landing.previewDesc}</p><div className="preview-card__swipe"><span>{copy.landing.previewNo}</span><b>{copy.landing.previewSwipe}</b><span>{copy.landing.previewLove}</span></div></div>
            <div className="signal-chip signal-chip--top"><b>↗</b><span>{copy.landing.previewNature}</span></div><div className="signal-chip signal-chip--bottom"><b>✓</b><span>{copy.landing.previewReady}</span></div>
          </div>
        </section>
        <section className="principles">
          {copy.landing.principles.map(([title, description], index) => <div key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></div>)}
        </section>
        <LegalFooter privacy={copy.legal.privacy} support={copy.legal.support} dark />
      </main>{overlays}</>
    );
  }

  return (
    <><main className={`app-shell ${screen === 'swipe' && !readingMode ? 'app-shell--swipe' : ''} ${readingMode ? 'app-shell--reading' : ''}`} aria-busy={loading} aria-hidden={modalActive || undefined}>
      <AppHeader screen={screen} destination={destination} savedCount={savedItems.length} onHome={() => setScreen(Object.values(storedProfile.reactions).some((answers) => Object.keys(answers).length) ? 'home' : 'landing')} onProfile={() => setScreen('profile')} onSaved={() => setScreen('saved')} canInstall={pwaInstall.canInstall} onInstall={handleInstall} />

      {screen === 'home' && <QuickHome destination={destination} mode={mode} context={context} ready={profile.ready} disabled={searchDisabled} onDestination={setDestination} onMode={setMode} onContext={updateContext} onFind={() => void findMatches()} onRefine={enterSwipe} onProfile={() => setScreen('profile')} />}

      {screen === 'brief' && (
        <section className="brief-page page-wrap">
          <div className="section-heading section-heading--center"><p className="eyebrow">{copy.brief.kicker}</p><h1>{copy.brief.title}</h1><p>{copy.brief.lead}</p></div>
          <div className="brief-card panel">
            <label className="destination-input"><span>{copy.flow.destination}</span><div><i>⌖</i><input value={destination} maxLength={180} onChange={(event) => setDestination(event.target.value)} placeholder={copy.brief.placeholder} /></div></label>
            <p className="field-help">{copy.flow.placeHelp}</p>
            <div className="mode-choice" role="group" aria-label={copy.brief.modeAria}>
              <button className={mode === 'experiences' ? 'mode-card mode-card--selected' : 'mode-card'} onClick={() => setMode('experiences')}><span>◌</span><div><b>{copy.brief.experiences}</b><small>{copy.brief.experiencesDesc}</small></div><i>✓</i></button>
              <button className={mode === 'restaurants' ? 'mode-card mode-card--selected' : 'mode-card'} onClick={() => setMode('restaurants')}><span>◇</span><div><b>{copy.brief.restaurants}</b><small>{copy.brief.restaurantsDesc}</small></div><i>✓</i></button>
            </div>
            <details className="quick-context"><summary>{copy.flow.customize}</summary><div className="brief-grid">
              <ContextChoice label={copy.context.party.label} options={copy.context.party.options} value={context.party} onChange={(value) => updateContext('party', value)} />
              <ContextChoice label={copy.context.pace.label} options={copy.context.pace.options} value={context.pace} onChange={(value) => updateContext('pace', value)} />
              <ContextChoice label={copy.context.budget.label} options={copy.context.budget.options} value={context.budget} onChange={(value) => updateContext('budget', value)} />
              <ContextChoice label={copy.context.discovery.label} options={copy.context.discovery.options} value={context.discovery} onChange={(value) => updateContext('discovery', value)} />
            </div>
            </details>
            <div className="brief-card__footer"><p><span>i</span> {copy.brief.note}</p><button className="primary-button" disabled={!destination.trim() || searchDisabled} onClick={profile.ready ? () => void findMatches() : enterSwipe}>{profile.ready ? copy.flow.find : copy.brief.start} <span>→</span></button></div>
          </div>
        </section>
      )}

      {screen === 'swipe' && (
        <section className="swipe-page page-wrap">
          <div className="swipe-main">
            <div className="swipe-heading"><div><p className="eyebrow">{copy.swipe.kicker}</p><h1>{profile.ready ? copy.swipe.readyTitle : copy.swipe.questionTitle}</h1></div><div className="swipe-count"><b>{profile.informativeCount}</b><span>{copy.swipe.signals}</span></div></div>
            <div className="readiness-progress"><div><span style={{ width: `${Math.max(4, profile.readiness * 100)}%` }} /></div><p>{profile.ready ? copy.swipe.readyProgress : copy.swipe.learningProgress}</p></div>
            <div className="swipe-tools"><button disabled={!undoStack.length || undoStack[undoStack.length - 1]?.mode !== mode || gestureBusy || loading} onClick={undoReaction}>↶ {copy.flow.undo}</button><button aria-pressed={readingMode} onClick={() => setReadingMode(!readingMode)}>{readingMode ? copy.flow.compact : copy.flow.reading}</button></div>
            {currentCard ? <><SwipeCard key={`${language}-${currentCard.id}`} card={currentCard} onReact={recordReaction} onBusy={setGestureBusy} /><ReactionControls disabled={gestureBusy || loading || showResultsPrompt} onReact={recordReaction} /><p className="keyboard-hint">{copy.swipe.keyboard}</p></> : <div className="deck-finished panel"><span>✓</span><h2>{copy.swipe.deckDone}</h2><p>{copy.swipe.deckDoneDesc}</p></div>}
            {profile.ready && <button className="mobile-results-cta" disabled={searchDisabled} onClick={() => void findMatches()}>{cooldown ? copy.flow.wait(cooldown) : loading ? copy.swipe.searching : copy.swipe.seeMatches} <span>→</span></button>}
          </div>
          <div className="swipe-side">
            <LiveProfile profile={profile} onOpen={() => setScreen('profile')} />
            <div className={`ready-card ${profile.ready ? 'ready-card--active' : ''}`}><p>{profile.ready ? copy.swipe.readyKicker : copy.swipe.needsVariety}</p><h3>{profile.ready ? copy.swipe.findIn(destination) : copy.swipe.answersLeft(Math.max(0, 5 - profile.informativeCount))}</h3><button disabled={!profile.ready || searchDisabled} onClick={() => void findMatches()}>{loading ? copy.swipe.searching : copy.swipe.seeMatches} <span>→</span></button></div>
          </div>
        </section>
      )}

      {screen === 'profile' && (
        <section className="profile-page page-wrap">
          <div className="section-heading"><p className="eyebrow">{copy.profile.kicker}</p><h1>{copy.profile.title}</h1><p>{copy.profile.lead}</p></div>
          <div className="profile-overview">
            <div className="profile-summary-card panel"><div className="profile-summary-card__score"><div className="readiness-ring readiness-ring--large" style={{ '--progress': `${Math.round(profile.readiness * 100)}%` } as React.CSSProperties} aria-hidden="true"><span>{profile.ready ? '✓' : '…'}</span></div><div><p>{copy.profile.readiness}</p><h2>{profile.ready ? copy.profile.goodStart : copy.profile.early}</h2><span>{profile.informativeCount} {copy.profile.clearAnswers} · {profile.skippedCount} {copy.profile.unsure}</span></div></div><p className="evidence-note">{copy.flow.evidence}</p><div className="profile-summary-card__facts"><div><b>{profile.categoryCoverage}</b><span>{copy.profile.explored}</span></div><div><b>{getTopCategories(profile).length}</b><span>{copy.profile.positive}</span></div><div><b>{savedItems.length}</b><span>{copy.profile.saved}</span></div></div></div>
            <div className="trip-context-card panel"><div className="panel-kicker">{copy.profile.activeBrief}</div><h2>{destination || copy.profile.noDestination}</h2><div className="taste-tags">{contextSummary.map((item) => <span key={item}>{item}</span>)}</div><button className="text-button" onClick={() => setScreen('brief')}>{copy.profile.changeBrief}</button></div>
          </div>
          <div className="profile-detail panel"><div className="profile-detail__head"><div><p className="panel-kicker">{copy.profile.axes}</p><h2>{copy.profile.adjust}</h2></div><p>{copy.profile.neutral}</p></div><ProfileEditor profile={profile} corrections={storedProfile.corrections} onCorrection={(dim: DimId, value) => setStoredProfile((current) => ({ ...current, corrections: { ...current.corrections, [dim]: value } }))} onClearCorrection={(dim: DimId) => setStoredProfile((current) => { const next = { ...current.corrections }; delete next[dim]; return { ...current, corrections: next }; })} /></div>
          <div className="profile-page__footer"><button className="danger-link" disabled={deletingData} onClick={() => void resetLocalData()}>{deletingData ? copy.swipe.searching : copy.profile.delete}</button><div><button className="secondary-button" onClick={enterSwipe}>{copy.profile.moreCards}</button><button className="primary-button" disabled={!profile.ready || !destination.trim() || searchDisabled} onClick={() => void findMatches()}>{loading ? copy.swipe.searching : copy.profile.find} <span>→</span></button></div></div>
        </section>
      )}

      {screen === 'results' && (
        <section className="results-page page-wrap">
          <div className="results-hero"><div><p className="eyebrow">{copy.results.personal} · {activeSearch.kind === 'restaurants' ? copy.results.food : activeSearch.kind === 'hotels' ? copy.results.hotels : activeSearch.kind === 'tours' ? copy.results.tours : activeSearch.kind === 'custom' ? copy.results.custom : copy.results.experiences}</p><h1>{copy.results.matchesFor} <em>{destination}</em></h1><p>{copy.results.lead}</p></div><div className="results-profile-glance">{topAxes.map((axis) => <span key={axis.dim}>{dimLabels[axis.dim].icon} {dimLabels[axis.dim].label}</span>)}<div className="results-profile-glance__actions"><button onClick={() => setScreen('profile')}>{copy.results.adjust}</button><button className="share-list-button" onClick={() => handleShare(listSharePayload(results.slice(0, visibleCount), destination, language))}>↗ {copy.results.shareList}</button></div></div></div>
          {resultNotice && <div className="notice"><span>i</span><p>{resultNotice}</p></div>}
          <details className="discovery-search panel">
            <summary><span><b>{copy.results.discoveryTitle}</b><small>{copy.results.discoverySummary}</small></span><i>⌄</i></summary>
            <div className="discovery-search__body">
              <p>{copy.results.discoveryLead}</p>
              <div className="discovery-search__kinds" role="group" aria-label={copy.results.discoveryKindAria}>
                {(['hotels', 'tours', 'custom'] as const).map((kind) => <button type="button" className={discoveryKind === kind ? 'is-selected' : ''} aria-pressed={discoveryKind === kind} onClick={() => setDiscoveryKind(kind)} key={kind}>{kind === 'hotels' ? copy.results.hotels : kind === 'tours' ? copy.results.tours : copy.results.custom}</button>)}
              </div>
              <label className="discovery-search__query"><span>{discoveryKind === 'custom' ? copy.results.customLabel : copy.results.optionalWish}</span><input value={discoveryQuery} onChange={(event) => setDiscoveryQuery(event.target.value)} maxLength={160} placeholder={discoveryKind === 'hotels' ? copy.results.hotelPlaceholder : discoveryKind === 'tours' ? copy.results.tourPlaceholder : copy.results.customPlaceholder} /></label>
              {discoveryKind === 'tours' && <div className="discovery-search__tour-fields">
                <label><span>{copy.results.ageBand}</span><select value={tourAgeBand} onChange={(event) => setTourAgeBand(event.target.value)}><option value="">{copy.results.anyOption}</option><option value="18-29">18–29</option><option value="30-49">30–49</option><option value="50-64">50–64</option><option value="65+">65+</option></select></label>
                <label><span>{copy.results.duration}</span><select value={tourDuration} onChange={(event) => setTourDuration(event.target.value)}><option value="">{copy.results.anyOption}</option><option value="weekend">{copy.results.weekend}</option><option value="week">{copy.results.oneWeek}</option><option value="two_weeks">{copy.results.twoWeeks}</option></select></label>
              </div>}
              <div className="discovery-search__footer"><small>{copy.results.requestOnly}</small><button className="primary-button" disabled={searchDisabled || (discoveryKind === 'custom' && !discoveryQuery.trim())} onClick={runDiscoverySearch}>{loading ? copy.swipe.searching : copy.results.searchWithProfile} <span>→</span></button></div>
            </div>
          </details>
          <div className="results-grid">{results.slice(0, visibleCount).map((item, index) => { const key = resultKey(item); return <ResultCard item={item} index={index} saved={Boolean(saved[key])} feedback={feedback[key]} onSave={() => toggleSaved(item)} onFeedback={(value) => recordResultFeedback(item, value)} onShare={() => handleShare(resultSharePayload(item, destination, language))} key={item.id} />; })}</div>
          <div className="results-more"><span role="status">{copy.flow.shown(Math.min(visibleCount, results.length), results.length)}</span>{visibleCount < results.length && <button className="secondary-button" onClick={() => setVisibleCount((count) => count + 3)}>{copy.flow.more} ↓</button>}</div>
          <div className="results-footer panel"><div><p>{copy.results.another}</p><h2>{copy.results.everyAnswer}</h2>{nextPrefetchToken && <small className={`prefetch-status prefetch-status--${nextPrefetchStatus}`} aria-live="polite">{nextPrefetchStatus === 'ready' ? copy.results.nextReady : ['preparing', 'queued', 'running'].includes(nextPrefetchStatus) ? copy.results.nextPreparing : copy.results.nextOnDemand}</small>}</div><div><button className="secondary-button" onClick={enterSwipe}>{copy.results.refine}</button><button className="primary-button" disabled={searchDisabled} onClick={() => void findMatches(activeSearch)}>{loading ? copy.swipe.searching : nextPrefetchStatus === 'ready' ? copy.results.showNext : copy.results.newSelection} <span>↻</span></button></div></div>
        </section>
      )}

      {screen === 'saved' && (
        <section className="results-page page-wrap">
          <div className="results-hero"><div><p className="eyebrow">{copy.results.shortlist}</p><h1>{copy.results.savedTitle}</h1><p>{copy.results.savedLead}</p></div><button className="secondary-button" onClick={() => setScreen(results.length ? 'results' : 'brief')}>{copy.results.back}</button></div>
          {savedItems.length ? <div className="results-grid">{savedItems.map((item: SavedResult, index) => { const key = resultKey(item, item.mode, item.destination); return <ResultCard item={item} index={index} saved feedback={feedback[key]} onSave={() => toggleSaved(item, item.mode, item.destination)} onFeedback={(value) => recordResultFeedback(item, value, item.mode, item.destination)} onShare={() => handleShare(resultSharePayload(item, item.destination, language))} key={key} />; })}</div> : <div className="empty-saved panel"><span>♡</span><h2>{copy.results.emptySaved}</h2><p>{copy.results.emptySavedDesc}</p><button className="primary-button" onClick={() => setScreen('brief')}>{copy.results.findTips} <span>→</span></button></div>}
        </section>
      )}
      {screen !== 'swipe' && <LegalFooter privacy={copy.legal.privacy} support={copy.legal.support} />}
    </main>{overlays}</>
  );
}
