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
 * Generate a CSV report — one row per finding.
 */
export function generateCsvReport(report: MigrationReport): string {
  const headers = [
    'Content Type',
    'Field',
    'Severity',
    'Rule ID',
    'Title',
    'Description',
    'Action',
    'Effort',
    'Affects API',
    'Affects Database',
    'Docs URL',
  ];

  const rows: string[][] = [];

  for (const ct of report.contentTypes) {
    for (const f of ct.findings) {
      rows.push([
        ct.name,
        f.field || '',
        f.severity,
        f.ruleId,
        f.title,
        f.description,
        f.action,
        f.effort,
        f.affectsApi ? 'Yes' : 'No',
        f.affectsDatabase ? 'Yes' : 'No',
        f.docsUrl || '',
      ]);
    }
  }

  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];

  return csvLines.join('\n');
}
