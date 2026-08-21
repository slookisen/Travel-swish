import React, { useEffect, useRef, useState } from 'react';
import { DIMS, type Card, type DimId } from '../dataset';
import type { PreferenceProfile, Reaction, TripContext } from '../profile/engine';
import { getCategoryLabel, getDimLabels } from '../profile/labels';
import type { ResultFeedback, ResultItem, Screen } from '../app/types';
import { UI_COPY, useLanguage, type AppLanguage } from '../app/i18n';

export function getTopAxes(profile: PreferenceProfile, limit = 3) {
  return DIMS.map((dim) => ({ dim, ...profile.dims[dim] }))
    .filter((axis) => Math.abs(axis.value) > .035)
    .sort((a, b) => Math.abs(b.value) * b.confidence - Math.abs(a.value) * a.confidence)
    .slice(0, limit);
}

export function getTopCategories(profile: PreferenceProfile, limit = 4) {
  return Object.entries(profile.categories)
    .filter(([, score]) => score.value > .03)
    .sort((a, b) => b[1].value * b[1].confidence - a[1].value * a[1].confidence)
    .slice(0, limit);
}

function confidenceLabel(confidence: number, language: AppLanguage) {
  const copy = UI_COPY[language].profile;
  if (confidence >= .72) return copy.confidenceStrong;
  if (confidence >= .42) return copy.confidenceGrowing;
  return copy.confidenceExploring;
}

export function matchLabel(match: number, language: AppLanguage = 'no') {
  const copy = UI_COPY[language].results;
  if (match >= 84) return copy.matchExcellent;
  if (match >= 70) return copy.matchStrong;
  if (match >= 58) return copy.matchGood;
  return copy.matchExplore;
}

export function formatContext(context: TripContext, language: AppLanguage) {
  const contextCopy = UI_COPY[language].context;
  const valueLabel = (group: keyof typeof contextCopy, value: string) => {
    const options = contextCopy[group].options as readonly (readonly [string, string])[];
    return options.find(([id]) => id === value)?.[1] || value;
  };
  return [
    valueLabel('party', context.party),
    valueLabel('pace', context.pace),
    valueLabel('budget', context.budget),
    valueLabel('discovery', context.discovery),
  ];
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}><span className="brand__mark">S</span><span>TRAVEL SWISH</span>{!compact && <em>V0.3 TEST</em>}</div>;
}

export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage, copy } = useLanguage();
  return (
    <div className={`language-switch ${dark ? 'language-switch--dark' : ''}`} role="group" aria-label={copy.language.label}>
      <button className={language === 'no' ? 'is-active' : ''} onClick={() => setLanguage('no')} aria-pressed={language === 'no'} title={copy.language.no}>NO</button>
      <button className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'} title={copy.language.en}>EN</button>
    </div>
  );
}

export function AppHeader({
  screen,
  destination,
  savedCount,
  onHome,
  onProfile,
  onSaved,
  canInstall = false,
  onInstall,
}: {
  screen: Screen;
  destination: string;
  savedCount: number;
  onHome: () => void;
  onProfile: () => void;
  onSaved: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
}) {
  const { copy } = useLanguage();
  return (
    <header className="app-header">
      <button className="brand-button" onClick={onHome} aria-label={copy.nav.home}><Brand compact /></button>
      <div className="app-header__right">
        {destination && screen !== 'landing' && <span className="destination-pill">⌖ {destination}</span>}
        {screen !== 'landing' && <button className="quiet-button" onClick={onSaved}>{copy.nav.saved} {savedCount ? `(${savedCount})` : ''}</button>}
        {screen !== 'landing' && <button className="quiet-button app-header__profile-button" onClick={onProfile}>{copy.nav.profile}</button>}
        {canInstall && <button className="quiet-button install-button" onClick={onInstall}>↓ {copy.pwa.install}</button>}
        <LanguageSwitch />
      </div>
    </header>
  );
}

export function ContextChoice<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="choice-group">
      <legend>{label}</legend>
      <div className="choice-row">
        {options.map(([id, text]) => <button type="button" className={value === id ? 'choice choice--selected' : 'choice'} aria-pressed={value === id} key={id} onClick={() => onChange(id)}>{text}</button>)}
      </div>
    </fieldset>
  );
}

