import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * api-response-envelope: data.attributes flattening in v5.
 */
const apiResponseEnvelope: Rule = (contentType) => {
  return [
    {
      ruleId: 'api-response-envelope',
      contentType: contentType.name,
      severity: 'warning',
      title: 'API response envelope changed in v5',
      description: `Strapi v5 flattens the response structure. v3 returns { id, ...attributes } at the top level. v5 returns { data: { id, attributes: { ... } } } for single entries and { data: [...], meta: { pagination } } for lists. If your frontend was built for the v3 response shape, every API consumer must be updated.`,
      action: 'Update all frontend API consumers to handle the v5 response envelope. Use data.attributes to access fields, or configure response transformation middleware.',
      effort: 'medium',
      docsUrl: 'https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/response-format',
      affectsApi: true,
      affectsDatabase: false,
    },
  ];
};

/**
 * api-filter-syntax: _where → filters, _sort → sort, _limit/_start → pagination.
 */
const apiFilterSyntax: Rule = (contentType) => {
  return [
    {
      ruleId: 'api-filter-syntax',
      contentType: contentType.name,
      severity: 'warning',
      title: 'Filter and sort syntax changed in v5',
      description: `Strapi v5 uses a new query parameter syntax. v3 used _where, _sort, _limit, _start. v5 uses filters[field][$eq]=value, sort[0]=field:asc, pagination[page]=1, pagination[pageSize]=25.`,
      action: 'Rewrite all API queries using v5 filter syntax: _where → filters, _sort → sort, _limit/_start → pagination[page]/pagination[pageSize].',
      effort: 'medium',
      docsUrl: 'https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication',
      affectsApi: true,
      affectsDatabase: false,
    },
  ];
};

/**
 * api-populate-syntax: v5 doesn't populate relations by default.
 */
const apiPopulateSyntax: Rule = (contentType) => {
  const hasRelations = contentType.fields.some(
    (f) => f.isRelation || f.isMedia || f.isComponent || f.isDynamicZone,
  );
  if (!hasRelations) return [];

  const relationFields = contentType.fields
    .filter((f) => f.isRelation || f.isMedia || f.isComponent || f.isDynamicZone)
    .map((f) => f.name);

  return [
    {
      ruleId: 'api-populate-syntax',
      contentType: contentType.name,
      severity: 'warning',
      title: 'Relations not populated by default in v5',
      description: `Strapi v5 does not populate relations, media, components, or dynamic zones by default. v3 populated single relations automatically. Affected fields: ${relationFields.join(', ')}.`,
      action: `Add ?populate=* or ?populate[0]=${relationFields[0]} to API queries. For nested population, use populate[field][populate]=subfield syntax.`,
      effort: 'medium',
      docsUrl: 'https://docs.strapi.io/dev-docs/api/rest/populate-select',
      affectsApi: true,
      affectsDatabase: false,
    },
  ];
};

/**
 * api-pagination-format: X-Total-Count header → meta.pagination.
 */
const apiPaginationFormat: Rule = (contentType) => {
  if (contentType.kind !== 'collectionType') return [];

  return [
    {
      ruleId: 'api-pagination-format',
      contentType: contentType.name,
      severity: 'warning',
      title: 'Pagination format changed in v5',
      description: `Strapi v3 used X-Total-Count response header and _start/_limit query params. v5 uses meta.pagination in the response body with page/pageSize/pageCount/total fields.`,
      action: 'Update pagination logic to read meta.pagination from the response body instead of X-Total-Count header. Use pagination[page] and pagination[pageSize] query params.',
      effort: 'low',
      docsUrl: 'https://docs.strapi.io/dev-docs/api/rest/sort-pagination',
      affectsApi: true,
      affectsDatabase: false,
    },
  ];
};

export const apiRules: Rule[] = [
  apiResponseEnvelope,
  apiFilterSyntax,
  apiPopulateSyntax,
  apiPaginationFormat,
];
