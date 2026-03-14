import { describe, it, expect } from 'vitest';
import { analyze, verify } from '../../src/index.js';
import { generateJsonReport } from '../../src/reporter/json-reporter.js';
import { generateHtmlReport } from '../../src/reporter/html-reporter.js';
import { generateMarkdownReport } from '../../src/reporter/markdown-reporter.js';
import { generateCsvReport } from '../../src/reporter/csv-reporter.js';
import { generateParityJson, generateParityHtml, generateParityMarkdown, generateParityCsv } from '../../src/reporter/parity-reporter.js';
import articleSchema from '../fixtures/v3-article-schema.json';
import multiSchema from '../fixtures/v3-multi-schema.json';

describe('Migration Report Reporters', () => {
  const report = analyze(articleSchema as any);

  describe('JSON reporter', () => {
    it('produces valid JSON', () => {
      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);
      expect(parsed.tool).toBe('strapishift');
      expect(parsed.contentTypes).toBeDefined();
      expect(parsed.summary).toBeDefined();
    });
  });

  describe('HTML reporter', () => {
    it('produces valid HTML with required elements', () => {
      const html = generateHtmlReport(report);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('StrapiShift Migration Report');
      expect(html).toContain('Article');
      expect(html).toContain('@media print');
    });

    it('includes theme toggle', () => {
      const html = generateHtmlReport(report);
      expect(html).toContain('theme-toggle');
      expect(html).toContain('Toggle Theme');
    });

    it('includes severity badges', () => {
      const html = generateHtmlReport(report);
      expect(html).toContain('BLOCKER');
    });
  });

  describe('Markdown reporter', () => {
    it('produces valid Markdown with checklist items', () => {
      const md = generateMarkdownReport(report);
      expect(md).toContain('# StrapiShift Migration Report');
      expect(md).toContain('## Executive Summary');
      expect(md).toContain('- [ ]');
    });
  });

  describe('CSV reporter', () => {
    it('produces valid CSV with correct columns', () => {
      const csv = generateCsvReport(report);
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1);

      // CSV now has a summary section; find the FINDINGS header row
      const findingsIndex = lines.findIndex(l => l === '# FINDINGS');
      expect(findingsIndex).toBeGreaterThan(-1);
      const headers = lines[findingsIndex + 1].split(',');
      expect(headers).toContain('Content Type');
      expect(headers).toContain('Severity');
      expect(headers).toContain('Title');
    });
  });
});

describe('Parity Report Reporters', () => {
  const parityReport = verify(multiSchema as any, multiSchema as any);

  it('generates JSON parity report', () => {
    const json = generateParityJson(parityReport);
    const parsed = JSON.parse(json);
    expect(parsed.reportType).toBe('parity-verification');
    expect(parsed.parityScore).toBe(100);
  });

  it('generates HTML parity report with print styles', () => {
    const html = generateParityHtml(parityReport);
    expect(html).toContain('Parity Report');
    expect(html).toContain('@media print');
    expect(html).toContain('100%');
  });

  it('generates Markdown parity report', () => {
    const md = generateParityMarkdown(parityReport);
    expect(md).toContain('Parity Verification Report');
    expect(md).toContain('100%');
  });

  it('generates CSV parity report', () => {
    const csv = generateParityCsv(parityReport);
    expect(csv).toContain('Check ID');
    expect(csv).toContain('Status');
  });
});
