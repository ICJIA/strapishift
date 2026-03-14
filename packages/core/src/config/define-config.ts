import type { StrapiShiftConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Type-safe helper for strapishift.config.ts.
 * Provides autocomplete and validation.
 */
export function defineConfig(config: Partial<StrapiShiftConfig>): StrapiShiftConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    reports: { ...DEFAULT_CONFIG.reports, ...config.reports },
    rules: { ...DEFAULT_CONFIG.rules, ...config.rules },
    modules: { ...DEFAULT_CONFIG.modules, ...config.modules },
  };
}
