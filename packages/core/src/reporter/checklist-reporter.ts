import type { MigrationReport, ChecklistPhase } from './types.js';
import type { ParityReport, ParityCheck } from '../parity/types.js';

// ── Migration Checklist Generators ──

/**
 * Generate a standalone JSON checklist from a migration report.
 * Designed for contract developers: actionable items only, no analysis detail.
 */
export function generateChecklistJson(report: MigrationReport): string {
  const checklist = {
    tool: 'strapishift',
    type: 'migration-checklist',
    version: report.version,
    generatedAt: report.generatedAt,
    source: `Strapi ${report.sourceVersion}`,
    target: `Strapi ${report.targetVersion}`,
    summary: {
      totalItems: report.migrationChecklist.reduce((sum, p) => sum + p.items.length, 0),
      phases: report.migrationChecklist.length,
      estimatedEffort: `${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax} hours`,
      migrationReadiness: `${report.summary.migrationReadiness}%`,
    },
    phases: report.migrationChecklist.map(phase => ({
      phase: phase.phase,
      description: phase.description,
      itemCount: phase.items.length,
      items: phase.items.map((item, i) => ({
        id: `${phase.phase.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i + 1}`,
        done: false,
        severity: item.finding.severity,
        contentType: item.finding.contentType,
        field: item.finding.field || null,
        title: item.finding.title,
        action: item.finding.action,
        effort: item.finding.effort,
        affectsApi: item.finding.affectsApi,
        affectsDatabase: item.finding.affectsDatabase,
        docsUrl: item.finding.docsUrl || null,
      })),
    })),
    reference: {
      fieldRenames: { '_id': 'id', 'created_at': 'createdAt', 'updated_at': 'updatedAt', 'published_at': 'publishedAt' },
      documentation: {
        breakingChanges: 'https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes',
        filters: 'https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication',
        populate: 'https://docs.strapi.io/dev-docs/api/rest/populate-select',
        pagination: 'https://docs.strapi.io/dev-docs/api/rest/sort-pagination',
        relations: 'https://docs.strapi.io/dev-docs/backend-customization/models#relations',
        media: 'https://docs.strapi.io/dev-docs/backend-customization/models#media',
      },
    },
  };

  return JSON.stringify(checklist, null, 2);
}

/**
 * Generate a standalone Markdown checklist from a migration report.
 */
