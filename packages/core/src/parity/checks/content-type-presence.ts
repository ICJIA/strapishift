import type { ParsedSchema } from '../../parser/types.js';
import type { ParityCheck } from '../types.js';

export function checkContentTypePresence(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityCheck[] {
  const checks: ParityCheck[] = [];
  const v5Names = new Set(v5Schema.contentTypes.map((ct) => ct.name));

  for (const v3Type of v3Schema.contentTypes) {
    if (v5Names.has(v3Type.name)) {
      checks.push({
        checkId: `ct-presence-${v3Type.name}`,
        category: 'content-type-presence',
        contentType: v3Type.name,
        status: 'pass',
        message: `Content type "${v3Type.name}" exists in v5`,
      });
    } else {
      checks.push({
        checkId: `ct-presence-${v3Type.name}`,
        category: 'content-type-presence',
        contentType: v3Type.name,
        status: 'fail',
        message: `Content type "${v3Type.name}" is missing from v5`,
        v3Value: v3Type.name,
        v5Value: undefined,
      });
    }
  }

  // Check for extra v5 types not in v3
  const v3Names = new Set(v3Schema.contentTypes.map((ct) => ct.name));
  for (const v5Type of v5Schema.contentTypes) {
    if (!v3Names.has(v5Type.name)) {
      checks.push({
        checkId: `ct-presence-extra-${v5Type.name}`,
        category: 'content-type-presence',
        contentType: v5Type.name,
        status: 'warning',
        message: `Content type "${v5Type.name}" exists in v5 but not in v3 (new addition?)`,
        v5Value: v5Type.name,
      });
    }
  }

  return checks;
}
