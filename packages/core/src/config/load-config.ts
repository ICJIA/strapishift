import type { StrapiShiftConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

/**
 * Merge user config with defaults.
 * This is the pure-TypeScript version — the CLI and web
 * handle the actual file loading and pass the result here.
 */
export function mergeConfig(userConfig: Partial<StrapiShiftConfig>): StrapiShiftConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    reports: { ...DEFAULT_CONFIG.reports, ...userConfig.reports },
    rules: { ...DEFAULT_CONFIG.rules, ...userConfig.rules },
    modules: { ...DEFAULT_CONFIG.modules, ...userConfig.modules },
  };
}

/**
 * Load configuration.
 * In the browser or when no config is provided, returns defaults.
 * The CLI/web packages are responsible for reading strapishift.config.ts
 * from disk and passing the result to mergeConfig().
 */
export async function loadConfig(
  userConfig?: Partial<StrapiShiftConfig>,
): Promise<StrapiShiftConfig> {
  if (userConfig) {
    return mergeConfig(userConfig);
  }
  return { ...DEFAULT_CONFIG };
}
