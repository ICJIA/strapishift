import type { ParsedSchema } from '../../parser/types.js';
import type { ParityCheck } from '../types.js';

export function checkComponentIntegrity(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityCheck[] {
  const checks: ParityCheck[] = [];
  const v5ComponentNames = new Set(v5Schema.components.map((c) => c.name));

  for (const v3Component of v3Schema.components) {
    if (v5ComponentNames.has(v3Component.name)) {
      const v5Component = v5Schema.components.find((c) => c.name === v3Component.name)!;
      const v5FieldNames = new Set(v5Component.fields.map((f) => f.name));

      // Check all v3 component fields exist in v5
      for (const v3Field of v3Component.fields) {
        if (v5FieldNames.has(v3Field.name)) {
          checks.push({
            checkId: `comp-integrity-${v3Component.name}-${v3Field.name}`,
            category: 'component-integrity',
            field: v3Field.name,
            status: 'pass',
            message: `Component "${v3Component.name}" field "${v3Field.name}" exists in v5`,
          });
        } else {
          checks.push({
            checkId: `comp-integrity-${v3Component.name}-${v3Field.name}`,
            category: 'component-integrity',
            field: v3Field.name,
            status: 'fail',
            message: `Component "${v3Component.name}" field "${v3Field.name}" is missing from v5`,
            v3Value: v3Field.name,
          });
        }
      }
    } else {
      checks.push({
        checkId: `comp-integrity-${v3Component.name}`,
        category: 'component-integrity',
        status: 'fail',
        message: `Component "${v3Component.name}" is missing from v5`,
        v3Value: v3Component.name,
      });
    }
  }

  return checks;
}
