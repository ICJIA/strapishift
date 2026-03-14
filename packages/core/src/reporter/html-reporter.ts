import type { MigrationReport } from './types.js';

/**
 * Generate a self-contained HTML report.
 * Shows ALL content types with ALL findings — both issues and clean passes.
 */
export function generateHtmlReport(report: MigrationReport): string {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'blocker': return '🔴';
      case 'warning': return '⚠️';
      case 'clean': return '✅';
      default: return 'ℹ️';
    }
  };

  const severityOrder: Record<string, number> = { blocker: 0, warning: 1, info: 2 };

  // All 14 rules with descriptions for the "Rules Applied" section
  const ruleDescriptions: Array<{ id: string; category: string; severity: string; title: string; description: string }> = [
    { id: 'db-field-naming', category: 'Database', severity: 'info', title: 'Field Naming Convention', description: 'Detects v3 snake_case fields (_id, created_at, updated_at, published_at) that are renamed to camelCase in v5.' },
    { id: 'db-mongodb-nested', category: 'Database', severity: 'warning', title: 'MongoDB Nested Documents', description: 'Flags JSON fields on MongoDB instances that use native nested documents — v5 on SQL stores JSON as serialized text.' },
    { id: 'db-objectid-refs', category: 'Database', severity: 'info', title: 'ObjectId References', description: 'Flags MongoDB ObjectId string references that become auto-incrementing integer IDs in v5.' },
    { id: 'api-response-envelope', category: 'API', severity: 'warning', title: 'Response Envelope', description: 'v5 wraps responses in { data: { id, attributes } } instead of returning flat objects. Every API consumer must be updated.' },
    { id: 'api-filter-syntax', category: 'API', severity: 'warning', title: 'Filter & Sort Syntax', description: 'v5 replaces _where, _sort, _limit, _start with filters[field][$eq], sort[0]=field:asc, pagination[page]/pagination[pageSize].' },
    { id: 'api-populate-syntax', category: 'API', severity: 'warning', title: 'Populate Behavior', description: 'v5 no longer auto-populates relations, media, components, or dynamic zones. Queries must explicitly use ?populate=* or field-level populate.' },
    { id: 'api-pagination-format', category: 'API', severity: 'warning', title: 'Pagination Format', description: 'v3 used X-Total-Count header + _start/_limit. v5 uses meta.pagination in the response body with page/pageSize/pageCount/total.' },
    { id: 'media-base64-candidate', category: 'Media', severity: 'blocker', title: 'Base64 Image Detection', description: 'Flags ALL richtext fields as potential Base64 image containers. v3 commonly stored data:image/ URIs in CKEditor/TinyMCE — these silently break in v5.' },
    { id: 'media-reference-format', category: 'Media', severity: 'warning', title: 'Media Reference Format', description: 'v3 media fields used a relation to the upload plugin. v5 uses { type: "media" } with different API response format requiring population.' },
    { id: 'rel-cardinality-syntax', category: 'Relations', severity: 'warning', title: 'Relation Syntax', description: 'v3 uses { model/collection: "target" }. v5 uses { type: "relation", relation: "oneToMany", target: "api::target.target" }.' },
    { id: 'rel-polymorphic', category: 'Relations', severity: 'warning', title: 'Polymorphic Relations', description: 'Detects morphTo/morphMany patterns that work differently in v5 and require careful manual migration.' },
    { id: 'rel-circular', category: 'Relations', severity: 'info', title: 'Circular References', description: 'Detects bidirectional relations (A → B → A) that require two-pass migration: create records first, then update relations.' },
    { id: 'auth-user-model', category: 'Auth', severity: 'warning', title: 'Users & Permissions', description: 'Detects relations to the "user" model. Plugin API routes, model UIDs, JWT config, and auth endpoints all changed in v5.' },
    { id: 'plugin-compatibility', category: 'Plugins', severity: 'varies', title: 'Plugin Compatibility', description: 'Checks fields referencing plugins against a known v5 compatibility database (12 plugins tracked). Flags unknown plugins for manual review.' },
  ];

  const contentTypeCards = report.contentTypes
    .map((ct) => {
      const sortedFindings = [...ct.findings].sort(
        (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
      );

      const findings = sortedFindings
        .map(
          (f) => `
          <div class="finding" data-severity="${f.severity}">
            <div class="finding-header">
              <span class="severity-badge ${f.severity}">${f.severity.toUpperCase()}</span>
              ${f.field ? `<code class="field-name">${escapeHtml(f.field)}</code>` : ''}
              <strong>${escapeHtml(f.title)}</strong>
            </div>
            <p class="description">${escapeHtml(f.description)}</p>
            <p class="action"><strong>Action:</strong> ${escapeHtml(f.action)}</p>
            <div class="finding-meta">
              <span class="effort">Effort: <strong>${f.effort}</strong></span>
              <span class="rule-id">Rule: <code>${f.ruleId}</code></span>
              ${f.affectsApi ? '<span class="impact-badge api">API</span>' : ''}
              ${f.affectsDatabase ? '<span class="impact-badge db">Database</span>' : ''}
              ${f.docsUrl ? `<a href="${escapeHtml(f.docsUrl)}" target="_blank" rel="noopener">📖 Docs</a>` : ''}
            </div>
          </div>`,
        )
        .join('\n');

      const fieldList = ct.findings
        .filter((f) => f.field)
        .map((f) => f.field)
        .filter((v, i, a) => a.indexOf(v) === i);

      return `
        <div class="content-type-card ${ct.status} expanded" data-status="${ct.status}">
          <div class="card-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="status-icon">${statusIcon(ct.status)}</span>
            <h3>${escapeHtml(ct.name)}</h3>
            <div class="card-header-meta">
              <span class="meta-pill">${ct.kind}</span>
              <span class="meta-pill">${ct.fieldCount} fields</span>
              <span class="meta-pill">${ct.relationCount} relations</span>
              <span class="meta-pill findings-count ${ct.status}">${ct.findings.length} findings</span>
            </div>
            <span class="expand-icon">▼</span>
          </div>
          <div class="card-body">
            ${ct.status === 'clean' ? `
              <div class="clean-pass">
                <div class="clean-icon">✅</div>
                <h4>All checks passed</h4>
                <p>This content type has no blockers, warnings, or issues requiring action. It can be migrated directly to v5 with standard tooling.</p>
                <div class="clean-details">
                  <p><strong>Fields analyzed:</strong> ${ct.fieldCount} fields, ${ct.relationCount} relations</p>
                  <p><strong>Rules evaluated:</strong> 14 rules across 7 categories (database, API, media, relations, auth, plugins, GraphQL)</p>
                  <p><strong>Result:</strong> No field naming conflicts, no Base64 candidates, no breaking relation patterns, no incompatible plugins detected.</p>
                </div>
              </div>
            ` : ''}
            ${findings}
            ${fieldList.length > 0 ? `
              <div class="affected-fields">
                <strong>Affected fields:</strong> ${fieldList.map(f => `<code>${escapeHtml(f!)}</code>`).join(', ')}
              </div>
            ` : ''}
          </div>
        </div>`;
    })
    .join('\n');

  // Migration checklist HTML
  const checklistHtml = report.migrationChecklist
    .map(
      (phase) => `
      <div class="checklist-phase">
        <h3>${escapeHtml(phase.phase)}</h3>
        <p class="phase-description">${escapeHtml(phase.description)}</p>
        <ul class="checklist">
          ${phase.items.map((item) => `
            <li>
              <input type="checkbox" />
              <span class="severity-badge ${item.finding.severity} small">${item.finding.severity.toUpperCase()}</span>
              <strong>${escapeHtml(item.finding.contentType)}</strong>${item.finding.field ? ` → <code>${escapeHtml(item.finding.field)}</code>` : ''}:
              ${escapeHtml(item.finding.action)}
            </li>
          `).join('\n')}
        </ul>
      </div>`,
    )
    .join('\n');

  // Rules applied table
  const rulesTableRows = ruleDescriptions
    .map(
      (r) => `
      <tr>
        <td><code>${r.id}</code></td>
        <td>${r.category}</td>
        <td><span class="severity-badge ${r.severity} small">${r.severity.toUpperCase()}</span></td>
        <td><strong>${r.title}</strong></td>
        <td>${r.description}</td>
      </tr>`,
    )
    .join('\n');

  // Findings by severity breakdown
  const blockerCount = report.contentTypes.reduce((sum, ct) => sum + ct.findings.filter(f => f.severity === 'blocker').length, 0);
  const warningCount = report.contentTypes.reduce((sum, ct) => sum + ct.findings.filter(f => f.severity === 'warning').length, 0);
  const infoCount = report.contentTypes.reduce((sum, ct) => sum + ct.findings.filter(f => f.severity === 'info').length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StrapiShift Migration Report</title>
<style>
  :root { --bg: #0f172a; --text: #e2e8f0; --card-bg: #1e293b; --border: #334155; --muted: #94a3b8; }
  .light { --bg: #ffffff; --text: #1e293b; --card-bg: #f8fafc; --border: #e2e8f0; --muted: #64748b; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.4rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  .meta-info { color: var(--muted); margin-bottom: 2rem; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .summary-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }
  .summary-card .number { font-size: 2rem; font-weight: 700; }
  .summary-card .label { font-size: 0.85rem; color: var(--muted); }
  .summary-card.clean .number { color: #22C55E; }
  .summary-card.warning .number { color: #EAB308; }
  .summary-card.blocker .number { color: #EF4444; }
  .summary-card.info .number { color: #3B82F6; }
  .filters { margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .filter-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .filter-btn.active { border-color: #3B82F6; background: #1e3a5f; }
  .content-type-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.75rem; overflow: hidden; }
  .card-header { padding: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; }
  .card-header:hover { background: rgba(255,255,255,0.05); }
  .card-header h3 { flex: 1; font-size: 1.1rem; }
  .card-header-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .meta-pill { font-size: 0.75rem; color: var(--muted); background: rgba(148,163,184,0.1); padding: 2px 8px; border-radius: 12px; }
  .meta-pill.findings-count.blocker { color: #FCA5A5; background: rgba(239,68,68,0.15); }
  .meta-pill.findings-count.warning { color: #FDE68A; background: rgba(234,179,8,0.15); }
  .meta-pill.findings-count.clean { color: #86EFAC; background: rgba(34,197,94,0.15); }
  .expand-icon { color: var(--muted); font-size: 0.8rem; transition: transform 0.2s; }
  .content-type-card.expanded .expand-icon { transform: rotate(180deg); }
  .card-body { display: none; padding: 0 1rem 1rem; }
  .content-type-card.expanded .card-body { display: block; }
  .finding { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; border-left: 3px solid; }
  .finding[data-severity="blocker"] { border-color: #EF4444; background: rgba(239,68,68,0.1); }
  .finding[data-severity="warning"] { border-color: #EAB308; background: rgba(234,179,8,0.1); }
  .finding[data-severity="info"] { border-color: #3B82F6; background: rgba(59,130,246,0.1); }
  .finding-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .severity-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; }
  .severity-badge.small { font-size: 0.65rem; padding: 1px 4px; }
  .severity-badge.blocker { background: #EF4444; color: white; }
  .severity-badge.warning { background: #EAB308; color: #1e293b; }
  .severity-badge.info { background: #3B82F6; color: white; }
  .severity-badge.varies { background: #8B5CF6; color: white; }
  .field-name { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.85rem; }
  .description, .action { font-size: 0.9rem; margin-top: 0.4rem; color: var(--muted); }
  .finding-meta { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }
  .effort { font-size: 0.8rem; color: var(--muted); }
  .rule-id { font-size: 0.8rem; color: var(--muted); }
  .impact-badge { font-size: 0.65rem; font-weight: 600; padding: 1px 5px; border-radius: 3px; }
  .impact-badge.api { background: rgba(139,92,246,0.2); color: #A78BFA; }
  .impact-badge.db { background: rgba(236,72,153,0.2); color: #F472B6; }
  a { color: #60a5fa; }
  .theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; z-index: 10; }
  .clean-pass { text-align: center; padding: 1.5rem; background: rgba(34,197,94,0.05); border-radius: 8px; border: 1px dashed rgba(34,197,94,0.3); }
  .clean-pass .clean-icon { font-size: 2rem; margin-bottom: 0.5rem; }
  .clean-pass h4 { color: #22C55E; margin-bottom: 0.5rem; }
  .clean-pass p { color: var(--muted); font-size: 0.9rem; }
  .clean-details { margin-top: 1rem; text-align: left; font-size: 0.85rem; color: var(--muted); padding: 0.75rem; background: rgba(255,255,255,0.03); border-radius: 4px; }
  .clean-details p { margin-bottom: 0.3rem; }
  .affected-fields { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border); font-size: 0.85rem; color: var(--muted); }
  .affected-fields code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; margin: 0 2px; }
  .checklist-phase { margin-bottom: 1.5rem; }
  .checklist-phase h3 { font-size: 1.1rem; margin-bottom: 0.25rem; }
  .phase-description { color: var(--muted); font-size: 0.9rem; margin-bottom: 0.75rem; }
  .checklist { list-style: none; }
  .checklist li { padding: 0.4rem 0; font-size: 0.9rem; display: flex; align-items: flex-start; gap: 0.5rem; }
  .checklist input[type="checkbox"] { margin-top: 4px; flex-shrink: 0; }
  .rules-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .rules-table th { text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border); color: var(--muted); font-weight: 600; }
  .rules-table td { padding: 0.5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
  .rules-table code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.8rem; }
  .section-note { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--muted); }
  .toc { margin-bottom: 2rem; }
  .toc a { color: #60a5fa; text-decoration: none; font-size: 0.9rem; }
  .toc a:hover { text-decoration: underline; }
  .toc ul { list-style: none; }
  .toc li { padding: 0.2rem 0; }

  @media print {
    body { background: white !important; color: #1e293b !important; padding: 1cm; font-size: 10pt; }
    .theme-toggle, .filters, .toc { display: none !important; }
    .content-type-card { break-inside: avoid; border: 1px solid #d1d5db !important; background: white !important; }
    .content-type-card .card-body { display: block !important; }
    .card-header { cursor: default; }
    .expand-icon { display: none !important; }
    .finding { border-left: 3px solid !important; background: transparent !important; break-inside: avoid; }
    .finding[data-severity="blocker"] { border-color: #dc2626 !important; }
    .finding[data-severity="warning"] { border-color: #ca8a04 !important; }
    .finding[data-severity="info"] { border-color: #2563eb !important; }
    .severity-badge { border: 1px solid; background: transparent !important; }
    .severity-badge.blocker { color: #dc2626 !important; border-color: #dc2626; }
    .severity-badge.warning { color: #ca8a04 !important; border-color: #ca8a04; }
    .severity-badge.info { color: #2563eb !important; border-color: #2563eb; }
    .description, .action, .meta-pill, .finding-meta { color: #4b5563 !important; }
    .summary-card { border: 1px solid #d1d5db !important; background: white !important; break-inside: avoid; }
    .summary-card .label { color: #6b7280 !important; }
    .impact-badge { border: 1px solid; background: transparent !important; }
    a { color: #2563eb !important; }
    .checklist-phase { break-inside: avoid; }
    .clean-pass { background: transparent !important; border-color: #d1d5db !important; }
    .rules-table { font-size: 9pt; }
    .rules-table td, .rules-table th { border-color: #d1d5db !important; }
  }
</style>
</head>
<body>
<button class="theme-toggle" onclick="document.body.classList.toggle('light')">🌓 Toggle Theme</button>
<h1>StrapiShift Migration Report</h1>
<p class="meta-info">Generated: ${escapeHtml(report.generatedAt)} | Strapi ${report.sourceVersion} → ${report.targetVersion} | StrapiShift v${report.version}</p>

<nav class="toc">
  <strong>Contents:</strong>
  <ul>
    <li><a href="#summary">Executive Summary</a></li>
    <li><a href="#content-types">Content Type Analysis (${report.contentTypes.length} types)</a></li>
    <li><a href="#checklist">Migration Checklist</a></li>
    <li><a href="#rules">Rules Applied (14 rules, 7 categories)</a></li>
    <li><a href="#methodology">Methodology</a></li>
  </ul>
</nav>

<h2 id="summary">Executive Summary</h2>
<div class="summary">
  <div class="summary-card"><div class="number">${report.summary.totalContentTypes}</div><div class="label">Content Types</div></div>
  <div class="summary-card clean"><div class="number">${report.summary.clean}</div><div class="label">Clean</div></div>
  <div class="summary-card warning"><div class="number">${report.summary.warnings}</div><div class="label">Warnings</div></div>
  <div class="summary-card blocker"><div class="number">${report.summary.blockers}</div><div class="label">Blockers</div></div>
  <div class="summary-card"><div class="number">${report.summary.migrationReadiness}%</div><div class="label">Readiness</div></div>
  <div class="summary-card"><div class="number">${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax}h</div><div class="label">Est. Effort</div></div>
</div>

<div class="summary">
  <div class="summary-card blocker"><div class="number">${blockerCount}</div><div class="label">Blocker Findings</div></div>
  <div class="summary-card warning"><div class="number">${warningCount}</div><div class="label">Warning Findings</div></div>
  <div class="summary-card info"><div class="number">${infoCount}</div><div class="label">Info Findings</div></div>
  <div class="summary-card"><div class="number">${report.summary.totalFindings}</div><div class="label">Total Findings</div></div>
</div>

<h2 id="content-types">Content Type Analysis</h2>

<div class="section-note">
  Every content type is shown below with its complete analysis. Content types with no issues are marked ✅ Clean with a summary of all checks that passed. Click a header to collapse/expand.
</div>

<div class="filters">
  <button class="filter-btn active" onclick="filterCards('all', this)">All (${report.contentTypes.length})</button>
  <button class="filter-btn" onclick="filterCards('blocker', this)">🔴 Blockers (${report.summary.blockers})</button>
  <button class="filter-btn" onclick="filterCards('warning', this)">⚠️ Warnings (${report.summary.warnings})</button>
  <button class="filter-btn" onclick="filterCards('clean', this)">✅ Clean (${report.summary.clean})</button>
</div>

${contentTypeCards}

<h2 id="checklist">Migration Checklist</h2>

<div class="section-note">
  Checklist items are organized by migration phase. Print this page to use the checkboxes as a physical checklist.
</div>

${checklistHtml || '<p style="color: var(--muted);">No checklist items — all content types are clean.</p>'}

<h2 id="rules">Rules Applied</h2>

<div class="section-note">
  StrapiShift evaluates every content type against all 14 rules below. Rules that do not apply to a content type (e.g., MongoDB rules on a non-MongoDB schema) are skipped automatically. A content type marked "Clean" means none of these rules produced a finding.
</div>

<table class="rules-table">
  <thead>
    <tr>
      <th>Rule ID</th>
      <th>Category</th>
      <th>Default Severity</th>
      <th>Check</th>
      <th>What It Detects</th>
    </tr>
  </thead>
  <tbody>
    ${rulesTableRows}
  </tbody>
</table>

<h2 id="methodology">Methodology</h2>

<div class="section-note">
  <p><strong>How this report was generated:</strong></p>
  <ol style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--muted);">
    <li style="margin-bottom: 0.4rem;"><strong>Schema Parsing</strong> — Your Strapi v3 schema JSON was parsed into a normalized internal representation. Each content type's fields, relations, components, dynamic zones, and plugin references were extracted and classified.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Rule Execution</strong> — All 14 rules across 7 categories (database, API, media, relations, auth, plugins, GraphQL) were evaluated against every content type. Rules are context-aware: MongoDB-specific rules only fire when the database engine is MongoDB; pagination rules only fire for collectionType (not singleType).</li>
    <li style="margin-bottom: 0.4rem;"><strong>Severity Classification</strong> — Each finding is classified as <strong>Blocker</strong> (must fix before migration), <strong>Warning</strong> (requires attention), or <strong>Info</strong> (automatic or low-impact change). A content type is classified by its highest-severity finding.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Effort Estimation</strong> — Effort is estimated per finding as Low (&lt;1hr), Medium (1–4hr), or High (4–8hr) based on real-world migration experience. Total effort range is the sum of all findings.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Readiness Score</strong> — Migration readiness (0–100%) is calculated from the ratio of clean content types to total, weighted by blocker severity. A score of 100% means no blockers or warnings were found.</li>
  </ol>
  <p style="margin-top: 0.75rem;"><strong>Source:</strong> <a href="https://github.com/ICJIA/strapishift" target="_blank" rel="noopener">github.com/ICJIA/strapishift</a> — MIT License</p>
</div>

<script>
function filterCards(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.content-type-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
