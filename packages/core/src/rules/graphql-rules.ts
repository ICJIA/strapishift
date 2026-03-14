import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * graphql-schema-changes: If GraphQL is detected in the schema context,
 * flag that schema regeneration is needed.
 *
 * Since we can't detect GraphQL usage from schema files alone,
 * this rule checks for the graphql plugin reference in field definitions
 * or can be triggered when GraphQL-related patterns are found.
 */
const graphqlSchemaChanges: Rule = (contentType) => {
  const findings: Finding[] = [];

  // Check if any field references the graphql plugin
  const hasGraphqlRef = contentType.fields.some(
    (f) => f.raw.plugin === 'graphql' || f.raw.type === 'graphql',
  );

  if (hasGraphqlRef) {
    findings.push({
      ruleId: 'graphql-schema-changes',
      contentType: contentType.name,
      severity: 'blocker',
      title: 'GraphQL schema requires regeneration for v5',
      description: `This content type references the GraphQL plugin. Strapi v5's GraphQL plugin generates schemas differently. Custom resolvers, type definitions, and query/mutation extensions must be rewritten. The auto-generated schema will differ from v3.`,
      action: 'Regenerate GraphQL schema after migration. Rewrite any custom resolvers, type definitions, and middleware. Update all GraphQL client queries to match v5 schema.',
      effort: 'high',
      docsUrl: 'https://docs.strapi.io/dev-docs/plugins/graphql',
      affectsApi: true,
      affectsDatabase: false,
    });
  }

  return findings;
};

export const graphqlRules: Rule[] = [graphqlSchemaChanges];
