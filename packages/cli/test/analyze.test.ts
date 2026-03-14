import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { analyze, verify } from '@strapishift/core';
import type { MigrationReport, ParityReport } from '@strapishift/core';
import { formatMigrationReport, formatParityReport } from '../src/output/terminal-reporter.js';
import { writeMigrationReports, writeParityReports } from '../src/output/file-writer.js';
import articleSchema from './fixtures/v3-article-schema.json';
import multiSchema from './fixtures/v3-multi-schema.json';

describe('analyze command', () => {
  it('reads a fixture and produces a valid migration report', () => {
    const report = analyze(articleSchema as any);

    expect(report.tool).toBe('strapishift');
    expect(report.summary.totalContentTypes).toBe(1);
    expect(report.contentTypes).toHaveLength(1);
    expect(report.summary.totalFindings).toBeGreaterThan(0);
  });

  it('handles multi-schema input', () => {
    const report = analyze(multiSchema as any);

    expect(report.summary.totalContentTypes).toBe(3);
    expect(report.contentTypes).toHaveLength(3);
  });
});

describe('terminal reporter', () => {
  it('produces expected output strings for migration report', () => {
    const report = analyze(articleSchema as any);
    const output = formatMigrationReport(report);

    expect(output).toContain('StrapiShift');
    expect(output).toContain('Migration Analysis');
    expect(output).toContain('Summary');
    expect(output).toContain('Content Types');
    expect(output).toContain('Migration Readiness');
    expect(output).toContain('Estimated Effort');
    expect(output).toContain('Article');
  });

  it('shows blockers when present', () => {
    const report = analyze(articleSchema as any);
    const output = formatMigrationReport(report);

    // Article schema has a richtext field that should trigger a blocker
    if (report.summary.blockers > 0) {
      expect(output).toContain('Blockers');
    }
  });

  it('produces expected output strings for parity report', () => {
    const report = verify(multiSchema as any, multiSchema as any);
    const output = formatParityReport(report);

    expect(output).toContain('StrapiShift');
    expect(output).toContain('Parity Verification');
    expect(output).toContain('Parity Score');
    expect(output).toContain('100%');
    expect(output).toContain('Passed');
  });
});

describe('file writer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapishift-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates migration report files in the output directory', () => {
    const report = analyze(articleSchema as any);
    const written = writeMigrationReports(report, ['json', 'html', 'md', 'csv'], tmpDir, true);

    expect(written).toHaveLength(4);
    for (const filePath of written) {
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }

    expect(written.some((f) => f.endsWith('.json'))).toBe(true);
    expect(written.some((f) => f.endsWith('.html'))).toBe(true);
    expect(written.some((f) => f.endsWith('.md'))).toBe(true);
    expect(written.some((f) => f.endsWith('.csv'))).toBe(true);
  });

  it('creates parity report files in the output directory', () => {
    const report = verify(multiSchema as any, multiSchema as any);
    const written = writeParityReports(report, ['json', 'html'], tmpDir, true);

    expect(written).toHaveLength(2);
    for (const filePath of written) {
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('creates the output directory if it does not exist', () => {
    const nestedDir = path.join(tmpDir, 'nested', 'output');
    const report = analyze(articleSchema as any);
    const written = writeMigrationReports(report, ['json'], nestedDir, true);

    expect(written).toHaveLength(1);
    expect(fs.existsSync(nestedDir)).toBe(true);
  });

  it('skips unknown formats gracefully', () => {
    const report = analyze(articleSchema as any);
    const written = writeMigrationReports(report, ['json', 'xml' as any], tmpDir, true);

    expect(written).toHaveLength(1);
    expect(written[0]).toContain('.json');
  });
});
