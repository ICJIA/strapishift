import type { MigrationReport } from './types.js';

/**
 * Generate JSON report string from a MigrationReport.
 * Self-contained, LLM-friendly format.
 */
export function generateJsonReport(report: MigrationReport): string {
  return JSON.stringify(report, null, 2);
}
