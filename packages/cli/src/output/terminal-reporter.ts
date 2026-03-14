import pc from 'picocolors';
import type { MigrationReport, ContentTypeReport, ContentTypeStatus, Finding } from '@strapishift/core';
import type { ParityReport, ParityCheck } from '@strapishift/core';

const VERSION = '0.1.0';

function statusIcon(status: ContentTypeStatus): string {
  switch (status) {
    case 'clean': return pc.green('✅');
    case 'warning': return pc.yellow('⚠️');
    case 'blocker': return pc.red('🔴');
  }
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'blocker': return pc.red('🔴');
    case 'warning': return pc.yellow('⚠️');
    case 'info': return pc.blue('ℹ️');
    default: return '';
  }
}

function parityIcon(status: string): string {
  switch (status) {
    case 'pass': return pc.green('✅');
    case 'fail': return pc.red('🔴');
    case 'warning': return pc.yellow('⚠️');
    default: return '';
  }
}

export function formatMigrationReport(report: MigrationReport): string {
  const lines: string[] = [];
  const { summary, contentTypes } = report;

  lines.push('');
  lines.push(pc.bold(`StrapiShift v${VERSION} — Migration Analysis`));
  lines.push('');

  // Summary
  lines.push(pc.bold('📊 Summary'));
  lines.push(`   Content Types: ${summary.totalContentTypes}`);
  lines.push(
    `   ${pc.green(`✅ Clean: ${summary.clean}`)}  ` +
    `${pc.yellow(`⚠️  Warnings: ${summary.warnings}`)}  ` +
    `${pc.red(`🔴 Blockers: ${summary.blockers}`)}`
  );
  lines.push(`   Migration Readiness: ${summary.migrationReadiness}%`);
  lines.push(
    `   Estimated Effort: ${summary.estimatedEffort.totalHoursMin}–${summary.estimatedEffort.totalHoursMax} hours`
  );
  lines.push('');

  // Content Types
  lines.push(pc.bold('📋 Content Types'));
  for (const ct of contentTypes) {
    const icon = statusIcon(ct.status);
    const detail = formatCtDetail(ct);
    lines.push(`   ${icon} ${ct.name} (${ct.fieldCount} fields, ${ct.relationCount} relations) — ${detail}`);
  }
  lines.push('');

  // Blockers
  const blockerFindings = contentTypes.flatMap((ct) =>
    ct.findings.filter((f) => f.severity === 'blocker')
  );
  if (blockerFindings.length > 0) {
    lines.push(pc.bold(pc.red('🔴 Blockers')));
    for (const f of blockerFindings) {
      const location = f.field ? `${f.contentType}.${f.field}` : f.contentType;
      lines.push(`   ${location}: ${f.title}`);
    }
    lines.push('');
  }

  // Warnings
  const warningFindings = contentTypes.flatMap((ct) =>
    ct.findings.filter((f) => f.severity === 'warning')
  );
  if (warningFindings.length > 0) {
    lines.push(pc.bold(pc.yellow('⚠️  Warnings')));
    for (const f of warningFindings) {
      const location = f.field ? `${f.contentType}.${f.field}` : f.contentType;
      lines.push(`   ${location}: ${f.title}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatCtDetail(ct: ContentTypeReport): string {
  const blockerCount = ct.findings.filter((f) => f.severity === 'blocker').length;
  const warningCount = ct.findings.filter((f) => f.severity === 'warning').length;

  if (ct.status === 'clean') return pc.green('clean');

  const parts: string[] = [];
  if (blockerCount > 0) parts.push(`${blockerCount} blocker${blockerCount > 1 ? 's' : ''}`);
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);
  return parts.join(', ');
}

export function formatParityReport(report: ParityReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(pc.bold(`StrapiShift v${VERSION} — Parity Verification`));
  lines.push('');

  // Score
  const scoreColor = report.parityScore >= 90 ? pc.green : report.parityScore >= 70 ? pc.yellow : pc.red;
  lines.push(pc.bold('📊 Parity Score'));
  lines.push(`   ${scoreColor(`${report.parityScore}%`)}`);
  lines.push(`   Total Checks: ${report.totalChecks}`);
  lines.push(
    `   ${pc.green(`✅ Passed: ${report.passed}`)}  ` +
    `${pc.red(`🔴 Failed: ${report.failed}`)}  ` +
    `${pc.yellow(`⚠️  Warnings: ${report.warnings}`)}`
  );
  lines.push('');

  // Failures
  if (report.failures.length > 0) {
    lines.push(pc.bold(pc.red('🔴 Failures')));
    for (const check of report.failures) {
      const location = check.field
        ? `${check.contentType}.${check.field}`
        : check.contentType || check.category;
      lines.push(`   ${location}: ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`      v3: ${check.v3Value || '(none)'}  →  v5: ${check.v5Value || '(none)'}`);
      }
    }
    lines.push('');
  }

  // Warnings
  if (report.warningChecks.length > 0) {
    lines.push(pc.bold(pc.yellow('⚠️  Warnings')));
    for (const check of report.warningChecks) {
      const location = check.field
        ? `${check.contentType}.${check.field}`
        : check.contentType || check.category;
      lines.push(`   ${location}: ${check.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
