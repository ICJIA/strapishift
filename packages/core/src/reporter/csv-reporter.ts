import type { MigrationReport } from './types.js';

/**
 * Escape a CSV field value.
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a comprehensive CSV report.
 * Includes a summary section, one row per finding with full detail,
 * and rows for clean content types that had no findings.
 */
export function generateCsvReport(report: MigrationReport): string {
  const sections: string[] = [];

  // Summary section
  sections.push('# SUMMARY');
  sections.push(['Metric', 'Value'].map(escapeCsv).join(','));
  sections.push(['Tool', 'StrapiShift'].map(escapeCsv).join(','));
  sections.push(['Version', report.version].map(escapeCsv).join(','));
  sections.push(['Generated', report.generatedAt].map(escapeCsv).join(','));
  sections.push(['Source', `Strapi ${report.sourceVersion}`].map(escapeCsv).join(','));
  sections.push(['Target', `Strapi ${report.targetVersion}`].map(escapeCsv).join(','));
  sections.push(['Content Types', String(report.summary.totalContentTypes)].map(escapeCsv).join(','));
  sections.push(['Clean', String(report.summary.clean)].map(escapeCsv).join(','));
  sections.push(['Warnings', String(report.summary.warnings)].map(escapeCsv).join(','));
  sections.push(['Blockers', String(report.summary.blockers)].map(escapeCsv).join(','));
  sections.push(['Total Findings', String(report.summary.totalFindings)].map(escapeCsv).join(','));
  sections.push(['Migration Readiness', `${report.summary.migrationReadiness}%`].map(escapeCsv).join(','));
  sections.push(['Estimated Effort (hours)', `${report.summary.estimatedEffort.totalHoursMin}-${report.summary.estimatedEffort.totalHoursMax}`].map(escapeCsv).join(','));
  sections.push(['Effort Low', String(report.summary.estimatedEffort.low)].map(escapeCsv).join(','));
  sections.push(['Effort Medium', String(report.summary.estimatedEffort.medium)].map(escapeCsv).join(','));
  sections.push(['Effort High', String(report.summary.estimatedEffort.high)].map(escapeCsv).join(','));
  sections.push('');

  // Findings section
  sections.push('# FINDINGS');

  const headers = [
    'Content Type',
    'Kind',
    'Content Type Status',
    'Field',
    'Severity',
    'Rule ID',
    'Rule Category',
    'Title',
    'Description',
    'Action',
    'Effort',
    'Affects API',
    'Affects Database',
    'Docs URL',
  ];
  sections.push(headers.map(escapeCsv).join(','));

  // Rule ID to category mapping
  const ruleCategories: Record<string, string> = {
    'db-field-naming': 'Database',
    'db-mongodb-nested': 'Database',
    'db-objectid-refs': 'Database',
    'api-response-envelope': 'API',
    'api-filter-syntax': 'API',
    'api-populate-syntax': 'API',
    'api-pagination-format': 'API',
    'media-base64-candidate': 'Media',
    'media-reference-format': 'Media',
    'rel-cardinality-syntax': 'Relations',
    'rel-polymorphic': 'Relations',
    'rel-circular': 'Relations',
    'auth-user-model': 'Auth',
    'plugin-compatibility': 'Plugins',
    'graphql-schema-changes': 'GraphQL',
  };

  for (const ct of report.contentTypes) {
    if (ct.findings.length === 0) {
      // Include clean content types with a "clean" row
      sections.push([
        ct.name,
        ct.kind,
        ct.status,
        '',
        'clean',
        '',
        '',
        'All checks passed',
        `${ct.fieldCount} fields and ${ct.relationCount} relations evaluated against 14 rules across 7 categories. No issues found.`,
        'No action required — this content type can be migrated directly.',
        '',
        '',
        '',
        '',
      ].map(escapeCsv).join(','));
    } else {
      for (const f of ct.findings) {
        sections.push([
          ct.name,
          ct.kind,
          ct.status,
          f.field || '',
          f.severity,
          f.ruleId,
          ruleCategories[f.ruleId] || '',
          f.title,
          f.description,
          f.action,
          f.effort,
          f.affectsApi ? 'Yes' : 'No',
          f.affectsDatabase ? 'Yes' : 'No',
          f.docsUrl || '',
        ].map(escapeCsv).join(','));
      }
    }
  }

  sections.push('');

  // Checklist section
  if (report.migrationChecklist.length > 0) {
    sections.push('# MIGRATION CHECKLIST');
    sections.push(['Phase', 'Description', 'Content Type', 'Field', 'Severity', 'Action'].map(escapeCsv).join(','));

    for (const phase of report.migrationChecklist) {
      for (const item of phase.items) {
        sections.push([
          phase.phase,
          phase.description,
          item.finding.contentType,
          item.finding.field || '',
          item.finding.severity,
          item.finding.action,
        ].map(escapeCsv).join(','));
      }
    }
  }

  return sections.join('\n');
}
