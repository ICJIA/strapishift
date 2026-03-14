import type { MigrationReport } from './types.js';

/**
 * Generate a comprehensive GitHub-flavored Markdown migration report.
 * Includes all content types (clean and flagged), v3/v5 code examples,
 * rule documentation, and phased migration checklist.
 */
export function generateMarkdownReport(report: MigrationReport): string {
  const lines: string[] = [];

  lines.push('# StrapiShift Migration Report');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt}  `);
  lines.push(`> Source: Strapi ${report.sourceVersion} → Target: Strapi ${report.targetVersion}  `);
  lines.push(`> StrapiShift v${report.version}`);
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('- [Executive Summary](#executive-summary)');
  lines.push('- [Content Type Analysis](#content-type-analysis)');
  lines.push('  - [Blockers](#blockers-resolve-before-migration)');
  lines.push('  - [Warnings](#warnings)');
  lines.push('  - [Clean](#clean-no-issues)');
  lines.push('- [All Findings Detail](#all-findings-detail)');
  lines.push('- [Migration Checklist](#migration-checklist)');
  lines.push('- [Rules Reference](#rules-reference)');
  lines.push('- [v3 → v5 Quick Reference](#v3--v5-quick-reference)');
  lines.push('- [Methodology](#methodology)');
  lines.push('');

  // Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Content Types | ${report.summary.totalContentTypes} |`);
  lines.push(`| Clean | ${report.summary.clean} |`);
  lines.push(`| Warnings | ${report.summary.warnings} |`);
  lines.push(`| Blockers | ${report.summary.blockers} |`);
  lines.push(`| Total Findings | ${report.summary.totalFindings} |`);
  lines.push(`| Migration Readiness | ${report.summary.migrationReadiness}% |`);
  lines.push(`| Estimated Effort | ${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax} hours |`);
  lines.push(`| Effort Breakdown | Low: ${report.summary.estimatedEffort.low} · Medium: ${report.summary.estimatedEffort.medium} · High: ${report.summary.estimatedEffort.high} |`);
  lines.push('');

  // Findings by severity
  const allFindings = report.contentTypes.flatMap(ct => ct.findings);
  const blockerFindings = allFindings.filter(f => f.severity === 'blocker');
  const warningFindings = allFindings.filter(f => f.severity === 'warning');
  const infoFindings = allFindings.filter(f => f.severity === 'info');

  lines.push('### Findings Breakdown');
  lines.push('');
  lines.push(`- 🔴 **Blockers:** ${blockerFindings.length} findings`);
  lines.push(`- ⚠️ **Warnings:** ${warningFindings.length} findings`);
  lines.push(`- ℹ️ **Info:** ${infoFindings.length} findings`);
  lines.push('');

  // Content Type Analysis
  lines.push('## Content Type Analysis');
  lines.push('');

  // Overview table
  lines.push('| Content Type | Kind | Fields | Relations | Status | Findings |');
  lines.push('|-------------|------|--------|-----------|--------|----------|');
  for (const ct of report.contentTypes) {
    const statusIcon = ct.status === 'clean' ? '✅' : ct.status === 'warning' ? '⚠️' : '🔴';
    lines.push(`| ${ct.name} | ${ct.kind} | ${ct.fieldCount} | ${ct.relationCount} | ${statusIcon} ${ct.status} | ${ct.findings.length} |`);
  }
  lines.push('');

  // Blockers
  const blockerTypes = report.contentTypes.filter((ct) => ct.status === 'blocker');
  if (blockerTypes.length > 0) {
    lines.push('### Blockers (Resolve Before Migration)');
    lines.push('');
    lines.push('> These content types have issues that **must** be resolved before migration can proceed.');
    lines.push('');
    for (const ct of blockerTypes) {
      lines.push(`#### 🔴 ${ct.name}`);
      lines.push(`*${ct.kind} · ${ct.fieldCount} fields · ${ct.relationCount} relations*`);
      lines.push('');
      for (const f of ct.findings) {
        const icon = f.severity === 'blocker' ? '🔴' : f.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`- [ ] ${icon} **[${f.severity.toUpperCase()}]** ${f.field ? `\`${f.field}\`` : ct.name}: **${f.title}**`);
        lines.push(`  - **Rule:** \`${f.ruleId}\``);
        lines.push(`  - **Description:** ${f.description}`);
        lines.push(`  - **Action:** ${f.action}`);
        lines.push(`  - **Effort:** ${f.effort} · **Affects:** ${[f.affectsApi ? 'API' : '', f.affectsDatabase ? 'Database' : ''].filter(Boolean).join(', ') || 'N/A'}`);
        if (f.docsUrl) lines.push(`  - **Docs:** ${f.docsUrl}`);
      }
      lines.push('');
    }
  }

  // Warnings
  const warningTypes = report.contentTypes.filter((ct) => ct.status === 'warning');
  if (warningTypes.length > 0) {
    lines.push('### Warnings');
    lines.push('');
    lines.push('> These content types have issues that require attention but will not block migration.');
    lines.push('');
    for (const ct of warningTypes) {
      lines.push(`#### ⚠️ ${ct.name}`);
      lines.push(`*${ct.kind} · ${ct.fieldCount} fields · ${ct.relationCount} relations*`);
      lines.push('');
      for (const f of ct.findings) {
        const icon = f.severity === 'blocker' ? '🔴' : f.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`- [ ] ${icon} **[${f.severity.toUpperCase()}]** ${f.field ? `\`${f.field}\`` : ct.name}: **${f.title}**`);
        lines.push(`  - **Rule:** \`${f.ruleId}\``);
        lines.push(`  - **Description:** ${f.description}`);
        lines.push(`  - **Action:** ${f.action}`);
        lines.push(`  - **Effort:** ${f.effort} · **Affects:** ${[f.affectsApi ? 'API' : '', f.affectsDatabase ? 'Database' : ''].filter(Boolean).join(', ') || 'N/A'}`);
        if (f.docsUrl) lines.push(`  - **Docs:** ${f.docsUrl}`);
      }
      lines.push('');
    }
  }

  // Clean types
  const cleanTypes = report.contentTypes.filter((ct) => ct.status === 'clean');
  if (cleanTypes.length > 0) {
    lines.push('### Clean (No Issues)');
    lines.push('');
    lines.push('> These content types passed all 14 rules across 7 categories with no findings.');
    lines.push('');
    for (const ct of cleanTypes) {
      lines.push(`- ✅ **${ct.name}** — ${ct.kind} · ${ct.fieldCount} fields · ${ct.relationCount} relations · All checks passed`);
    }
    lines.push('');
  }

  // All Findings Detail
  lines.push('## All Findings Detail');
  lines.push('');
  lines.push('Complete list of every finding, sorted by severity.');
  lines.push('');

  const sortedFindings = [...allFindings].sort((a, b) => {
    const order: Record<string, number> = { blocker: 0, warning: 1, info: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  if (sortedFindings.length > 0) {
    lines.push('| # | Severity | Content Type | Field | Rule | Title | Effort | Affects |');
    lines.push('|---|----------|-------------|-------|------|-------|--------|---------|');
    sortedFindings.forEach((f, i) => {
      const icon = f.severity === 'blocker' ? '🔴' : f.severity === 'warning' ? '⚠️' : 'ℹ️';
      const affects = [f.affectsApi ? 'API' : '', f.affectsDatabase ? 'DB' : ''].filter(Boolean).join(', ');
      lines.push(`| ${i + 1} | ${icon} ${f.severity} | ${f.contentType} | ${f.field ? `\`${f.field}\`` : '—'} | \`${f.ruleId}\` | ${f.title} | ${f.effort} | ${affects} |`);
    });
    lines.push('');
  } else {
    lines.push('*No findings — all content types are clean.*');
    lines.push('');
  }

  // Checklist
  if (report.migrationChecklist.length > 0) {
    lines.push('## Migration Checklist');
    lines.push('');
    lines.push('> Work through these phases in order. Complete all items in a phase before moving to the next.');
    lines.push('');
    for (const phase of report.migrationChecklist) {
      lines.push(`### Phase: ${phase.phase}`);
      lines.push(`*${phase.description}*`);
      lines.push('');
      for (const item of phase.items) {
        lines.push(`- [ ] **${item.finding.contentType}**${item.finding.field ? ` → \`${item.finding.field}\`` : ''}: ${item.finding.action}`);
      }
      lines.push('');
    }
  }

  // Rules Reference
  lines.push('## Rules Reference');
  lines.push('');
  lines.push('All 14 rules evaluated against each content type:');
  lines.push('');
  lines.push('| Rule ID | Category | Default Severity | What It Detects |');
  lines.push('|---------|----------|-----------------|-----------------|');
  lines.push('| `db-field-naming` | Database | info | v3 snake_case fields renamed to camelCase in v5 |');
  lines.push('| `db-mongodb-nested` | Database | warning | JSON fields on MongoDB using native nested docs |');
  lines.push('| `db-objectid-refs` | Database | info | ObjectId strings → integer IDs |');
  lines.push('| `api-response-envelope` | API | warning | Response wrapped in { data: { id, attributes } } |');
  lines.push('| `api-filter-syntax` | API | warning | _where/_sort/_limit → filters[]/sort[]/pagination[] |');
  lines.push('| `api-populate-syntax` | API | warning | Relations not auto-populated in v5 |');
  lines.push('| `api-pagination-format` | API | warning | X-Total-Count header → meta.pagination in body |');
  lines.push('| `media-base64-candidate` | Media | blocker | Rich text fields with potential Base64 images |');
  lines.push('| `media-reference-format` | Media | warning | Upload plugin relation → { type: "media" } |');
  lines.push('| `rel-cardinality-syntax` | Relations | warning | model/collection → type/relation/target format |');
  lines.push('| `rel-polymorphic` | Relations | warning | morphTo/morphMany patterns requiring manual migration |');
  lines.push('| `rel-circular` | Relations | info | Bidirectional relations needing two-pass migration |');
  lines.push('| `auth-user-model` | Auth | warning | User model relations and auth endpoint changes |');
  lines.push('| `plugin-compatibility` | Plugins | varies | Plugin v5 compatibility check (12 plugins tracked) |');
  lines.push('');

  // v3 → v5 Quick Reference
  lines.push('## v3 → v5 Quick Reference');
  lines.push('');
  lines.push('### API Response Format');
  lines.push('');
  lines.push('```javascript');
  lines.push('// v3 — flat response');
  lines.push('const response = await fetch("/articles");');
  lines.push('// [{ id: 1, title: "Hello", author: { id: 2, name: "John" } }]');
  lines.push('');
  lines.push('// v5 — wrapped in data/attributes envelope');
  lines.push('const response = await fetch("/api/articles?populate=*");');
  lines.push('// { data: [{ id: 1, attributes: { title: "Hello", author: { data: { id: 2, attributes: { name: "John" } } } } }], meta: { pagination: { ... } } }');
  lines.push('```');
  lines.push('');
  lines.push('### Filter Syntax');
  lines.push('');
  lines.push('```javascript');
  lines.push('// v3');
  lines.push('fetch("/articles?_where[title_contains]=hello&_sort=date:DESC&_limit=10&_start=0")');
  lines.push('');
  lines.push('// v5');
  lines.push('fetch("/api/articles?filters[title][$contains]=hello&sort[0]=date:desc&pagination[page]=1&pagination[pageSize]=10")');
  lines.push('```');
  lines.push('');
  lines.push('### Relation Schema');
  lines.push('');
  lines.push('```json');
  lines.push('// v3 model definition');
  lines.push('{ "author": { "model": "user", "plugin": "users-permissions" } }');
  lines.push('{ "tags": { "collection": "tag", "via": "articles" } }');
  lines.push('');
  lines.push('// v5 schema definition');
  lines.push('{ "author": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" } }');
  lines.push('{ "tags": { "type": "relation", "relation": "manyToMany", "target": "api::tag.tag", "inversedBy": "articles" } }');
  lines.push('```');
  lines.push('');
  lines.push('### Media Fields');
  lines.push('');
  lines.push('```json');
  lines.push('// v3');
  lines.push('{ "image": { "model": "file", "plugin": "upload", "via": "related" } }');
  lines.push('');
  lines.push('// v5');
  lines.push('{ "image": { "type": "media", "multiple": false, "allowedTypes": ["images"] } }');
  lines.push('```');
  lines.push('');
  lines.push('### Field Naming');
  lines.push('');
  lines.push('| v3 Field | v5 Field |');
  lines.push('|----------|----------|');
  lines.push('| `_id` | `id` |');
  lines.push('| `created_at` | `createdAt` |');
  lines.push('| `updated_at` | `updatedAt` |');
  lines.push('| `published_at` | `publishedAt` |');
  lines.push('');
  lines.push('### Key Documentation');
  lines.push('');
  lines.push('- [v4 to v5 Breaking Changes](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes)');
  lines.push('- [v5 REST API Filters](https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication)');
  lines.push('- [v5 REST API Populate](https://docs.strapi.io/dev-docs/api/rest/populate-select)');
  lines.push('- [v5 REST API Pagination](https://docs.strapi.io/dev-docs/api/rest/sort-pagination)');
  lines.push('- [v5 Response Format](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes/response-format)');
  lines.push('- [v5 Relations](https://docs.strapi.io/dev-docs/backend-customization/models#relations)');
  lines.push('- [v5 Media Fields](https://docs.strapi.io/dev-docs/backend-customization/models#media)');
  lines.push('- [v5 Users & Permissions](https://docs.strapi.io/dev-docs/plugins/users-permissions)');
  lines.push('- [v5 GraphQL Plugin](https://docs.strapi.io/dev-docs/plugins/graphql)');
  lines.push('');

  // Methodology
  lines.push('## Methodology');
  lines.push('');
  lines.push('1. **Schema Parsing** — v3 schema JSON is normalized into an internal representation. Fields, relations, components, dynamic zones, and plugin references are classified.');
  lines.push('2. **Rule Execution** — 14 rules across 7 categories are evaluated against every content type. Context-aware: MongoDB rules only fire for MongoDB; pagination rules only for collectionTypes.');
  lines.push('3. **Severity Classification** — Blocker (must fix), Warning (requires attention), Info (automatic/low-impact).');
  lines.push('4. **Effort Estimation** — Low (<1hr), Medium (1-4hr), High (4-8hr) based on real-world migration data.');
  lines.push('5. **Readiness Score** — 0-100% based on clean/total ratio, weighted by blocker severity.');
  lines.push('');

  lines.push('---');
  lines.push('*Generated by [StrapiShift](https://github.com/ICJIA/strapishift) — MIT License*');

  return lines.join('\n');
}
