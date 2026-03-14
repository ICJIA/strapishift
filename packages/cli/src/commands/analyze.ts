import { defineCommand } from 'citty';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { analyze } from '@strapishift/core';
import type { V3Schema } from '@strapishift/core';
import { formatMigrationReport } from '../output/terminal-reporter.js';
import { writeMigrationReports } from '../output/file-writer.js';

/**
 * Read a schema from a file path. If the path is a directory,
 * read all .json files recursively and build a record keyed by name.
 */
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
        // Use the parent directory name or file name (without extension) as the key
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

export const analyzeCommand = defineCommand({
  meta: {
    name: 'analyze',
    description: 'Analyze a Strapi v3 schema for migration readiness',
  },
  args: {
    schema: {
      type: 'positional',
      description: 'Path to a schema JSON file or directory of schema files',
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
      const schema = readSchema(args.schema);
      const report = analyze(schema);

      // Print to terminal
      if (!args.quiet) {
        console.log(formatMigrationReport(report));
      }

      // Write report files
      const formats = (args.format as string).split(',').map((f) => f.trim()) as Array<'json' | 'html' | 'md' | 'csv'>;
      writeMigrationReports(report, formats, args['output-dir'] as string, args.quiet as boolean);

      // Exit code based on blockers
      if (report.summary.blockers > 0) {
        process.exitCode = 2;
      }
    } catch (err) {
      console.error(pc.red(`Error: ${(err as Error).message}`));
      process.exitCode = 1;
    }
  },
});
