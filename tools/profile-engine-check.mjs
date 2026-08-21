import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(projectRoot, 'node_modules/.cache/travel-swish-profile-check.mjs');
await build({
  absWorkingDir: projectRoot,
  entryPoints: [path.join(projectRoot, 'src/profile/engine.ts')],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const { computeProfile, createEmptyStoredProfile, profileToBackend, selectNextCard } = await import(`${pathToFileURL(output).href}?t=${Date.now()}`);
const dims = (overrides = {}) => ({ adv: 0, soc: 0, lux: 0, act: 0, cul: 0, nat: 0, food: 0, night: 0, spont: 0, ...overrides });
const cards = [
  { id: 'nature', emoji: 'N', q: 'Nature?', desc: '', cat: 'nature', dims: dims({ nat: 1, act: 0.4, spont: 0.3 }) },
  { id: 'luxury', emoji: 'L', q: 'Luxury?', desc: '', cat: 'luxury', dims: dims({ lux: 1, food: 0.4, spont: -0.4 }) },
  { id: 'culture', emoji: 'C', q: 'Culture?', desc: '', cat: 'culture', dims: dims({ cul: 1, soc: 0.2 }) },
];
const reactions = {
  nature: { cardId: 'nature', reaction: 'love', answeredAt: 1 },
  luxury: { cardId: 'luxury', reaction: 'dislike', answeredAt: 2 },
};

const learned = computeProfile(reactions, cards, {});
if (!(learned.dims.nat.value > 0)) throw new Error('Expected positive nature preference');
if (!(learned.dims.lux.value < 0)) throw new Error('Expected negative luxury preference');
if (!(learned.dims.nat.confidence > 0)) throw new Error('Expected confidence from evidence');

const corrected = computeProfile(reactions, cards, { lux: 0.9 });
if (!(corrected.dims.lux.value > learned.dims.lux.value)) throw new Error('Manual correction should override learned direction');

const next = selectNextCard(cards, reactions, learned);
if (!next || next.id !== 'culture') throw new Error('Adaptive selection must avoid answered cards');

const payload = profileToBackend(learned, { party: 'solo', pace: 'balanced', budget: 'value', discovery: 'hidden' });
if (payload.taste.context.budget !== 'value') throw new Error('Trip context missing from backend payload');
if (createEmptyStoredProfile().version !== 2) throw new Error('Unexpected profile version');

console.log('profile-engine-check: ok');
