import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * auth-user-model: Detect relations to "user" model.
 * Users & Permissions plugin API routes and model UIDs changed in v5.
 */
const authUserModel: Rule = (contentType) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (field.isRelation && field.relationTarget === 'user') {
      findings.push({
        ruleId: 'auth-user-model',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `Relation to "user" model requires v5 Users & Permissions update`,
        description: `v3 uses { model: "user" } with plugin "users-permissions". v5 changed the plugin API routes, model UIDs (plugin::users-permissions.user), and authentication endpoints. JWT configuration also changed.`,
        action: `Update the relation target to "plugin::users-permissions.user". Update any authentication API calls: /auth/local → /api/auth/local. Review JWT configuration and role/permission API changes.`,
        effort: 'medium',
        docsUrl: 'https://docs.strapi.io/dev-docs/plugins/users-permissions',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

export const authRules: Rule[] = [authUserModel];
