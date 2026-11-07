import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { baselineDraft, configForScenario, resetFormatScenario } from '../lib/scenario-baseline.ts';
import { calculateModel } from '../lib/model.ts';
import { validateConfig } from '../lib/config-validation.ts';

const configText = fs.readFileSync(new URL('../data/default-config.json', import.meta.url), 'utf8');
const config = JSON.parse(configText);
const metadata = JSON.parse(fs.readFileSync(new URL('../data/baseline-metadata.json', import.meta.url), 'utf8'));
const baseline = { config, savedAt: metadata.savedAt, sourceVersion: metadata.sourceVersion };
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

test('the complete approved v32 snapshot has a matching checksum and passes config validation', () => {
  assert.equal(metadata.sourceVersion, 32);
  assert.equal(metadata.savedAt, '2026-11-01T16:00:50.698Z');
  assert.equal(createHash('sha256').update(configText).digest('hex'), metadata.configFileSha256);
  assert.doesNotThrow(() => validateConfig(config));
  assert.deepEqual(config.formats.map(f => [f.id, f.check.averageCheck, f.check.foodCostPct]), [
    ['bistro', 2400, 30], ['ramen', 890, 30], ['sushi', 1190, 33], ['matcha', 690, 35],
  ]);
});

test('admin restoration returns every format and catalog as an independent draft', () => {
  const frozen = freeze(structuredClone(baseline));
  const draft = baselineDraft(frozen);
  assert.deepEqual(draft, config);
  draft.catalog[0].name = 'Unsaved local edit';
  draft.formats[0].menu[0].price = 1;
  draft.formats[1].expenses[0].amount = 0;
  assert.deepEqual(frozen, baseline);
});

test('investor reset restores the complete baseline while preserving other formats and current server settings', () => {
  const current = structuredClone(config);
  const bistro = current.formats.find(f => f.id === 'bistro');
  bistro.check = { averageCheck: 9999, foodCostPct: 50, packagingPerCheck: 100 };
  bistro.expenses[0].amount = 17;
  bistro.calendar = { weekdayDays: 1, weekendDays: 1 };
  bistro.service.enabled = false;
  bistro.menu[0].price = 234;
  bistro.variable.taxPct = 20;
  current.catalog[0].name = 'Changed live menu';
  const envelope = freeze({ config: current, baseline: structuredClone(baseline), version: 40, updatedAt: '2026-12-01T00:00:00Z' });
  const before = structuredClone(envelope);
  const state = freeze({ plans: { bistro: structuredClone(bistro.salesPlan), ramen: structuredClone(current.formats[1].salesPlan) }, scenarios: { bistro: { averageCheck: 333, foodCostPct: 99, serviceEnabled: false }, ramen: { averageCheck: 777 } }, sources: {} });
  const restored = resetFormatScenario(state, 'bistro');
  assert.equal(restored.sources.bistro, 'baseline');
  assert.equal(restored.plans.bistro, undefined);
  assert.equal(restored.scenarios.bistro, undefined);
  assert.deepEqual(restored.plans.ramen, state.plans.ramen);
  assert.deepEqual(restored.scenarios.ramen, state.scenarios.ramen);
  assert.deepEqual(state.sources, {});
  const restoredConfig = configForScenario(envelope, 'bistro', restored.sources);
  assert.deepEqual(calculateModel(restoredConfig, 'bistro'), calculateModel(config, 'bistro'));
  assert.deepEqual(configForScenario(envelope, 'ramen', restored.sources), current);
  assert.deepEqual(envelope, before);
  const actual = resetFormatScenario(restored, 'bistro', 'current');
  assert.equal(actual.sources.bistro, 'current');
  assert.deepEqual(configForScenario(envelope, 'bistro', actual.sources), current);
});
