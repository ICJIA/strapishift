export type ParityCheckStatus = 'pass' | 'fail' | 'warning';

export interface ParityCheck {
  checkId: string;
  category: 'content-type-presence' | 'field-presence' | 'field-type-compat' | 'relation-integrity' | 'component-integrity';
  contentType?: string;
  field?: string;
  status: ParityCheckStatus;
  message: string;
  v3Value?: string;
  v5Value?: string;
}

export interface ParityReport {
  tool: 'strapishift';
  reportType: 'parity-verification';
  version: string;
  generatedAt: string;
  sourceVersion: '3.x';
  targetVersion: '5.x';
  parityScore: number; // 0-100
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: ParityCheck[];
  failures: ParityCheck[];
  warningChecks: ParityCheck[];
}
