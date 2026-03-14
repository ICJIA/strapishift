import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { verify } from '@strapishift/core';
import type { V3Schema } from '@strapishift/core';
import { formatParityReport } from '../output/terminal-reporter.js';
import { writeParityReports } from '../output/file-writer.js';

function readSchema(schemaPath: string): V3Schema | Record<string, V3Schema> {
  const resolved = path.resolve(schemaPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`Schema path does not exist: ${resolved}`);
  }

  const stat = fs.statSync(resolved);

  if (stat.isFile()) {
    const content = fs.readFileSync(resolved, 'utf-8');
    return JSON.parse(content) as V3Schema | Record<string, V3Schema>;
  }

  if (stat.isDirectory()) {
    return readDirectorySchemas(resolved);
  }

  throw new Error(`Invalid schema path: ${resolved}`);
}

function readDirectorySchemas(dir: string): Record<string, V3Schema> {
  const schemas: Record<string, V3Schema> = {};

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.json')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content) as V3Schema;
        const name = parsed.info?.name
          || path.basename(entry.name, '.json');
        schemas[name.toLowerCase()] = parsed;
      }
    }
  }

  walk(dir);

  if (Object.keys(schemas).length === 0) {
    throw new Error(`No JSON schema files found in directory: ${dir}`);
  }

  return schemas;
}

export const verifyCommand = defineCommand({
  meta: {
    name: 'verify',
    description: 'Verify parity between v3 and v5 schemas',
  },
  args: {
    'v3-schema': {
      type: 'string',
      description: 'Path to v3 schema file or directory',
      required: true,
    },
    'v5-schema': {
      type: 'string',
      description: 'Path to v5 schema file or directory',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Comma-separated output formats (json,html,md,csv)',
      default: 'json,html,md,csv',
    },
    'output-dir': {
      type: 'string',
      description: 'Output directory for report files',
      default: './strapishift-report',
    },
    quiet: {
      type: 'boolean',
      description: 'Suppress terminal output',
      default: false,
    },
  },
  run({ args }) {
    try {
      const v3Schema = readSchema(args['v3-schema'] as string);
      const v5Schema = readSchema(args['v5-schema'] as string);
      const report = verify(v3Schema, v5Schema);

      // Print to terminal
      if (!args.quiet) {
        console.log(formatParityReport(report));
      }

      // Write report files
      const formats = (args.format as string).split(',').map((f) => f.trim()) as Array<'json' | 'html' | 'md' | 'csv'>;
      writeParityReports(report, formats, args['output-dir'] as string, args.quiet as boolean);

      // Exit code: 0 if score is 100%, 2 if failures found
      if (report.failed > 0) {
        process.exitCode = 2;
      }
    } catch (err) {
      console.error(pc.red(`Error: ${(err as Error).message}`));
      process.exitCode = 1;
    }
  },
});
