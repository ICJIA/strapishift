import type { ParsedSchema } from '../../parser/types.js';
import type { ParityCheck } from '../types.js';

// Expected type changes from v3 → v5
const COMPATIBLE_TYPES: Record<string, string[]> = {
  string: ['string'],
  text: ['text'],
  richtext: ['richtext'],
  email: ['email'],
  integer: ['integer'],
  biginteger: ['biginteger'],
  float: ['float'],
  decimal: ['decimal'],
  date: ['date'],
  time: ['time'],
  datetime: ['datetime'],
  boolean: ['boolean'],
  enumeration: ['enumeration'],
  json: ['json'],
  uid: ['uid'],
  password: ['password'],
  relation: ['relation'],
  media: ['media'],
  component: ['component'],
  dynamiczone: ['dynamiczone'],
};

export function checkFieldTypeCompat(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityCheck[] {
  const checks: ParityCheck[] = [];

  for (const v3Type of v3Schema.contentTypes) {
    const v5Type = v5Schema.contentTypes.find((ct) => ct.name === v3Type.name);
    if (!v5Type) continue;

    for (const v3Field of v3Type.fields) {
      const v5Field = v5Type.fields.find((f) => f.name === v3Field.name);
      if (!v5Field) continue; // Missing field handled by field-presence

      const compatibleTypes = COMPATIBLE_TYPES[v3Field.type] || [v3Field.type];
      if (compatibleTypes.includes(v5Field.type)) {
        checks.push({
          checkId: `field-type-${v3Type.name}-${v3Field.name}`,
          category: 'field-type-compat',
          contentType: v3Type.name,
          field: v3Field.name,
          status: 'pass',
          message: `Field "${v3Field.name}" type is compatible (v3: ${v3Field.type}, v5: ${v5Field.type})`,
          v3Value: v3Field.type,
          v5Value: v5Field.type,
        });
      } else {
        checks.push({
          checkId: `field-type-${v3Type.name}-${v3Field.name}`,
          category: 'field-type-compat',
          contentType: v3Type.name,
          field: v3Field.name,
          status: 'fail',
          message: `Field "${v3Field.name}" type mismatch: v3 "${v3Field.type}" → v5 "${v5Field.type}"`,
          v3Value: v3Field.type,
          v5Value: v5Field.type,
        });
      }
    }
  }

  return checks;
}
