import type { Rule } from './index.js';
import type { Finding } from '../reporter/types.js';

/**
 * media-base64-candidate: Flag ALL richtext fields as potential Base64 image containers.
 * This is a BLOCKER because Base64 images in rich text is a widespread v3 pattern
 * that silently breaks during migration.
 */
const mediaBase64Candidate: Rule = (contentType) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (field.type === 'richtext') {
      findings.push({
        ruleId: 'media-base64-candidate',
        contentType: contentType.name,
        field: field.name,
        severity: 'blocker',
        title: `Rich text field "${field.name}" may contain Base64-encoded images`,
        description: `Strapi v3 commonly stored uploaded images as Base64 data URIs (data:image/png;base64,...) directly in rich text fields via CKEditor/TinyMCE. These images inflate database size, bypass the media library, and break responsive image handling in v5. This is a widespread, undocumented v3 pattern.`,
        action: `Scan the content of "${field.name}" for data:image/ strings before migration. Use Phase 2 (live scanning) for automated detection, or manually query: SELECT id FROM ${contentType.collectionName} WHERE ${field.name} LIKE '%data:image/%'. Extract embedded images to the media library and replace with URLs.`,
        effort: 'high',
        affectsApi: false,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

/**
 * media-reference-format: Media field reference format changed.
 */
const mediaReferenceFormat: Rule = (contentType) => {
  const findings: Finding[] = [];

  for (const field of contentType.fields) {
    if (field.isMedia) {
      findings.push({
        ruleId: 'media-reference-format',
        contentType: contentType.name,
        field: field.name,
        severity: 'warning',
        title: `Media field "${field.name}" reference format changed in v5`,
        description: `v3 media fields used a relation to the upload plugin (model/collection "file" with plugin "upload"). v5 uses { type: "media", multiple: ${field.mediaMultiple ?? false}, allowedTypes: [...] }. The API response format for media also changed.`,
        action: `Update schema to v5 media type. Update API consumers to handle the new media response format (nested in data.attributes, requires population).`,
        effort: 'low',
        docsUrl: 'https://docs.strapi.io/dev-docs/backend-customization/models#media',
        affectsApi: true,
        affectsDatabase: true,
      });
    }
  }

  return findings;
};

export const mediaRules: Rule[] = [mediaBase64Candidate, mediaReferenceFormat];
