import type { MigrationReport } from '../reporter/types.js';

export interface ArgDefinition {
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  default?: unknown;
}

export interface CliCommandDefinition {
  name: string;
  description: string;
  args?: Record<string, ArgDefinition>;
  run: (args: Record<string, unknown>) => Promise<void>;
}

export interface ReportEnhancer {
  name: string;
  enhance: (report: MigrationReport, data: unknown) => MigrationReport;
}

export interface StrapiShiftModule {
  name: string;
  phase: number;
  description: string;
  cliCommands?: CliCommandDefinition[];
  reportEnhancers?: ReportEnhancer[];
  dependencies?: string[];
}
