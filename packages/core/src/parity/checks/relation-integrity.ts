import type { ParsedSchema } from '../../parser/types.js';
import type { ParityCheck } from '../types.js';

export function checkRelationIntegrity(
  v3Schema: ParsedSchema,
  v5Schema: ParsedSchema,
): ParityCheck[] {
  const checks: ParityCheck[] = [];
  const v5ContentTypeNames = new Set(v5Schema.contentTypes.map((ct) => ct.name));

  for (const v3Type of v3Schema.contentTypes) {
    const v5Type = v5Schema.contentTypes.find((ct) => ct.name === v3Type.name);
    if (!v5Type) continue;

    for (const v3Field of v3Type.fields) {
      if (!v3Field.isRelation || !v3Field.relationTarget) continue;

      const v5Field = v5Type.fields.find((f) => f.name === v3Field.name);
      if (!v5Field) continue;

      // Check that the relation target exists in v5
      if (!v5ContentTypeNames.has(v3Field.relationTarget)) {
        // Target might be a plugin model (e.g., "user" from users-permissions)
        // Don't fail on those
        if (v3Field.raw.plugin) {
          checks.push({
            checkId: `rel-integrity-${v3Type.name}-${v3Field.name}`,
            category: 'relation-integrity',
            contentType: v3Type.name,
            field: v3Field.name,
            status: 'warning',
            message: `Relation target "${v3Field.relationTarget}" (plugin: ${v3Field.raw.plugin}) — verify plugin is installed in v5`,
            v3Value: v3Field.relationTarget,
          });
        } else {
          checks.push({
            checkId: `rel-integrity-${v3Type.name}-${v3Field.name}`,
            category: 'relation-integrity',
            contentType: v3Type.name,
            field: v3Field.name,
            status: 'fail',
            message: `Relation target "${v3Field.relationTarget}" does not exist in v5`,
            v3Value: v3Field.relationTarget,
          });
        }
      } else {
        // Check cardinality matches
        if (v5Field.isRelation && v5Field.relationCardinality === v3Field.relationCardinality) {
          checks.push({
            checkId: `rel-integrity-${v3Type.name}-${v3Field.name}`,
            category: 'relation-integrity',
            contentType: v3Type.name,
            field: v3Field.name,
            status: 'pass',
            message: `Relation "${v3Field.name}" → "${v3Field.relationTarget}" intact (${v3Field.relationCardinality})`,
          });
        } else if (v5Field.isRelation) {
          checks.push({
            checkId: `rel-integrity-${v3Type.name}-${v3Field.name}`,
            category: 'relation-integrity',
            contentType: v3Type.name,
            field: v3Field.name,
            status: 'warning',
            message: `Relation cardinality changed: v3 "${v3Field.relationCardinality}" → v5 "${v5Field.relationCardinality}"`,
            v3Value: v3Field.relationCardinality,
            v5Value: v5Field.relationCardinality,
          });
        } else {
          checks.push({
            checkId: `rel-integrity-${v3Type.name}-${v3Field.name}`,
            category: 'relation-integrity',
            contentType: v3Type.name,
            field: v3Field.name,
            status: 'pass',
            message: `Relation target "${v3Field.relationTarget}" exists in v5`,
          });
        }
      }
    }
  }

  return checks;
}
