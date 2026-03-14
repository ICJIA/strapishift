// ── Parser ──
export { parseSingleSchema, parseContentTypeBuilderResponse, parseContentType, parseField, generateUid } from './parser/schema-parser.js';
export { parseDirectory } from './parser/directory-parser.js';
export type { ParsedSchema, ParsedContentType, ParsedComponent, ParsedField, V3Schema, V3FieldDefinition, DatabaseEngine, SourceFormat, RelationCardinality } from './parser/types.js';

// ── Rules ──
export { runRules } from './rules/index.js';
export type { RuleContext, Rule } from './rules/index.js';

// ── Reporter Types ──
export type { Finding, MigrationReport, ReportSummary, ContentTypeReport, ContentTypeStatus, ChecklistPhase, ChecklistItem, Severity, Effort } from './reporter/types.js';

// ── Reporters ──
export { generateJsonReport } from './reporter/json-reporter.js';
export { generateHtmlReport } from './reporter/html-reporter.js';
export { generateMarkdownReport } from './reporter/markdown-reporter.js';
export { generateCsvReport } from './reporter/csv-reporter.js';
export { generateParityJson, generateParityHtml, generateParityMarkdown, generateParityCsv } from './reporter/parity-reporter.js';

// ── Parity ──
export { checkParity } from './parity/parity-checker.js';
export type { ParityReport, ParityCheck, ParityCheckStatus } from './parity/types.js';

// ── Scorer ──
export { getContentTypeStatus, buildContentTypeReport, buildSummary } from './scorer.js';

// ── Config ──
export { defineConfig } from './config/define-config.js';
export { loadConfig, mergeConfig } from './config/load-config.js';
export type { StrapiShiftConfig, ReportFormat } from './config/types.js';
export { DEFAULT_CONFIG } from './config/types.js';

// ── Modules ──
export { registerModule, getRegisteredModules, getModule, clearModules } from './modules/registry.js';
export type { StrapiShiftModule, CliCommandDefinition, ReportEnhancer, ArgDefinition } from './modules/types.js';

// ── Main API ──

import type { V3Schema, ParsedSchema } from './parser/types.js';
import type { MigrationReport, ChecklistPhase } from './reporter/types.js';
import type { ParityReport } from './parity/types.js';
import { parseSingleSchema } from './parser/schema-parser.js';
import { parseDirectory } from './parser/directory-parser.js';
import { runRules } from './rules/index.js';
import { buildContentTypeReport, buildSummary } from './scorer.js';
import { checkParity } from './parity/parity-checker.js';

/**
 * Analyze a Strapi v3 schema and produce a migration report.
 *
 * @param input - Either a single V3Schema, a Record of schemas keyed by name, or a pre-parsed ParsedSchema
 * @param enabledRules - Optional map of rule categories to enable/disable
 * @returns MigrationReport
 */
export function analyze(
  input: V3Schema | Record<string, V3Schema> | ParsedSchema,
  enabledRules?: Record<string, boolean>,
): MigrationReport {
  // Parse if needed
  let schema: ParsedSchema;
  if ('contentTypes' in input && 'metadata' in input) {
    schema = input as ParsedSchema;
  } else if ('attributes' in input) {
    schema = parseSingleSchema(input as V3Schema);
  } else {
    // Check if it's a record of schemas or a directory parse
    const values = Object.values(input);
    if (values.length > 0 && typeof values[0] === 'object' && 'attributes' in (values[0] as Record<string, unknown>)) {
      schema = parseDirectory(input as Record<string, V3Schema>);
    } else {
      schema = parseSingleSchema(input as V3Schema);
    }
  }

  // Run rules
  const findings = runRules(schema, enabledRules);

  // Build content type reports
  const contentTypeReports = schema.contentTypes.map((ct) => {
    const ctFindings = findings.filter((f) => f.contentType === ct.name);
    return buildContentTypeReport(ct, ctFindings);
  });

  // Build summary
  const summary = buildSummary(contentTypeReports);

  // Build migration checklist
  const checklist = buildChecklist(findings);

  return {
    tool: 'strapishift',
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    sourceVersion: '3.x',
    targetVersion: '5.x',
    summary,
    contentTypes: contentTypeReports,
    migrationChecklist: checklist,
  };
}

/**
 * Verify parity between a v3 schema and a v5 schema.
 */
export function verify(
  v3Input: V3Schema | Record<string, V3Schema> | ParsedSchema,
  v5Input: V3Schema | Record<string, V3Schema> | ParsedSchema,
): ParityReport {
  const parseInput = (input: V3Schema | Record<string, V3Schema> | ParsedSchema): ParsedSchema => {
    if ('contentTypes' in input && 'metadata' in input) return input as ParsedSchema;
    if ('attributes' in input) return parseSingleSchema(input as V3Schema);
    const values = Object.values(input);
    if (values.length > 0 && typeof values[0] === 'object' && 'attributes' in (values[0] as Record<string, unknown>)) {
      return parseDirectory(input as Record<string, V3Schema>);
    }
    return parseSingleSchema(input as V3Schema);
  };

  return checkParity(parseInput(v3Input), parseInput(v5Input));
}

/**
 * Build a phased migration checklist from findings.
 */
function buildChecklist(findings: import('./reporter/types.js').Finding[]): ChecklistPhase[] {
  const phases: ChecklistPhase[] = [];

  const blockers = findings.filter((f) => f.severity === 'blocker');
  if (blockers.length > 0) {
    phases.push({
      phase: 'Pre-Migration',
      description: 'Resolve these blockers before starting migration',
      items: blockers.map((f) => ({ finding: f, done: false })),
    });
  }

  const dbFindings = findings.filter((f) => f.affectsDatabase && f.severity !== 'blocker');
  if (dbFindings.length > 0) {
    phases.push({
      phase: 'Schema Migration',
      description: 'Database and schema changes',
      items: dbFindings.map((f) => ({ finding: f, done: false })),
    });
  }

  const apiFindings = findings.filter((f) => f.affectsApi && !f.affectsDatabase && f.severity !== 'blocker');
  if (apiFindings.length > 0) {
    phases.push({
      phase: 'API Migration',
      description: 'API consumer updates',
      items: apiFindings.map((f) => ({ finding: f, done: false })),
    });
  }

  return phases;
}
