import React from 'react';
import type { Mode } from '../dataset';
import type { TripContext } from '../profile/engine';
import { useLanguage } from '../app/i18n';
import { ContextChoice, formatContext } from './components';

export function QuickHome({ destination, mode, context, ready, disabled, onDestination, onMode, onContext, onFind, onRefine, onProfile }: {
  destination: string; mode: Mode; context: TripContext; ready: boolean; disabled: boolean;
  onDestination: (value: string) => void; onMode: (mode: Mode) => void;
  onContext: <K extends keyof TripContext>(key: K, value: TripContext[K]) => void;
  onFind: () => void; onRefine: () => void; onProfile: () => void;
}) {
  const { copy, language } = useLanguage();
  return <section className="quick-home page-wrap">
    <div className="section-heading"><p className="eyebrow">{copy.flow.welcome}</p><h1>{copy.flow.title}</h1><p>{copy.flow.lead}</p></div>
    <div className="quick-home__card panel">
      <label className="destination-input"><span>{copy.flow.destination}</span><div><i>⌖</i><input value={destination} maxLength={180} onChange={(event) => onDestination(event.target.value)} placeholder={copy.brief.placeholder} aria-describedby="quick-place-help" /></div></label>
      <p id="quick-place-help" className="field-help">{copy.flow.placeHelp}</p>
      <div className="quick-mode" role="group" aria-label={copy.brief.modeAria}>
        <button className={mode === 'experiences' ? 'is-selected' : ''} aria-pressed={mode === 'experiences'} onClick={() => onMode('experiences')}>◌ {copy.brief.experiences}</button>
        <button className={mode === 'restaurants' ? 'is-selected' : ''} aria-pressed={mode === 'restaurants'} onClick={() => onMode('restaurants')}>◇ {copy.brief.restaurants}</button>
      </div>
      <details className="quick-context"><summary>{copy.flow.customize}<span>{formatContext(context, language).slice(0, 2).join(' · ')}</span></summary>
        <div className="brief-grid">
          <ContextChoice label={copy.context.party.label} options={copy.context.party.options} value={context.party} onChange={(value) => onContext('party', value)} />
          <ContextChoice label={copy.context.pace.label} options={copy.context.pace.options} value={context.pace} onChange={(value) => onContext('pace', value)} />
          <ContextChoice label={copy.context.budget.label} options={copy.context.budget.options} value={context.budget} onChange={(value) => onContext('budget', value)} />
          <ContextChoice label={copy.context.discovery.label} options={copy.context.discovery.options} value={context.discovery} onChange={(value) => onContext('discovery', value)} />
        </div>
      </details>
      {!ready && <p className="field-help">{copy.flow.modeNeedsCards}</p>}
      <button className="primary-button quick-home__find" disabled={disabled || !destination.trim()} onClick={ready ? onFind : onRefine}>{ready ? copy.flow.find : copy.flow.startMode}<span>→</span></button>
    </div>
    <div className="quick-home__links"><button className="text-button" disabled={!destination.trim()} onClick={onRefine}>{copy.flow.refine}</button><button className="text-button" onClick={onProfile}>{copy.flow.profile} →</button></div>
  </section>;
}
