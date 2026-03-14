import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  generateJsonReport,
  generateHtmlReport,
  generateMarkdownReport,
  generateCsvReport,
  generateParityJson,
  generateParityHtml,
  generateParityMarkdown,
  generateParityCsv,
} from '@strapishift/core';
import type { MigrationReport, ParityReport } from '@strapishift/core';

type Format = 'json' | 'html' | 'md' | 'csv';

const GENERATORS: Record<Format, (report: MigrationReport) => string> = {
  json: generateJsonReport,
  html: generateHtmlReport,
  md: generateMarkdownReport,
  csv: generateCsvReport,
};

const PARITY_GENERATORS: Record<Format, (report: ParityReport) => string> = {
  json: generateParityJson,
  html: generateParityHtml,
  md: generateParityMarkdown,
  csv: generateParityCsv,
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeMigrationReports(
  report: MigrationReport,
  formats: Format[],
  outputDir: string,
  quiet: boolean = false,
): string[] {
  ensureDir(outputDir);
  const written: string[] = [];

  for (const fmt of formats) {
    const generator = GENERATORS[fmt];
    if (!generator) {
      if (!quiet) console.warn(pc.yellow(`Unknown format: ${fmt}, skipping`));
      continue;
    }
    const content = generator(report);
    const ext = fmt === 'md' ? 'md' : fmt;
    const filePath = path.join(outputDir, `migration-report.${ext}`);
    fs.writeFileSync(filePath, content, 'utf-8');
    written.push(filePath);
  }

  if (!quiet && written.length > 0) {
    console.log(pc.bold('\n📁 Reports written:'));
    for (const f of written) {
      console.log(`   ${pc.green(f)}`);
    }
    console.log('');
  }

  return written;
}

export function writeParityReports(
  report: ParityReport,
  formats: Format[],
  outputDir: string,
  quiet: boolean = false,
): string[] {
  ensureDir(outputDir);
  const written: string[] = [];

  for (const fmt of formats) {
    const generator = PARITY_GENERATORS[fmt];
    if (!generator) {
      if (!quiet) console.warn(pc.yellow(`Unknown format: ${fmt}, skipping`));
      continue;
    }
    const content = generator(report);
    const ext = fmt === 'md' ? 'md' : fmt;
    const filePath = path.join(outputDir, `parity-report.${ext}`);
    fs.writeFileSync(filePath, content, 'utf-8');
    written.push(filePath);
  }

  if (!quiet && written.length > 0) {
    console.log(pc.bold('\n📁 Reports written:'));
    for (const f of written) {
      console.log(`   ${pc.green(f)}`);
    }
    console.log('');
  }

  return written;
}
