import type { ParsedSchema } from '../../parser/types.js';
import type { ParityCheck } from '../types.js';

// Known field renames between v3 and v5
const KNOWN_RENAMES: Record<string, string> = {
  _id: 'id',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  published_at: 'publishedAt',
};

export function checkFieldPresence(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityCheck[] {
  const checks: ParityCheck[] = [];

  for (const v3Type of v3Schema.contentTypes) {
    const v5Type = v5Schema.contentTypes.find((ct) => ct.name === v3Type.name);
    if (!v5Type) continue; // Missing content type handled by content-type-presence

    const v5FieldNames = new Set(v5Type.fields.map((f) => f.name));

    for (const v3Field of v3Type.fields) {
      const expectedName = KNOWN_RENAMES[v3Field.name] || v3Field.name;

      if (v5FieldNames.has(expectedName)) {
        checks.push({
          checkId: `field-presence-${v3Type.name}-${v3Field.name}`,
          category: 'field-presence',
          contentType: v3Type.name,
          field: v3Field.name,
          status: 'pass',
          message: `Field "${v3Field.name}" exists in v5${expectedName !== v3Field.name ? ` (as "${expectedName}")` : ''}`,
        });
      } else if (v5FieldNames.has(v3Field.name)) {
        // Original name exists (no rename needed)
        checks.push({
          checkId: `field-presence-${v3Type.name}-${v3Field.name}`,
          category: 'field-presence',
          contentType: v3Type.name,
          field: v3Field.name,
          status: 'pass',
          message: `Field "${v3Field.name}" exists in v5`,
        });
      } else {
        checks.push({
          checkId: `field-presence-${v3Type.name}-${v3Field.name}`,
          category: 'field-presence',
          contentType: v3Type.name,
          field: v3Field.name,
          status: 'fail',
          message: `Field "${v3Field.name}" is missing from v5 content type "${v3Type.name}"`,
          v3Value: v3Field.name,
        });
      }
    }
  }

  return checks;
}
