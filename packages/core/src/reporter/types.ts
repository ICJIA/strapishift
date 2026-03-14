export type Severity = 'info' | 'warning' | 'blocker';
export type Effort = 'low' | 'medium' | 'high';

export interface Finding {
  ruleId: string;
  contentType: string;
  field?: string;
  severity: Severity;
  title: string;
  description: string;
  action: string;
  effort: Effort;
  docsUrl?: string;
  affectsApi: boolean;
  affectsDatabase: boolean;
}

export type ContentTypeStatus = 'clean' | 'warning' | 'blocker';

export interface ContentTypeReport {
  name: string;
  uid: string;
  kind: 'collectionType' | 'singleType';
  status: ContentTypeStatus;
  findings: Finding[];
  fieldCount: number;
  relationCount: number;
}

export interface ReportSummary {
  totalContentTypes: number;
  clean: number;
  warnings: number;
  blockers: number;
  totalFindings: number;
  migrationReadiness: number; // 0-100
  estimatedEffort: {
    low: number;
    medium: number;
    high: number;
    totalHoursMin: number;
    totalHoursMax: number;
  };
}

export interface ChecklistItem {
  finding: Finding;
  done: boolean;
}

export interface ChecklistPhase {
  phase: string;
  description: string;
  items: ChecklistItem[];
}

export interface MigrationReport {
  tool: 'strapishift';
  version: string;
  generatedAt: string;
  sourceVersion: '3.x';
  targetVersion: '5.x';
  summary: ReportSummary;
  contentTypes: ContentTypeReport[];
  migrationChecklist: ChecklistPhase[];
}
