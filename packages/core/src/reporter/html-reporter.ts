import type { MigrationReport } from './types.js';

const SEVERITY_COLORS = {
  blocker: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', darkBg: '#450A0A', darkBorder: '#F87171', darkText: '#FCA5A5' },
  warning: { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E', darkBg: '#422006', darkBorder: '#FACC15', darkText: '#FDE68A' },
  info: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', darkBg: '#172554', darkBorder: '#60A5FA', darkText: '#93C5FD' },
  clean: { bg: '#DCFCE7', border: '#22C55E', text: '#166534', darkBg: '#052E16', darkBorder: '#4ADE80', darkText: '#86EFAC' },
};

/**
 * Generate a self-contained HTML report.
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

  const contentTypeCards = report.contentTypes
    .map((ct) => {
      const findings = ct.findings
        .map(
          (f) => `
          <div class="finding" data-severity="${f.severity}">
            <span class="severity-badge ${f.severity}">${f.severity.toUpperCase()}</span>
            ${f.field ? `<code class="field-name">${f.field}</code>` : ''}
            <strong>${escapeHtml(f.title)}</strong>
            <p class="description">${escapeHtml(f.description)}</p>
            <p class="action"><strong>Action:</strong> ${escapeHtml(f.action)}</p>
            <span class="effort">Effort: ${f.effort}</span>
            ${f.docsUrl ? `<a href="${escapeHtml(f.docsUrl)}" target="_blank" rel="noopener">Docs</a>` : ''}
          </div>`,
        )
        .join('\n');

      return `
        <div class="content-type-card ${ct.status}" data-status="${ct.status}">
          <div class="card-header" onclick="this.parentElement.classList.toggle('expanded')">
            <span class="status-icon">${statusIcon(ct.status)}</span>
            <h3>${escapeHtml(ct.name)}</h3>
            <span class="meta">${ct.fieldCount} fields, ${ct.relationCount} relations, ${ct.findings.length} findings</span>
          </div>
          <div class="card-body">
            ${findings || '<p class="no-findings">No issues found</p>'}
          </div>
        </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StrapiShift Migration Report</title>
<style>
  :root { --bg: #0f172a; --text: #e2e8f0; --card-bg: #1e293b; --border: #334155; }
  .light { --bg: #ffffff; --text: #1e293b; --card-bg: #f8fafc; --border: #e2e8f0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 2rem; max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
  .meta-info { color: #94a3b8; margin-bottom: 2rem; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .summary-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }
  .summary-card .number { font-size: 2rem; font-weight: 700; }
  .summary-card .label { font-size: 0.85rem; color: #94a3b8; }
  .summary-card.clean .number { color: #22C55E; }
  .summary-card.warning .number { color: #EAB308; }
  .summary-card.blocker .number { color: #EF4444; }
  .filters { margin-bottom: 1.5rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .filter-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
  .filter-btn.active { border-color: #3B82F6; background: #1e3a5f; }
  .content-type-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.75rem; overflow: hidden; }
  .card-header { padding: 1rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; }
  .card-header:hover { background: rgba(255,255,255,0.05); }
  .card-header h3 { flex: 1; font-size: 1.1rem; }
  .card-header .meta { font-size: 0.8rem; color: #94a3b8; }
  .card-body { display: none; padding: 0 1rem 1rem; }
  .content-type-card.expanded .card-body { display: block; }
  .finding { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; border-left: 3px solid; }
  .finding[data-severity="blocker"] { border-color: #EF4444; background: rgba(239,68,68,0.1); }
  .finding[data-severity="warning"] { border-color: #EAB308; background: rgba(234,179,8,0.1); }
  .finding[data-severity="info"] { border-color: #3B82F6; background: rgba(59,130,246,0.1); }
  .severity-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; margin-right: 0.5rem; }
  .severity-badge.blocker { background: #EF4444; color: white; }
  .severity-badge.warning { background: #EAB308; color: #1e293b; }
  .severity-badge.info { background: #3B82F6; color: white; }
  .field-name { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.85rem; margin-right: 0.5rem; }
  .description, .action { font-size: 0.9rem; margin-top: 0.4rem; color: #94a3b8; }
  .effort { font-size: 0.8rem; color: #64748b; margin-right: 1rem; }
  a { color: #60a5fa; }
  .theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; z-index: 10; }

  @media print {
    body { background: white !important; color: #1e293b !important; padding: 1cm; }
    .theme-toggle, .filters { display: none !important; }
    .content-type-card { break-inside: avoid; border: 1px solid #d1d5db !important; background: white !important; }
    .content-type-card .card-body { display: block !important; }
    .card-header { cursor: default; }
    .finding { border-left: 3px solid !important; background: transparent !important; }
    .finding[data-severity="blocker"] { border-color: #dc2626 !important; }
    .finding[data-severity="warning"] { border-color: #ca8a04 !important; }
    .finding[data-severity="info"] { border-color: #2563eb !important; }
    .severity-badge { border: 1px solid; background: transparent !important; }
    .severity-badge.blocker { color: #dc2626 !important; border-color: #dc2626; }
    .severity-badge.warning { color: #ca8a04 !important; border-color: #ca8a04; }
    .severity-badge.info { color: #2563eb !important; border-color: #2563eb; }
    .description, .action, .meta { color: #4b5563 !important; }
    .summary-card { border: 1px solid #d1d5db !important; background: white !important; }
    .summary-card .label { color: #6b7280 !important; }
    a { color: #2563eb !important; }
  }
</style>
</head>
<body>
<button class="theme-toggle" onclick="document.body.classList.toggle('light')">🌓 Toggle Theme</button>
<h1>StrapiShift Migration Report</h1>
<p class="meta-info">Generated: ${escapeHtml(report.generatedAt)} | Strapi ${report.sourceVersion} → ${report.targetVersion} | v${report.version}</p>

<div class="summary">
  <div class="summary-card"><div class="number">${report.summary.totalContentTypes}</div><div class="label">Content Types</div></div>
  <div class="summary-card clean"><div class="number">${report.summary.clean}</div><div class="label">Clean</div></div>
  <div class="summary-card warning"><div class="number">${report.summary.warnings}</div><div class="label">Warnings</div></div>
  <div class="summary-card blocker"><div class="number">${report.summary.blockers}</div><div class="label">Blockers</div></div>
  <div class="summary-card"><div class="number">${report.summary.migrationReadiness}%</div><div class="label">Readiness</div></div>
  <div class="summary-card"><div class="number">${report.summary.estimatedEffort.totalHoursMin}–${report.summary.estimatedEffort.totalHoursMax}h</div><div class="label">Est. Effort</div></div>
</div>

<div class="filters">
  <button class="filter-btn active" onclick="filterCards('all', this)">All</button>
  <button class="filter-btn" onclick="filterCards('blocker', this)">🔴 Blockers</button>
  <button class="filter-btn" onclick="filterCards('warning', this)">⚠️ Warnings</button>
  <button class="filter-btn" onclick="filterCards('clean', this)">✅ Clean</button>
</div>

${contentTypeCards}

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
