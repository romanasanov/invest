import type { BaselineSnapshot, ConfigEnvelope, FormatId, ModelScenario, SalesPlan, SiteConfig } from './types';

export type ScenarioSource = 'current' | 'baseline';
export interface ExplorerState {
  plans: Partial<Record<FormatId, SalesPlan>>;
  scenarios: Partial<Record<FormatId, ModelScenario>>;
  sources: Partial<Record<FormatId, ScenarioSource>>;
}

/** A restoration is a new local draft; it never changes the saved baseline. */
export function baselineDraft(baseline: BaselineSnapshot): SiteConfig {
  return structuredClone(baseline.config);
}

/** The whole configuration is selected so menu/catalog and operating costs stay coherent. */
export function configForScenario(data: ConfigEnvelope, format: FormatId, sources: ExplorerState['sources']): SiteConfig {
  return sources[format] === 'baseline' ? data.baseline.config : data.config;
}

/** Reset both days and every investor override for just the selected format. */
export function resetFormatScenario(state: ExplorerState, format: FormatId, source: ScenarioSource = 'baseline'): ExplorerState {
  const plans = { ...state.plans };
  const scenarios = { ...state.scenarios };
  delete plans[format];
  delete scenarios[format];
  return { plans, scenarios, sources: { ...state.sources, [format]: source } };
}
