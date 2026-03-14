import type { ParsedContentType, ParsedSchema } from '../parser/types.js';
import type { Finding } from '../reporter/types.js';
import { databaseRules } from './database-rules.js';
import { apiRules } from './api-rules.js';
import { mediaRules } from './media-rules.js';
import { relationRules } from './relation-rules.js';
import { authRules } from './auth-rules.js';
import { pluginRules } from './plugin-rules.js';
import { graphqlRules } from './graphql-rules.js';

export interface RuleContext {
  schema: ParsedSchema;
  databaseEngine: string;
}

export type Rule = (contentType: ParsedContentType, context: RuleContext) => Finding[];

export interface RuleCategory {
  name: string;
  rules: Rule[];
}

const allCategories: Record<string, RuleCategory> = {
  database: { name: 'database', rules: databaseRules },
  api: { name: 'api', rules: apiRules },
  media: { name: 'media', rules: mediaRules },
  relation: { name: 'relation', rules: relationRules },
  auth: { name: 'auth', rules: authRules },
  plugin: { name: 'plugin', rules: pluginRules },
  graphql: { name: 'graphql', rules: graphqlRules },
};

/**
 * Run all rules against a parsed schema.
 * Returns all findings across all content types.
 */
export function runRules(
  schema: ParsedSchema,
  enabledCategories?: Record<string, boolean>,
): Finding[] {
  const findings: Finding[] = [];
  const context: RuleContext = {
    schema,
    databaseEngine: schema.metadata.databaseEngine,
  };

  for (const [categoryName, category] of Object.entries(allCategories)) {
    // Skip disabled categories
    if (enabledCategories && enabledCategories[categoryName] === false) continue;

    for (const rule of category.rules) {
      for (const contentType of schema.contentTypes) {
        findings.push(...rule(contentType, context));
      }
    }
  }

  return findings;
}

export { allCategories };
