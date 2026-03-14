import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

// Known v3 plugins and their v5 status
const PLUGIN_STATUS: Record<string, { status: string; severity: 'info' | 'warning' | 'blocker'; action: string }> = {
  upload: {
    status: 'Built-in, API changed',
    severity: 'info',
    action: 'Upload plugin is built-in to v5. Media API endpoints changed. Update any direct upload API calls.',
  },
  'users-permissions': {
    status: 'Built-in, API changed',
    severity: 'warning',
    action: 'Users & Permissions plugin is built-in to v5 but API routes, JWT config, and role management changed significantly.',
  },
  'content-type-builder': {
    status: 'Built-in',
    severity: 'info',
    action: 'Content Type Builder is built-in to v5. No action needed.',
  },
  'content-manager': {
    status: 'Built-in',
    severity: 'info',
    action: 'Content Manager is built-in to v5. Admin panel API changed.',
  },
  i18n: {
    status: 'Built-in, breaking changes',
    severity: 'warning',
    action: 'i18n plugin API changed in v5. Locale handling and content localization queries differ. Review i18n documentation.',
  },
  graphql: {
    status: 'Available, breaking changes',
    severity: 'warning',
    action: 'GraphQL plugin available for v5 but schema generation, resolvers, and query syntax changed significantly.',
  },
  documentation: {
    status: 'Available for v5',
    severity: 'info',
    action: 'Documentation plugin (Swagger/OpenAPI) is available for v5. Minor configuration changes.',
  },
  email: {
    status: 'Built-in, API changed',
    severity: 'info',
    action: 'Email plugin is built-in to v5. Provider configuration format changed slightly.',
  },
  sentry: {
    status: 'Community plugin, check compatibility',
    severity: 'warning',
    action: 'Check if the Sentry plugin has a v5-compatible version. You may need to switch to a direct Sentry SDK integration.',
  },
  'transformer': {
    status: 'Not available for v5',
    severity: 'warning',
    action: 'The response transformer plugin does not have a v5 version. v5 has built-in response format differences — you may not need this plugin.',
  },
};

/**
 * plugin-compatibility: Check for known v3 plugins and flag v5 status.
 */
const pluginCompatibility: Rule = (contentType) => {
  const findings: Finding[] = [];

  // Check if any fields reference plugins
  for (const field of contentType.fields) {
    const plugin = field.raw.plugin;
    if (!plugin) continue;

    // Skip upload — handled by media rules
    if (plugin === 'upload') continue;

    const status = PLUGIN_STATUS[plugin];
    if (status) {
      findings.push({
        ruleId: 'plugin-compatibility',
        contentType: contentType.name,
        field: field.name,
        severity: status.severity,
        title: `Plugin "${plugin}": ${status.status}`,
        description: `Field "${field.name}" uses the "${plugin}" plugin. ${status.status}.`,
        action: status.action,
        effort: status.severity === 'blocker' ? 'high' : 'medium',
        affectsApi: true,
        affectsDatabase: false,
      });
    } else {
      findings.push({
        ruleId: 'plugin-compatibility',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `Unknown plugin "${plugin}" — manual review needed`,
        description: `Field "${field.name}" uses the "${plugin}" plugin, which is not in our known compatibility database. This plugin may not have a v5-compatible version.`,
        action: `Check the npm registry and Strapi marketplace for a v5-compatible version of "${plugin}". If unavailable, plan to replace its functionality.`,
        effort: 'high',
        affectsApi: true,
        affectsDatabase: false,
      });
    }
  }

  return findings;
};

export const pluginRules: Rule[] = [pluginCompatibility];
