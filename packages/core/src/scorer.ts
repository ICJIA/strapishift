import type { Finding, ContentTypeStatus, ReportSummary, ContentTypeReport } from './reporter/types.js';
import type { ParsedContentType } from './parser/types.js';

// Effort hours per level
const EFFORT_HOURS: Record<string, { min: number; max: number }> = {
  low: { min: 0.5, max: 1 },
  medium: { min: 2, max: 4 },
  high: { min: 8, max: 16 },
};

/**
 * Determine the status of a content type based on its findings.
 */
export function getContentTypeStatus(findings: Finding[]): ContentTypeStatus {
  if (findings.some((f) => f.severity === 'blocker')) return 'blocker';
  if (findings.some((f) => f.severity === 'warning')) return 'warning';
  return 'clean';
}

/**
 * Build a ContentTypeReport from a parsed content type and its findings.
 */
export function buildContentTypeReport(
  contentType: ParsedContentType,
  findings: Finding[],
): ContentTypeReport {
  return {
    name: contentType.name,
    uid: contentType.uid,
    kind: contentType.kind,
    status: getContentTypeStatus(findings),
    findings,
    fieldCount: contentType.fields.length,
    relationCount: contentType.fields.filter((f) => f.isRelation).length,
  };
}

/**
 * Build the report summary from content type reports.
 */
export function buildSummary(contentTypeReports: ContentTypeReport[]): ReportSummary {
  const clean = contentTypeReports.filter((ct) => ct.status === 'clean').length;
  const warnings = contentTypeReports.filter((ct) => ct.status === 'warning').length;
  const blockers = contentTypeReports.filter((ct) => ct.status === 'blocker').length;
  const allFindings = contentTypeReports.flatMap((ct) => ct.findings);

  const effortCounts = { low: 0, medium: 0, high: 0 };
  for (const f of allFindings) {
    effortCounts[f.effort]++;
  }

  const totalHoursMin =
    effortCounts.low * EFFORT_HOURS.low.min +
    effortCounts.medium * EFFORT_HOURS.medium.min +
    effortCounts.high * EFFORT_HOURS.high.min;

  const totalHoursMax =
    effortCounts.low * EFFORT_HOURS.low.max +
    effortCounts.medium * EFFORT_HOURS.medium.max +
    effortCounts.high * EFFORT_HOURS.high.max;

  const total = contentTypeReports.length;
  const readiness = total > 0 ? Math.round((clean / total) * 100) : 100;

  return {
    totalContentTypes: total,
    clean,
    warnings,
    blockers,
    totalFindings: allFindings.length,
    migrationReadiness: readiness,
    estimatedEffort: {
      ...effortCounts,
      totalHoursMin,
      totalHoursMax,
    },
  };
}