export function generateChecklistMarkdown(report: MigrationReport): string {
  const lines: string[] = [];
  const totalItems = report.migrationChecklist.reduce((sum, p) => sum + p.items.length, 0);

  lines.push('# StrapiShift Migration Checklist');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt}  `);
  lines.push(`> Strapi ${report.sourceVersion} → ${report.targetVersion}  `);
  lines.push(`> ${totalItems} action items · ${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax} hours estimated`);
  lines.push('');

  if (report.migrationChecklist.length === 0) {
    lines.push('**No action items — all content types are clean.** ✅');
    lines.push('');
  }

  for (const phase of report.migrationChecklist) {
    lines.push(`## ${phase.phase}`);
    lines.push(`*${phase.description}*`);
    lines.push('');

    // Group items by content type
    const byContentType = new Map<string, typeof phase.items>();
    for (const item of phase.items) {
      const ct = item.finding.contentType;
      if (!byContentType.has(ct)) byContentType.set(ct, []);
      byContentType.get(ct)!.push(item);
    }

    for (const [contentType, items] of byContentType) {
      lines.push(`### ${contentType}`);
      lines.push('');
      for (const item of items) {
        const severity = item.finding.severity === 'blocker' ? '🔴' : item.finding.severity === 'warning' ? '⚠️' : 'ℹ️';
        const field = item.finding.field ? ` → \`${item.finding.field}\`` : '';
        lines.push(`- [ ] ${severity} **${item.finding.title}**${field}`);
        lines.push(`  - **Action:** ${item.finding.action}`);
        lines.push(`  - **Effort:** ${item.finding.effort} · **Affects:** ${[item.finding.affectsApi ? 'API' : '', item.finding.affectsDatabase ? 'Database' : ''].filter(Boolean).join(', ') || 'N/A'}`);
        if (item.finding.docsUrl) lines.push(`  - **Docs:** ${item.finding.docsUrl}`);
      }
      lines.push('');
    }
  }

  // Quick reference
  lines.push('---');
  lines.push('');
  lines.push('## Quick Reference');
  lines.push('');
  lines.push('### v3 → v5 Field Renames');
  lines.push('| v3 | v5 |');
  lines.push('|----|-----|');
  lines.push('| `_id` | `id` |');
  lines.push('| `created_at` | `createdAt` |');
  lines.push('| `updated_at` | `updatedAt` |');
  lines.push('| `published_at` | `publishedAt` |');
  lines.push('');
  lines.push('### v3 → v5 API Changes');
  lines.push('```');
  lines.push('Filters:    _where[field]=value  →  filters[field][$eq]=value');
  lines.push('Sort:       _sort=field:DESC     →  sort[0]=field:desc');
  lines.push('Pagination: _limit=10&_start=0   →  pagination[page]=1&pagination[pageSize]=10');
  lines.push('Populate:   (auto)               →  ?populate=* (explicit)');
  lines.push('Response:   { id, ...fields }    →  { data: { id, attributes: {...} } }');
  lines.push('```');
  lines.push('');
  lines.push('### Key Documentation');
  lines.push('- [Breaking Changes](https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes)');
  lines.push('- [REST Filters](https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication)');
  lines.push('- [Populate & Select](https://docs.strapi.io/dev-docs/api/rest/populate-select)');
  lines.push('- [Pagination](https://docs.strapi.io/dev-docs/api/rest/sort-pagination)');
  lines.push('- [Relations](https://docs.strapi.io/dev-docs/backend-customization/models#relations)');
  lines.push('- [Media](https://docs.strapi.io/dev-docs/backend-customization/models#media)');
  lines.push('');
  lines.push('---');
  lines.push('*Generated by [StrapiShift](https://github.com/ICJIA/strapishift)*');

  return lines.join('\n');
}

/**
 * Generate a standalone HTML checklist from a migration report.
 * Printable, interactive (checkboxes with localStorage persistence).
 */
