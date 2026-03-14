import type { V3FieldDefinition, RelationCardinality, ParsedField } from './types.js';

/**
 * Determine if a v3 field definition is a relation.
 */
export function isRelation(field: V3FieldDefinition): boolean {
  // Media relations (model/collection "file" with plugin "upload") are media, not relations
  if (field.plugin === 'upload') return false;
  return !!(field.model || field.collection);
}

/**
 * Determine if a v3 field definition is a media field.
 */
export function isMedia(field: V3FieldDefinition): boolean {
  if (field.plugin !== 'upload') return false;
  return field.model === 'file' || field.collection === 'file';
}

/**
 * Infer relation cardinality from v3 field definition.
 *
 * v3 syntax:
 *   { model: "user" }                         → manyToOne
 *   { model: "user", via: "articles" }         → manyToOne (inverse defined)
 *   { collection: "category" }                 → oneToMany
 *   { collection: "category", via: "articles", dominant: true } → manyToMany
 *   { collection: "category", via: "articles" } → oneToMany or manyToMany
 */
export function inferCardinality(field: V3FieldDefinition): RelationCardinality {
  if (field.model) {
    // Polymorphic
    if (field.model === '*') return 'morphToMany';
    return 'manyToOne';
  }

  if (field.collection) {
    // Polymorphic
    if (field.collection === '*') return 'morphMany';

    // manyToMany: collection + via + dominant
    if (field.via && field.dominant) return 'manyToMany';

    // Could be oneToMany or manyToMany without dominant flag
    // In v3, collection + via without dominant is typically the inverse side of manyToMany
    if (field.via) return 'manyToMany';

    return 'oneToMany';
  }

  return 'manyToOne';
}

/**
 * Get the relation target name from a v3 field definition.
 */
export function getRelationTarget(field: V3FieldDefinition): string {
  return field.model || field.collection || '';
}

/**
 * Parse a v3 relation field into a ParsedField relation-specific properties.
 */
export function parseRelationField(
  name: string,
  field: V3FieldDefinition,
): Partial<ParsedField> {
  if (isMedia(field)) {
    return {
      isRelation: false,
      isMedia: true,
      mediaMultiple: !!field.collection,
      type: 'media',
    };
  }

  if (!isRelation(field)) {
    return { isRelation: false, isMedia: false };
  }

  return {
    isRelation: true,
    isMedia: false,
    relationTarget: getRelationTarget(field),
    relationCardinality: inferCardinality(field),
    relationInverse: field.via,
    relationDominant: field.dominant ?? false,
    type: 'relation',
  };
}
