import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * rel-cardinality-syntax: v3 model/collection syntax → v5 type/relation/target.
 */
const relCardinalitySyntax: Rule = (contentType) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (field.isRelation) {
      findings.push({
        ruleId: 'rel-cardinality-syntax',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `Relation "${field.name}" syntax changed in v5`,
        description: `v3 uses { model: "${field.relationTarget}" } or { collection: "${field.relationTarget}" }. v5 uses { type: "relation", relation: "${field.relationCardinality}", target: "api::${field.relationTarget}.${field.relationTarget}" }. The "dominant" property is removed in v5 (Strapi handles this internally).`,
        action: `Update schema to v5 relation format. Relation: ${field.relationCardinality}, target: api::${field.relationTarget}.${field.relationTarget}${field.relationInverse ? `, inversedBy: "${field.relationInverse}"` : ''}.`,
        effort: 'low',
        docsUrl: 'https://docs.strapi.io/dev-docs/backend-customization/models#relations',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

/**
 * rel-polymorphic: Detect morphTo/morphMany patterns.
 */
const relPolymorphic: Rule = (contentType) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (
      field.isRelation &&
      (field.relationCardinality === 'morphToMany' || field.relationCardinality === 'morphMany')
    ) {
      findings.push({
        ruleId: 'rel-polymorphic',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `Polymorphic relation "${field.name}" requires manual migration`,
        description: `v3 polymorphic relations (morphTo/morphMany) work differently in v5. The underlying storage and query patterns changed. Polymorphic relations are less common but require careful handling.`,
        action: `Review the polymorphic relation "${field.name}" and update to v5 polymorphic syntax. Test thoroughly as polymorphic queries differ between v3 and v5.`,
        effort: 'high',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

/**
 * rel-circular: Detect content types that reference each other.
 * Critical for Phase 4 dependency ordering.
 */
const relCircular: Rule = (contentType, context) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (!field.isRelation || !field.relationTarget) continue;

    // Check if the target content type also has a relation back to this one
    const target = context.schema.contentTypes.find(
      (ct) => ct.name === field.relationTarget,
    );
    if (!target) continue;

    const backRef = target.fields.find(
      (f) => f.isRelation && f.relationTarget === contentType.name,
    );

    if (backRef) {
      // Only report once (from the "first" content type alphabetically)
      if (contentType.name < target.name) {
        findings.push({
          ruleId: 'rel-circular',
          contentType: contentType.name,
          field: field.name,
          severity: 'info',
          title: `Circular relation: ${contentType.name} ↔ ${target.name}`,
          description: `"${contentType.name}.${field.name}" references "${target.name}", which references back via "${backRef.name}". Circular relations require two-pass migration: create records without the circular relation first, then update with relation IDs in a second pass.`,
          action: `During migration, create ${contentType.name} records first without the "${field.name}" relation, create ${target.name} records with their relation, then update ${contentType.name} records with the correct ${field.name} IDs.`,
          effort: 'medium',
          affectsApi: false,
          affectsDatabase: true,
        });
      }
    }
  }

  return findings;
};

export const relationRules: Rule[] = [relCardinalitySyntax, relPolymorphic, relCircular];