export function ProfileBars({ profile, limit = 4 }: { profile: PreferenceProfile; limit?: number }) {
  const { language, copy } = useLanguage();
  const axes = getTopAxes(profile, limit);
  const labels = getDimLabels(language);
  if (!axes.length) return <p className="empty-profile">{copy.profile.empty}</p>;
  return (
    <div className="profile-bars">
      {axes.map((axis) => {
        const meta = labels[axis.dim];
        const signedPosition = 50 + axis.value * 45;
        return (
          <div className="profile-axis" key={axis.dim}>
            <div className="profile-axis__top"><span><b>{meta.icon}</b>{meta.label}</span><small>{confidenceLabel(axis.confidence, language)} · {Math.round(axis.confidence * 100)}%</small></div>
            <div className="axis-track" aria-label={`${meta.label}: ${Math.round(axis.value * 100)}`}>
              <span className="axis-track__middle" /><span className="axis-track__fill" style={{ left: `${Math.min(50, signedPosition)}%`, width: `${Math.abs(signedPosition - 50)}%` }} /><span className="axis-track__dot" style={{ left: `${signedPosition}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LiveProfile({ profile, onOpen }: { profile: PreferenceProfile; onOpen: () => void }) {
  const { language, copy } = useLanguage();
  const categories = getTopCategories(profile);
  return (
    <aside className="live-profile panel">
      <div className="panel-kicker">{copy.profile.panelKicker}</div>
      <div className="live-profile__heading">
        <div><h2>{copy.profile.learning}</h2><p>{profile.informativeCount} {copy.profile.clearAnswers} · {profile.categoryCoverage} {copy.profile.areas}</p></div>
        <div className="readiness-ring" style={{ '--progress': `${Math.round(profile.readiness * 100)}%` } as React.CSSProperties}><span>{Math.round(profile.readiness * 100)}</span><small>%</small></div>
      </div>
      <ProfileBars profile={profile} />
      {categories.length > 0 && <div className="taste-tags" aria-label={copy.profile.strongest}>{categories.map(([category]) => <span key={category}>{getCategoryLabel(language, category)}</span>)}</div>}
      <button className="text-button" onClick={onOpen}>{copy.profile.open}</button>
      <p className="profile-privacy"><span>✓</span> {copy.profile.privacy}</p>
    </aside>
  );
}

export function SwipeCard({ card, onReact }: { card: Card; onReact: (reaction: Reaction) => void }) {
  const { language, copy } = useLanguage();
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dragXRef = useRef(0);
  const dragYRef = useRef(0);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    setDragX(0);
    setDragY(0);
    dragXRef.current = 0;
    dragYRef.current = 0;
    setDragging(false);
    setExitDirection(null);
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, [card.id]);

  function pointerDown(event: React.PointerEvent<HTMLElement>) {
    if (exitDirection) return;
    startX.current = event.clientX;
    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!dragging || exitDirection) return;
    const horizontalLimit = Math.max(300, window.innerWidth * .62);
    const nextX = Math.max(-horizontalLimit, Math.min(horizontalLimit, event.clientX - startX.current));
    const nextY = Math.max(-52, Math.min(52, (event.clientY - startY.current) * .34));
    dragXRef.current = nextX;
    dragYRef.current = nextY;
    setDragX(nextX);
    setDragY(nextY);
  }

  function resetDrag() {
    setDragging(false);
    dragXRef.current = 0;
    dragYRef.current = 0;
    setDragX(0);
    setDragY(0);
  }

  function throwCard(direction: 'left' | 'right') {
    const sign = direction === 'right' ? 1 : -1;
    const cardWidth = cardRef.current?.getBoundingClientRect().width ?? 640;
    const exitX = sign * Math.max(window.innerWidth * 1.08, cardWidth * 1.85);
    setDragging(false);
    setExitDirection(direction);
    dragXRef.current = exitX;
    setDragX(exitX);
    setDragY(dragYRef.current * 1.7);
    exitTimer.current = window.setTimeout(() => onReact(direction === 'right' ? 'love' : 'dislike'), 360);
  }

  function pointerUp(event: React.PointerEvent<HTMLElement>) {
    if (!dragging || exitDirection) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const threshold = Math.min(145, Math.max(86, (cardRef.current?.offsetWidth ?? 560) * .16));
    if (dragXRef.current > threshold) throwCard('right');
    else if (dragXRef.current < -threshold) throwCard('left');
    else resetDrag();
  }

  function pointerCancel() {
    if (!exitDirection) resetDrag();
  }

  const hintOpacity = Math.min(1, Math.max(0, (Math.abs(dragX) - 22) / 86));
  const rotation = exitDirection
    ? (exitDirection === 'right' ? 22 : -22)
    : Math.max(-12, Math.min(12, dragX / 28));
  const lift = dragging ? 1.012 : 1;
  return (
    <div className="swipe-card-shell">
      <div className="swipe-card swipe-card--behind" aria-hidden="true" />
      <article
        ref={cardRef}
        className={`swipe-card ${dragging ? 'is-dragging' : ''} ${exitDirection ? 'is-exiting' : ''}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerCancel}
        style={{ transform: `translate3d(${dragX}px, ${dragY}px, 0) rotate(${rotation}deg) scale(${lift})` }}
      >
        <span className="swipe-verdict swipe-verdict--no" style={{ opacity: dragX < 0 ? hintOpacity : 0 }}>{copy.swipe.verdictNo}</span>
        <span className="swipe-verdict swipe-verdict--yes" style={{ opacity: dragX > 0 ? hintOpacity : 0 }}>{copy.swipe.verdictLove}</span>
        <div className="swipe-card__meta"><span>{getCategoryLabel(language, card.cat)}</span><span>{copy.swipe.dragHint}</span></div>
        <div className="swipe-card__content">
          <div className="swipe-card__emoji" aria-hidden="true">{card.emoji}</div>
          <div className="swipe-card__copy"><h1>{card.q}</h1><p>{card.desc}</p></div>
        </div>
      </article>
    </div>
  );
}

export function ReactionControls({ onReact }: { onReact: (reaction: Reaction) => void }) {
  const { copy } = useLanguage();
  return (
    <div className="reaction-controls" aria-label={copy.swipe.answerAria}>
      <button className="reaction reaction--dislike" onClick={() => onReact('dislike')}><span>×</span><small>{copy.swipe.dislike}</small></button>
      <button className="reaction reaction--skip" onClick={() => onReact('skip')}><span>~</span><small>{copy.swipe.unsure}</small></button>
      <button className="reaction reaction--like" onClick={() => onReact('like')}><span>✓</span><small>{copy.swipe.like}</small></button>
      <button className="reaction reaction--love" onClick={() => onReact('love')}><span>♥</span><small>{copy.swipe.love}</small></button>
    </div>
  );
}

export function ProfileEditor({ profile, corrections, onCorrection, onClearCorrection }: {
  profile: PreferenceProfile;
  corrections: Partial<Record<DimId, number>>;
  onCorrection: (dim: DimId, value: number) => void;
  onClearCorrection: (dim: DimId) => void;
}) {
  const { language, copy } = useLanguage();
  const labels = getDimLabels(language);
  return (
    <div className="profile-editor">
      {DIMS.map((dim) => {
        const meta = labels[dim];
        const hasCorrection = typeof corrections[dim] === 'number';
        const value = hasCorrection ? Number(corrections[dim]) : profile.dims[dim].value;
        return (
          <div className="profile-editor__row" key={dim}>
            <div className="profile-editor__label"><span className="profile-editor__icon">{meta.icon}</span><div><b>{meta.label}</b><small>{meta.low} ↔ {meta.high}</small></div></div>
            <input type="range" min="-1" max="1" step="0.05" value={value} onChange={(event) => onCorrection(dim, Number(event.target.value))} aria-label={`${copy.profile.adjustAxis} ${meta.label}`} />
            <div className="profile-editor__value"><b>{value > 0 ? '+' : ''}{Math.round(value * 100)}</b><small>{Math.round(profile.dims[dim].confidence * 100)}% {copy.profile.confidence}</small></div>
            <button className="reset-axis" disabled={!hasCorrection} onClick={() => onClearCorrection(dim)} aria-label={`${copy.profile.learnedAxis} ${meta.label}`}>↺</button>
          </div>
        );
      })}
    </div>
  );
}

export function ResultCard({ item, index, saved, feedback, onSave, onFeedback, onShare }: {
  item: ResultItem;
  index: number;
  saved: boolean;
  feedback?: ResultFeedback;
  onSave: () => void;
  onFeedback: (feedback: ResultFeedback) => void;
  onShare: () => void;
}) {
  const { language, copy } = useLanguage();
  const sourceLabel = item.source === 'starter' ? copy.results.curated : item.source === 'google_places' ? copy.results.google : item.source === 'brave' ? copy.results.web : copy.results.live;
  const feedbackOptions: Array<{ id: ResultFeedback; label: string }> = [
    { id: 'useful', label: copy.results.useful }, { id: 'not_relevant', label: copy.results.irrelevant },
    { id: 'visited', label: copy.results.visited }, { id: 'wrong_info', label: copy.results.wrong },
  ];
  const destinationLabel = item.source === 'starter' ? copy.results.mapsSearch : item.source === 'google_places' ? copy.results.openPlace : copy.results.sourceLink;
  const showSource = Boolean(item.sourceUrl && item.sourceUrl !== item.url);
  return (
    <article className="result-card">
      <div className="result-card__number">{String(index + 1).padStart(2, '0')}</div>
      <div className="result-card__content">
        <div className="result-card__eyebrow"><span>{getCategoryLabel(language, item.cat) || copy.results.suggestion}</span>{item.rating ? <span>★ {item.rating.toFixed(1)}{item.rating_count ? ` · ${item.rating_count}` : ''}</span> : <span>{sourceLabel}</span>}</div>
        <h2>{item.name}</h2><p>{item.why}</p>
        <div className="result-card__footer">
          <div className="match-score"><b>{matchLabel(item.match, language)}</b><span>{copy.results.profileMatch}</span></div>
          <div className="result-links">{showSource && <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source === 'starter' ? copy.results.officialSource : copy.results.sourceLink}</a>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">{destinationLabel}</a>}<button className="share-button" onClick={onShare} aria-label={`${copy.results.shareResultAria} ${item.name}`}>↗ {copy.results.shareResult}</button><button className={saved ? 'save-button save-button--active' : 'save-button'} onClick={onSave} aria-label={`${saved ? copy.results.removeSave : copy.results.saveAria} ${item.name}`}>{saved ? copy.results.saved : copy.results.save}</button></div>
        </div>
        <div className="result-feedback" aria-label={`${copy.results.feedbackAria} ${item.name}`}><span>{copy.results.helped}</span>{feedbackOptions.map((option) => <button className={feedback === option.id ? 'is-selected' : ''} key={option.id} onClick={() => onFeedback(option.id)} aria-pressed={feedback === option.id}>{option.label}</button>)}</div>
      </div>
    </article>
  );
}