export function generateChecklistHtml(report: MigrationReport): string {
  const totalItems = report.migrationChecklist.reduce((sum, p) => sum + p.items.length, 0);

  const phaseSections = report.migrationChecklist.map((phase, pi) => {
    const byContentType = new Map<string, typeof phase.items>();
    for (const item of phase.items) {
      const ct = item.finding.contentType;
      if (!byContentType.has(ct)) byContentType.set(ct, []);
      byContentType.get(ct)!.push(item);
    }

    let itemIndex = 0;
    const ctSections = Array.from(byContentType.entries()).map(([ct, items]) => {
      const itemRows = items.map(item => {
        const id = `phase-${pi}-item-${itemIndex++}`;
        const severity = item.finding.severity;
        const severityLabel = severity === 'blocker' ? '🔴 BLOCKER' : severity === 'warning' ? '⚠️ WARNING' : 'ℹ️ INFO';
        return `
          <div class="checklist-item" data-id="${id}">
            <label class="item-row">
              <input type="checkbox" id="${id}" onchange="toggleItem('${id}', this.checked)" />
              <div class="item-content">
                <div class="item-header">
                  <span class="severity-badge ${severity}">${severityLabel}</span>
                  ${item.finding.field ? `<code class="field-name">${escapeHtml(item.finding.field)}</code>` : ''}
                  <strong>${escapeHtml(item.finding.title)}</strong>
                </div>
                <div class="item-action"><strong>Action:</strong> ${escapeHtml(item.finding.action)}</div>
                <div class="item-meta">
                  <span>Effort: <strong>${item.finding.effort}</strong></span>
                  ${item.finding.affectsApi ? '<span class="impact api">API</span>' : ''}
                  ${item.finding.affectsDatabase ? '<span class="impact db">Database</span>' : ''}
                  ${item.finding.docsUrl ? `<a href="${escapeHtml(item.finding.docsUrl)}" target="_blank" rel="noopener">📖 Docs</a>` : ''}
                </div>
              </div>
            </label>
          </div>`;
      }).join('');

      return `
        <div class="content-type-group">
          <h4>${escapeHtml(ct)}</h4>
          ${itemRows}
        </div>`;
    }).join('');

    return `
      <div class="phase">
        <div class="phase-header">
          <h3>${escapeHtml(phase.phase)}</h3>
          <span class="phase-count">${phase.items.length} items</span>
        </div>
        <p class="phase-description">${escapeHtml(phase.description)}</p>
        ${ctSections}
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StrapiShift Migration Checklist</title>
<style>
  :root { --bg: #0f172a; --text: #e2e8f0; --card-bg: #1e293b; --border: #334155; --muted: #94a3b8; --check: #22C55E; }
  .light { --bg: #fff; --text: #1e293b; --card-bg: #f8fafc; --border: #e2e8f0; --muted: #64748b; --check: #16a34a; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h3 { font-size: 1.2rem; }
  h4 { font-size: 1rem; color: var(--muted); margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid var(--border); }
  .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
  .progress-bar { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
  .progress-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--check); border-radius: 4px; transition: width 0.3s; }
  .progress-text { font-size: 0.9rem; font-weight: 600; min-width: 80px; text-align: right; }
  .phase { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
  .phase-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
  .phase-count { font-size: 0.8rem; color: var(--muted); background: rgba(148,163,184,0.1); padding: 2px 8px; border-radius: 12px; }
  .phase-description { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; }
  .checklist-item { padding: 0.5rem 0; border-bottom: 1px solid rgba(148,163,184,0.1); }
  .checklist-item:last-child { border-bottom: none; }
  .checklist-item.done { opacity: 0.5; }
  .checklist-item.done .item-header strong { text-decoration: line-through; }
  .item-row { display: flex; gap: 0.75rem; cursor: pointer; align-items: flex-start; }
  .item-row input[type="checkbox"] { margin-top: 4px; flex-shrink: 0; width: 16px; height: 16px; accent-color: var(--check); }
  .item-content { flex: 1; }
  .item-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.9rem; }
  .item-action { font-size: 0.85rem; color: var(--muted); margin-top: 0.3rem; }
  .item-meta { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.3rem; font-size: 0.8rem; color: var(--muted); flex-wrap: wrap; }
  .severity-badge { font-size: 0.7rem; font-weight: 700; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
  .severity-badge.blocker { background: #EF4444; color: white; }
  .severity-badge.warning { background: #EAB308; color: #1e293b; }
  .severity-badge.info { background: #3B82F6; color: white; }
  .field-name { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.8rem; font-family: monospace; }
  .impact { font-size: 0.65rem; font-weight: 600; padding: 1px 5px; border-radius: 3px; }
  .impact.api { background: rgba(139,92,246,0.2); color: #A78BFA; }
  .impact.db { background: rgba(236,72,153,0.2); color: #F472B6; }
  a { color: #60a5fa; font-size: 0.8rem; }
  .theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; z-index: 10; font-size: 0.85rem; }
  .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
  .toolbar button { background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.3rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
  .toolbar button:hover { border-color: #3B82F6; }
  .reference { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-top: 2rem; }
  .reference h3 { margin-bottom: 1rem; }
  .reference table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1rem; }
  .reference th, .reference td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); }
  .reference th { color: var(--muted); font-weight: 600; }
  .reference code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.8rem; }
  .reference pre { background: rgba(0,0,0,0.2); padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin-bottom: 1rem; }

  @media print {
    body { background: white !important; color: #1e293b !important; padding: 1cm; font-size: 10pt; }
    .theme-toggle, .toolbar { display: none !important; }
    .phase { background: white !important; border: 1px solid #d1d5db !important; break-inside: avoid; }
    .checklist-item { break-inside: avoid; }
    .severity-badge { border: 1px solid; background: transparent !important; }
    .severity-badge.blocker { color: #dc2626 !important; border-color: #dc2626; }
    .severity-badge.warning { color: #ca8a04 !important; border-color: #ca8a04; }
    .severity-badge.info { color: #2563eb !important; border-color: #2563eb; }
    .item-action, .item-meta, .meta, .phase-description { color: #4b5563 !important; }
    .progress-bar { border-color: #d1d5db !important; background: white !important; }
    .reference { background: white !important; border-color: #d1d5db !important; }
    input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1.5px solid #6b7280; display: inline-block; vertical-align: middle; }
  }
</style>
</head>
<body>
<button class="theme-toggle" onclick="document.body.classList.toggle('light')">🌓 Theme</button>
<h1>StrapiShift Migration Checklist</h1>
<p class="meta">
  Generated: ${escapeHtml(report.generatedAt)} · Strapi ${report.sourceVersion} → ${report.targetVersion} · StrapiShift v${report.version}<br>
  ${totalItems} action items · ${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax} hours estimated · ${report.summary.migrationReadiness}% readiness
</p>

<div class="progress-bar">
  <span style="font-size:0.85rem;">Progress:</span>
  <div class="progress-track"><div class="progress-fill" id="progress-fill" style="width: 0%"></div></div>
  <div class="progress-text" id="progress-text">0 / ${totalItems}</div>
</div>

<div class="toolbar">
  <button onclick="checkAll(true)">Check All</button>
  <button onclick="checkAll(false)">Uncheck All</button>
  <button onclick="window.print()">Print</button>
</div>

${phaseSections || '<div class="phase"><p style="text-align:center;color:var(--muted);padding:2rem;">No action items — all content types are clean. ✅</p></div>'}

<div class="reference">
  <h3>Quick Reference</h3>
  <table>
    <thead><tr><th>v3 Field</th><th>v5 Field</th></tr></thead>
    <tbody>
      <tr><td><code>_id</code></td><td><code>id</code></td></tr>
      <tr><td><code>created_at</code></td><td><code>createdAt</code></td></tr>
      <tr><td><code>updated_at</code></td><td><code>updatedAt</code></td></tr>
      <tr><td><code>published_at</code></td><td><code>publishedAt</code></td></tr>
    </tbody>
  </table>
  <pre>Filters:    _where[field]=value  →  filters[field][$eq]=value
Sort:       _sort=field:DESC     →  sort[0]=field:desc
Pagination: _limit=10&_start=0   →  pagination[page]=1&pagination[pageSize]=10
Populate:   (auto)               →  ?populate=* (explicit)
Response:   { id, ...fields }    →  { data: { id, attributes: {...} } }</pre>
  <p style="font-size:0.8rem;color:var(--muted);">
    <a href="https://docs.strapi.io/dev-docs/migration/v4-to-v5/breaking-changes">Breaking Changes</a> ·
    <a href="https://docs.strapi.io/dev-docs/api/rest/filters-locale-publication">Filters</a> ·
    <a href="https://docs.strapi.io/dev-docs/api/rest/populate-select">Populate</a> ·
    <a href="https://docs.strapi.io/dev-docs/api/rest/sort-pagination">Pagination</a> ·
    <a href="https://docs.strapi.io/dev-docs/backend-customization/models#relations">Relations</a> ·
    <a href="https://docs.strapi.io/dev-docs/backend-customization/models#media">Media</a>
  </p>
</div>

<p style="color:var(--muted);font-size:0.8rem;margin-top:1.5rem;">Generated by <a href="https://github.com/ICJIA/strapishift">StrapiShift</a> — MIT License</p>

<script>
const STORAGE_KEY = 'strapishift-checklist-' + '${report.generatedAt.replace(/[^a-z0-9]/gi, '')}';
const total = ${totalItems};

function toggleItem(id, checked) {
  const item = document.querySelector('[data-id="' + id + '"]');
  if (item) item.classList.toggle('done', checked);
  saveState();
  updateProgress();
}

function checkAll(checked) {
  document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => {
    cb.checked = checked;
    cb.closest('.checklist-item').classList.toggle('done', checked);
  });
  saveState();
  updateProgress();
}

function updateProgress() {
  const checked = document.querySelectorAll('.checklist-item input:checked').length;
  document.getElementById('progress-fill').style.width = total ? (checked / total * 100) + '%' : '0%';
  document.getElementById('progress-text').textContent = checked + ' / ' + total;
}

function saveState() {
  const state = {};
  document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => { state[cb.id] = cb.checked; });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.entries(state).forEach(([id, checked]) => {
      const cb = document.getElementById(id);
      if (cb) { cb.checked = checked; cb.closest('.checklist-item').classList.toggle('done', checked); }
    });
  } catch(e) {}
  updateProgress();
}

loadState();
</script>
</body>
</html>`;
}

// ── Parity Checklist Generators ──

/**
 * Generate a standalone JSON checklist from a parity report.
 */
export function generateParityChecklistJson(report: ParityReport): string {
  const failures = report.failures;
  const warnings = report.warningChecks;

  const checklist = {
    tool: 'strapishift',
    type: 'parity-checklist',
    version: report.version,
    generatedAt: report.generatedAt,
    parityScore: `${report.parityScore}%`,
    summary: {
      totalItems: failures.length + warnings.length,
      failures: failures.length,
      warnings: warnings.length,
    },
    fixItems: failures.map((c, i) => ({
      id: `fix-${i + 1}`,
      done: false,
      status: 'fail',
      category: c.category,
      contentType: c.contentType || null,
      field: c.field || null,
      message: c.message,
      v3Value: c.v3Value || null,
      v5Value: c.v5Value || null,
      action: getParityFixAction(c),
    })),
    reviewItems: warnings.map((c, i) => ({
      id: `review-${i + 1}`,
      done: false,
      status: 'warning',
      category: c.category,
      contentType: c.contentType || null,
      field: c.field || null,
      message: c.message,
      v3Value: c.v3Value || null,
      v5Value: c.v5Value || null,
      action: 'Review and verify manually.',
    })),
  };

  return JSON.stringify(checklist, null, 2);
}

/**
 * Generate a standalone Markdown checklist from a parity report.
 */
export function generateParityChecklistMarkdown(report: ParityReport): string {
  const lines: string[] = [];

  lines.push('# StrapiShift Parity Fix Checklist');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt}  `);
  lines.push(`> Parity Score: ${report.parityScore}%  `);
  lines.push(`> ${report.failures.length} fixes needed · ${report.warningChecks.length} warnings to review`);
  lines.push('');

  if (report.failures.length > 0) {
    lines.push('## Fixes Required');
    lines.push('');
    for (const check of report.failures) {
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- [ ] ❌ **${location || 'Schema'}**: ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`  - v3: \`${check.v3Value || '(none)'}\` → v5: \`${check.v5Value || '(none)'}\``);
      }
      lines.push(`  - **Action:** ${getParityFixAction(check)}`);
    }
    lines.push('');
  }

  if (report.warningChecks.length > 0) {
    lines.push('## Warnings to Review');
    lines.push('');
    for (const check of report.warningChecks) {
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- [ ] ⚠️ **${location || 'Schema'}**: ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`  - v3: \`${check.v3Value || '(none)'}\` → v5: \`${check.v5Value || '(none)'}\``);
      }
    }
    lines.push('');
  }

  if (report.failures.length === 0 && report.warningChecks.length === 0) {
    lines.push('**No action items — 100% parity achieved.** ✅');
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by [StrapiShift](https://github.com/ICJIA/strapishift)*');

  return lines.join('\n');
}

/**
 * Generate a standalone HTML checklist from a parity report.
 */
export function generateParityChecklistHtml(report: ParityReport): string {
  const totalItems = report.failures.length + report.warningChecks.length;

  const failureItems = report.failures.map((c, i) => {
    const id = `fix-${i}`;
    const location = [c.contentType, c.field].filter(Boolean).join('.');
    return `
      <div class="checklist-item" data-id="${id}">
        <label class="item-row">
          <input type="checkbox" id="${id}" onchange="toggleItem('${id}', this.checked)" />
          <div class="item-content">
            <div class="item-header">
              <span class="severity-badge fail">❌ FIX</span>
              <span class="category">${escapeHtml(c.category)}</span>
              <strong>${escapeHtml(location || 'Schema')}</strong>
            </div>
            <div class="item-message">${escapeHtml(c.message)}</div>
            ${c.v3Value || c.v5Value ? `<div class="item-values">v3: <code>${escapeHtml(c.v3Value || '(none)')}</code> → v5: <code>${escapeHtml(c.v5Value || '(none)')}</code></div>` : ''}
            <div class="item-action"><strong>Action:</strong> ${escapeHtml(getParityFixAction(c))}</div>
          </div>
        </label>
      </div>`;
  }).join('');

  const warningItems = report.warningChecks.map((c, i) => {
    const id = `warn-${i}`;
    const location = [c.contentType, c.field].filter(Boolean).join('.');
    return `
      <div class="checklist-item" data-id="${id}">
        <label class="item-row">
          <input type="checkbox" id="${id}" onchange="toggleItem('${id}', this.checked)" />
          <div class="item-content">
            <div class="item-header">
              <span class="severity-badge warning">⚠️ REVIEW</span>
              <span class="category">${escapeHtml(c.category)}</span>
              <strong>${escapeHtml(location || 'Schema')}</strong>
            </div>
            <div class="item-message">${escapeHtml(c.message)}</div>
            ${c.v3Value || c.v5Value ? `<div class="item-values">v3: <code>${escapeHtml(c.v3Value || '(none)')}</code> → v5: <code>${escapeHtml(c.v5Value || '(none)')}</code></div>` : ''}
          </div>
        </label>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StrapiShift Parity Fix Checklist</title>
<style>
  :root { --bg: #0f172a; --text: #e2e8f0; --card-bg: #1e293b; --border: #334155; --muted: #94a3b8; --check: #22C55E; }
  .light { --bg: #fff; --text: #1e293b; --card-bg: #f8fafc; --border: #e2e8f0; --muted: #64748b; --check: #16a34a; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; }
  .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; }
  .progress-bar { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; }
  .progress-track { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--check); border-radius: 4px; transition: width 0.3s; }
  .progress-text { font-size: 0.9rem; font-weight: 600; min-width: 80px; text-align: right; }
  .section { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
  .checklist-item { padding: 0.5rem 0; border-bottom: 1px solid rgba(148,163,184,0.1); }
  .checklist-item:last-child { border-bottom: none; }
  .checklist-item.done { opacity: 0.5; }
  .checklist-item.done .item-header strong { text-decoration: line-through; }
  .item-row { display: flex; gap: 0.75rem; cursor: pointer; align-items: flex-start; }
  .item-row input[type="checkbox"] { margin-top: 4px; flex-shrink: 0; width: 16px; height: 16px; accent-color: var(--check); }
  .item-content { flex: 1; }
  .item-header { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.9rem; }
  .item-message { font-size: 0.85rem; color: var(--muted); margin-top: 0.2rem; }
  .item-values { font-size: 0.8rem; color: var(--muted); margin-top: 0.2rem; }
  .item-action { font-size: 0.85rem; color: var(--muted); margin-top: 0.3rem; }
  .severity-badge { font-size: 0.7rem; font-weight: 700; padding: 1px 5px; border-radius: 3px; white-space: nowrap; }
  .severity-badge.fail { background: #EF4444; color: white; }
  .severity-badge.warning { background: #EAB308; color: #1e293b; }
  .category { font-size: 0.75rem; color: var(--muted); background: rgba(148,163,184,0.1); padding: 1px 6px; border-radius: 10px; }
  code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.8rem; }
  .theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; z-index: 10; font-size: 0.85rem; }

  @media print {
    body { background: white !important; color: #1e293b !important; padding: 1cm; }
    .theme-toggle { display: none !important; }
    .section { background: white !important; border-color: #d1d5db !important; break-inside: avoid; }
    .checklist-item { break-inside: avoid; }
    .severity-badge { border: 1px solid; background: transparent !important; }
    .severity-badge.fail { color: #dc2626 !important; border-color: #dc2626; }
    .severity-badge.warning { color: #ca8a04 !important; border-color: #ca8a04; }
    .item-message, .item-action, .item-values, .meta { color: #4b5563 !important; }
    input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1.5px solid #6b7280; display: inline-block; vertical-align: middle; }
  }
</style>
</head>
<body>
<button class="theme-toggle" onclick="document.body.classList.toggle('light')">🌓 Theme</button>
<h1>StrapiShift Parity Fix Checklist</h1>
<p class="meta">
  Generated: ${escapeHtml(report.generatedAt)} · Parity: ${report.parityScore}% · StrapiShift v${report.version}<br>
  ${report.failures.length} fixes needed · ${report.warningChecks.length} warnings to review
</p>

<div class="progress-bar">
  <span style="font-size:0.85rem;">Progress:</span>
  <div class="progress-track"><div class="progress-fill" id="progress-fill" style="width: 0%"></div></div>
  <div class="progress-text" id="progress-text">0 / ${totalItems}</div>
</div>

${report.failures.length > 0 ? `<div class="section"><h2>Fixes Required (${report.failures.length})</h2>${failureItems}</div>` : ''}
${report.warningChecks.length > 0 ? `<div class="section"><h2>Warnings to Review (${report.warningChecks.length})</h2>${warningItems}</div>` : ''}
${totalItems === 0 ? '<div class="section" style="text-align:center;padding:3rem;"><p style="font-size:1.2rem;">✅ No action items — 100% parity achieved.</p></div>' : ''}

<p style="color:var(--muted);font-size:0.8rem;margin-top:1.5rem;">Generated by <a href="https://github.com/ICJIA/strapishift" style="color:#60a5fa;">StrapiShift</a> — MIT License</p>

<script>
const STORAGE_KEY = 'strapishift-parity-checklist-' + '${report.generatedAt.replace(/[^a-z0-9]/gi, '')}';
const total = ${totalItems};

function toggleItem(id, checked) {
  const item = document.querySelector('[data-id="' + id + '"]');
  if (item) item.classList.toggle('done', checked);
  saveState(); updateProgress();
}

function updateProgress() {
  const checked = document.querySelectorAll('.checklist-item input:checked').length;
  document.getElementById('progress-fill').style.width = total ? (checked / total * 100) + '%' : '0%';
  document.getElementById('progress-text').textContent = checked + ' / ' + total;
}

function saveState() {
  const state = {};
  document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => { state[cb.id] = cb.checked; });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.entries(state).forEach(([id, checked]) => {
      const cb = document.getElementById(id);
      if (cb) { cb.checked = checked; cb.closest('.checklist-item').classList.toggle('done', checked); }
    });
  } catch(e) {}
  updateProgress();
}

loadState();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getParityFixAction(check: ParityCheck): string {
  switch (check.category) {
    case 'content-type-presence':
      return `Create the missing content type "${check.contentType}" in your v5 Strapi instance.`;
    case 'field-presence':
      return `Add the field "${check.field}" to "${check.contentType}" in v5. Check if it was renamed (e.g., created_at → createdAt).`;
    case 'field-type-compat':
      return `Field type changed from "${check.v3Value}" to "${check.v5Value}". Update the v5 schema or migrate the data.`;
    case 'relation-integrity':
      return `Fix the relation on "${check.contentType}.${check.field}". Ensure the target exists and relation type is correct.`;
    case 'component-integrity':
      return `Ensure the component/dynamic zone "${check.field}" on "${check.contentType}" exists in v5.`;
    default:
      return 'Review and fix manually.';
  }
}
