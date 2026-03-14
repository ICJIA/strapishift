import type { MigrationReport } from './types.js';

/**
 * Generate a comprehensive JSON report.
 * Self-contained, LLM-friendly format with full rule metadata,
 * v3/v5 migration reference, and structured findings.
 */
export function generateJsonReport(report: MigrationReport): string {
  const enriched = {
    ...report,
    _metadata: {
      description: 'StrapiShift migration analysis report. Contains all findings from evaluating Strapi v3 schemas against 14 rules across 7 categories.',
      rulesApplied: [
        { id: 'db-field-naming', category: 'database', defaultSeverity: 'info', description: 'Detects v3 snake_case fields (_id, created_at, updated_at, published_at) renamed to camelCase in v5.' },
        { id: 'db-mongodb-nested', category: 'database', defaultSeverity: 'warning', description: 'Flags JSON fields on MongoDB instances using native nested documents — v5 on SQL stores JSON as serialized text.' },
        { id: 'db-objectid-refs', category: 'database', defaultSeverity: 'info', description: 'Flags MongoDB ObjectId string references that become auto-incrementing integer IDs in v5.' },
        { id: 'api-response-envelope', category: 'api', defaultSeverity: 'warning', description: 'v5 wraps responses in { data: { id, attributes } } instead of flat objects. All API consumers must update.' },
        { id: 'api-filter-syntax', category: 'api', defaultSeverity: 'warning', description: 'v5 replaces _where, _sort, _limit, _start with filters[], sort[], pagination[] query parameter syntax.' },
        { id: 'api-populate-syntax', category: 'api', defaultSeverity: 'warning', description: 'v5 no longer auto-populates relations, media, components, or dynamic zones. Requires explicit ?populate=*.' },
        { id: 'api-pagination-format', category: 'api', defaultSeverity: 'warning', description: 'v3 used X-Total-Count header + _start/_limit. v5 uses meta.pagination in response body.' },
        { id: 'media-base64-candidate', category: 'media', defaultSeverity: 'blocker', description: 'Flags ALL richtext fields as potential Base64 image containers. Widespread v3 pattern that silently breaks in v5.' },
        { id: 'media-reference-format', category: 'media', defaultSeverity: 'warning', description: 'v3 media fields used upload plugin relation. v5 uses { type: "media" } with different API response format.' },
        { id: 'rel-cardinality-syntax', category: 'relations', defaultSeverity: 'warning', description: 'v3 model/collection syntax changed to v5 type/relation/target format.' },
        { id: 'rel-polymorphic', category: 'relations', defaultSeverity: 'warning', description: 'Detects morphTo/morphMany patterns that work differently in v5 and require manual migration.' },
        { id: 'rel-circular', category: 'relations', defaultSeverity: 'info', description: 'Detects bidirectional relations requiring two-pass migration (create records, then update relations).' },
        { id: 'auth-user-model', category: 'auth', defaultSeverity: 'warning', description: 'Detects relations to "user" model. Plugin API routes, model UIDs, and auth endpoints changed in v5.' },
        { id: 'plugin-compatibility', category: 'plugins', defaultSeverity: 'varies', description: 'Checks plugin references against a known v5 compatibility database (12 plugins tracked).' },
      ],
      v3ToV5Reference: {
        responseFormat: {
          v3: '{ id, ...attributes }',
          v5: '{ data: { id, attributes: { ... } }, meta: { pagination: { ... } } }',
        },
        filterSyntax: {
          v3: '_where[field_contains]=value&_sort=field:DESC&_limit=10&_start=0',
          v5: 'filters[field][$contains]=value&sort[0]=field:desc&pagination[page]=1&pagination[pageSize]=10',
        },
        relationSchema: {
          v3: '{ "model": "target" } or { "collection": "target", "via": "field" }',
          v5: '{ "type": "relation", "relation": "manyToOne", "target": "api::target.target" }',
        },
        mediaSchema: {
          v3: '{ "model": "file", "plugin": "upload", "via": "related" }',
          v5: '{ "type": "media", "multiple": false, "allowedTypes": ["images"] }',
        },
        fieldRenames: {
          '_id': 'id',
          'created_at': 'createdAt',
          'updated_at': 'updatedAt',
          'published_at': 'publishedAt',
        },
        documentation: {
          breakingChanges: 'https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes',
          filters: 'https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication',
          populate: 'https://docs.strapi.io/dev-docs/api/rest/populate-select',
          pagination: 'https://docs.strapi.io/dev-docs/api/rest/sort-pagination',
          responseFormat: 'https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/response-format',
          relations: 'https://docs.strapi.io/dev-docs/backend-customization/models#relations',
          media: 'https://docs.strapi.io/dev-docs/backend-customization/models#media',
          usersPermissions: 'https://docs.strapi.io/dev-docs/plugins/users-permissions',
          graphql: 'https://docs.strapi.io/dev-docs/plugins/graphql',
        },
      },
      severityDefinitions: {
        blocker: 'Must be resolved before migration can proceed. These issues will cause data loss or complete failure.',
        warning: 'Requires attention during migration. Code changes needed but migration can proceed.',
        info: 'Informational. Automatically handled by Strapi v5 or minimal impact.',
      },
      effortDefinitions: {
        low: 'Less than 1 hour. Simple find-and-replace or configuration change.',
        medium: '1-4 hours. Requires code changes across multiple files or API consumer updates.',
        high: '4-8 hours. Significant restructuring, data migration scripts, or manual review required.',
      },
      methodology: 'Schema JSON is parsed into a normalized representation. 14 rules across 7 categories are evaluated against every content type. Rules are context-aware (MongoDB-specific rules only fire for MongoDB schemas). Effort estimates are based on real-world migration data from the ICJIA ResearchHub Strapi v3 → v5 migration.',
    },
  };

  return JSON.stringify(enriched, null, 2);
}
