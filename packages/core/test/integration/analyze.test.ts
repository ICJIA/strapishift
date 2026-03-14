import { describe, it, expect } from 'vitest';
import { analyze, verify } from '../../src/index.js';
import articleSchema from '../fixtures/v3-article-schema.json';
import multiSchema from '../fixtures/v3-multi-schema.json';

describe('analyze()', () => {
  it('produces a complete MigrationReport from a single schema', () => {
    const report = analyze(articleSchema as any);

    expect(report.tool).toBe('strapishift');
    expect(report.sourceVersion).toBe('3.x');
    expect(report.targetVersion).toBe('5.x');
    expect(report.summary.totalContentTypes).toBe(1);
    expect(report.contentTypes).toHaveLength(1);
    expect(report.summary.totalFindings).toBeGreaterThan(0);
  });

  it('produces a report from multiple schemas', () => {
    const report = analyze(multiSchema as any);

    expect(report.summary.totalContentTypes).toBe(3);
    expect(report.contentTypes).toHaveLength(3);
  });

  it('identifies blockers from Base64 candidates', () => {
    const report = analyze(articleSchema as any);
    expect(report.summary.blockers).toBeGreaterThan(0);

    const articleCt = report.contentTypes.find((ct) => ct.name === 'Article');
    expect(articleCt?.status).toBe('blocker');
  });

  it('calculates migration readiness', () => {
    const report = analyze(multiSchema as any);
    expect(report.summary.migrationReadiness).toBeGreaterThanOrEqual(0);
    expect(report.summary.migrationReadiness).toBeLessThanOrEqual(100);
  });

  it('calculates effort estimates', () => {
    const report = analyze(articleSchema as any);
    expect(report.summary.estimatedEffort.totalHoursMin).toBeGreaterThan(0);
    expect(report.summary.estimatedEffort.totalHoursMax).toBeGreaterThanOrEqual(
      report.summary.estimatedEffort.totalHoursMin,
    );
  });

  it('builds a migration checklist', () => {
    const report = analyze(articleSchema as any);
    expect(report.migrationChecklist.length).toBeGreaterThan(0);
    expect(report.migrationChecklist[0].items.length).toBeGreaterThan(0);
  });

  it('respects rule category filtering', () => {
    const fullReport = analyze(articleSchema as any);
    const noDbReport = analyze(articleSchema as any, { database: false });
    expect(noDbReport.summary.totalFindings).toBeLessThan(fullReport.summary.totalFindings);
  });
});

describe('verify()', () => {
  it('reports 100% parity when schemas match', () => {
    const report = verify(multiSchema as any, multiSchema as any);
    expect(report.parityScore).toBe(100);
    expect(report.failed).toBe(0);
  });

  it('reports failures when content types are missing', () => {
    const v5Partial = { article: (multiSchema as any).article };
    const report = verify(multiSchema as any, v5Partial as any);
    expect(report.failed).toBeGreaterThan(0);
    expect(report.parityScore).toBeLessThan(100);
  });

  it('produces all required report fields', () => {
    const report = verify(multiSchema as any, multiSchema as any);
    expect(report.tool).toBe('strapishift');
    expect(report.reportType).toBe('parity-verification');
    expect(typeof report.parityScore).toBe('number');
    expect(Array.isArray(report.checks)).toBe(true);
    expect(Array.isArray(report.failures)).toBe(true);
  });
});
