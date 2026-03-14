export type ReportFormat = 'json' | 'html' | 'md' | 'csv';

export interface StrapiShiftConfig {
  name: string;
  version: string;
  sourceVersion: '3.x';
  targetVersion: '5.x';
  reports: {
    formats: ReportFormat[];
    outputDir: string;
  };
  rules: Record<string, boolean>;
  modules: Record<string, unknown>;
}

export const DEFAULT_CONFIG: StrapiShiftConfig = {
  name: 'strapishift',
  version: '0.1.0',
  sourceVersion: '3.x',
  targetVersion: '5.x',
  reports: {
    formats: ['json', 'html', 'md', 'csv'],
    outputDir: './strapishift-report',
  },
  rules: {
    database: true,
    api: true,
    media: true,
    relation: true,
    auth: true,
    plugin: true,
    graphql: true,
  },
  modules: {},
};
