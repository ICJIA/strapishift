import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * db-field-naming: Detect _id, created_at, updated_at, published_at fields.
 * These are renamed in v5 (snake_case → camelCase for Strapi internals).
 */
const dbFieldNaming: Rule = (contentType, _context) => {
  const findings: Finding[] = [];
  const renames: Record<string, string> = {
    _id: 'id',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    published_at: 'publishedAt',
  };

  for (const field of contentType.fields) {
    const v5Name = renames[field.name];
    if (v5Name) {
      findings.push({
        ruleId: 'db-field-naming',
        contentType: contentType.name,
        field: field.name,
        severity: 'info',
        title: `Field "${field.name}" renamed to "${v5Name}" in v5`,
        description: `Strapi v5 uses "${v5Name}" instead of "${field.name}". This is handled automatically by Strapi v5 but any direct database queries or API consumers referencing "${field.name}" must be updated.`,
        action: `Update references from "${field.name}" to "${v5Name}" in frontend code and database queries.`,
        effort: 'low',
        docsUrl: 'https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

/**
 * db-mongodb-nested: Flag JSON fields on MongoDB instances.
 * MongoDB supports native nested documents; SQL databases store JSON as text.
 */
const dbMongodbNested: Rule = (contentType, context) => {
  if (context.databaseEngine !== 'mongodb') return [];

  const findings: Finding[] = [];
  for (const field of contentType.fields) {
    if (field.type === 'json') {
      findings.push({
        ruleId: 'db-mongodb-nested',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `JSON field "${field.name}" requires restructuring for SQL`,
        description: `MongoDB stores JSON fields as native nested documents. In Strapi v5 on SQLite/Postgres, JSON fields are stored as serialized text. Queries that rely on MongoDB nested document operators ($elemMatch, dot notation) will not work.`,
        action: `Review how "${field.name}" is queried. Replace MongoDB-specific query operators with Strapi v5 filter syntax. Consider restructuring deeply nested data into separate content types or components.`,
        effort: 'medium',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

/**
 * db-objectid-refs: Flag relation fields on MongoDB instances.
 * v3 MongoDB uses ObjectId strings; v5 SQL uses integer IDs.
 */
const dbObjectidRefs: Rule = (contentType, context) => {
  if (context.databaseEngine !== 'mongodb') return [];

  const findings: Finding[] = [];
  const hasRelations = contentType.fields.some((f) => f.isRelation);

  if (hasRelations) {
    findings.push({
      ruleId: 'db-objectid-refs',
      contentType: contentType.name,
      severity: 'info',
      title: `ObjectId references will become integer IDs in v5`,
      description: `MongoDB uses ObjectId strings (e.g., "5f8a...") for record IDs. Strapi v5 on SQLite/Postgres uses auto-incrementing integers. All ID references in relations, API queries, and frontend code must account for this change.`,
      action: `During migration, maintain a v3 ObjectId → v5 integer ID mapping. Update any frontend code that stores or compares IDs.`,
      effort: 'low',
      affectsApi: true,
      affectsDatabase: true,
    });
  }

  return findings;
};

export const databaseRules: Rule[] = [dbFieldNaming, dbMongodbNested, dbObjectidRefs];
