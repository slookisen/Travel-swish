import React from 'react';
import type { Mode } from '../dataset';
import type { TripContext } from '../profile/engine';
import { useLanguage } from '../app/i18n';
import { ContextChoice, formatContext } from './components';

function HomeIcon({ kind }: { kind: Mode | 'cards' }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'experiences' ? <><circle cx="24" cy="24" r="18" /><path d="m30 17-3 10-9 4 3-10 9-4Z" /><path d="M24 6v4m18 14h-4M24 42v-4M6 24h4" /></>
      : kind === 'restaurants' ? <><path d="M7 24h34c-1 10-7 16-17 16S8 34 7 24Zm11 18h12M17 17c-5-6 5-6 0-12m10 12c-5-6 5-6 0-12m8 12c-5-6 5-6 0-12" /></>
      : <><rect x="17" y="10" width="23" height="31" rx="5" transform="rotate(12 28 25)" /><path d="m11 34-3-1a4 4 0 0 1-3-5L10 8a4 4 0 0 1 5-3l10 3m-1 16 3 4 7-7" /></>}
  </svg>;
}

function HomeArtwork({ mode }: { mode: Mode }) {
  return <div className="home-art" aria-hidden="true">
    <div className="home-art__orbit" />
    <div className="home-art__card home-art__card--back" />
    <div className="home-art__card home-art__card--front">
      <span className="home-art__dots"><i /><i /><i /></span>
      <HomeIcon kind={mode} />
      <span className="home-art__line" /><span className="home-art__line home-art__line--short" />
    </div>
    <span className="home-art__spark">✦</span><span className="home-art__like">♥</span>
    <svg className="home-art__trail" viewBox="0 0 200 90" fill="none"><path d="M5 75c80 0 25-80 75-65s-5 65 90 30m-14-8 18 6-12 14" stroke="currentColor" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" /></svg>
  </div>;
}

export function QuickHome({ destination, mode, context, ready, disabled, onDestination, onMode, onContext, onFind, onRefine, onProfile }: {
  destination: string; mode: Mode; context: TripContext; ready: boolean; disabled: boolean;
  onDestination: (value: string) => void; onMode: (mode: Mode) => void;
  onContext: <K extends keyof TripContext>(key: K, value: TripContext[K]) => void;
  onFind: () => void; onRefine: () => void; onProfile: () => void;
}) {
  const { copy, language } = useLanguage();
  const home = copy.home;
  const content = home[mode];
  const hasDestination = Boolean(destination.trim());
  return <section className={`quick-home page-wrap quick-home--${mode}`}>
    <div className="quick-mode" role="group" aria-label={copy.brief.modeAria}>
      {(['experiences', 'restaurants'] as const).map(value => <button key={value} className={mode === value ? 'is-selected' : ''} aria-pressed={mode === value} onClick={() => onMode(value)}>
        <HomeIcon kind={value} /><span>{copy.brief[value]}</span>
      </button>)}
    </div>
    <header className="home-hero">
      <div className="home-hero__copy" aria-live="polite" aria-atomic="true">
        <p className="home-hero__eyebrow">{home.welcome}</p>
        <h1>{content.title} <span>{content.accent}</span></h1>
        <p className="home-hero__lead">{content.lead}</p>
      </div>
      <HomeArtwork mode={mode} />
    </header>
    <div className="quick-home__card">
      <label className="destination-input"><span>{copy.flow.destination}</span><div><i aria-hidden="true">⌖</i><input value={destination} maxLength={180} onChange={(event) => onDestination(event.target.value)} placeholder={copy.brief.placeholder} aria-describedby="quick-place-help" /></div></label>
      <p id="quick-place-help" className="field-help">{home.placeHelp}</p>
      <details className="quick-context"><summary>{copy.flow.customize}<span>{formatContext(context, language).slice(0, 2).join(' · ')}</span></summary>
        <div className="brief-grid">
          <ContextChoice label={copy.context.party.label} options={copy.context.party.options} value={context.party} onChange={(value) => onContext('party', value)} />
          <ContextChoice label={copy.context.pace.label} options={copy.context.pace.options} value={context.pace} onChange={(value) => onContext('pace', value)} />
          <ContextChoice label={copy.context.budget.label} options={copy.context.budget.options} value={context.budget} onChange={(value) => onContext('budget', value)} />
          <ContextChoice label={copy.context.discovery.label} options={copy.context.discovery.options} value={context.discovery} onChange={(value) => onContext('discovery', value)} />
        </div>
      </details>
    </div>
    {!ready && <p className="home-start-hint" role="status">{content.needsCards}</p>}
    <div className="home-actions" role="group" aria-label={home.actions}>
      <button className="home-action home-action--profile" disabled={!hasDestination} onClick={onRefine} aria-labelledby="home-refine-label" aria-describedby="home-refine-hint">
        <span className="home-action__icon"><HomeIcon kind="cards" /></span><span className="home-action__arrow" aria-hidden="true">↗</span>
        <strong id="home-refine-label">{ready ? home.refine : home.build}</strong><span id="home-refine-hint">{content.refineHint}</span>
      </button>
      <button className="home-action home-action--find" disabled={disabled || !hasDestination || !ready} onClick={onFind} aria-labelledby="home-find-label" aria-describedby="home-find-hint">
        <span className="home-action__icon"><HomeIcon kind={mode} /></span><span className="home-action__arrow" aria-hidden="true">→</span>
        <strong id="home-find-label">{content.find}</strong><span id="home-find-hint">{ready ? content.findHint : home.locked}</span>
      </button>
    </div>
    <div className="quick-home__links"><button className="text-button" onClick={onProfile}>{home.profile} <span aria-hidden="true">→</span></button></div>
  </section>;
}
