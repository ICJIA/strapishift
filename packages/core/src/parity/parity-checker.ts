import type { ParsedSchema } from '../parser/types.js';
import type { ParityReport, ParityCheck } from './types.js';
import { checkContentTypePresence } from './checks/content-type-presence.js';
import { checkFieldPresence } from './checks/field-presence.js';
import { checkFieldTypeCompat } from './checks/field-type-compat.js';
import { checkRelationIntegrity } from './checks/relation-integrity.js';
import { checkComponentIntegrity } from './checks/component-integrity.js';

/**
 * Compare a v3 ParsedSchema against a v5 ParsedSchema and produce a parity report.
 */
export function checkParity(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityReport {
  const allChecks: ParityCheck[] = [
    ...checkContentTypePresence(v3Schema, v5Schema),
    ...checkFieldPresence(v3Schema, v5Schema),
    ...checkFieldTypeCompat(v3Schema, v5Schema),
    ...checkRelationIntegrity(v3Schema, v5Schema),
    ...checkComponentIntegrity(v3Schema, v5Schema),
  ];

  const passed = allChecks.filter((c) => c.status === 'pass').length;
  const failed = allChecks.filter((c) => c.status === 'fail').length;
  const warnings = allChecks.filter((c) => c.status === 'warning').length;
  const total = allChecks.length;

  // Parity score: percentage of non-failed checks
  const parityScore = total > 0 ? Math.round(((total - failed) / total) * 100 * 100) / 100 : 100;

  return {
    tool: 'strapishift',
    reportType: 'parity-verification',
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    sourceVersion: '3.x',
    targetVersion: '5.x',
    parityScore,
    totalChecks: total,
    passed,
    failed,
    warnings,
    checks: allChecks,
    failures: allChecks.filter((c) => c.status === 'fail'),
    warningChecks: allChecks.filter((c) => c.status === 'warning'),
  };
}
