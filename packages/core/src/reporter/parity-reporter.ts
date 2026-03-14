import type { ParityReport, ParityCheck } from '../parity/types.js';

/**
 * Generate comprehensive JSON parity report with metadata.
 */
export function generateParityJson(report: ParityReport): string {
  const enriched = {
    ...report,
    _metadata: {
      description: 'StrapiShift parity verification report. Compares v3 source schema against v5 target schema to verify migration completeness.',
      checkCategories: {
        'content-type-presence': 'Verifies every v3 content type exists in the v5 schema.',
        'field-presence': 'Verifies every v3 field exists in the corresponding v5 content type.',
        'field-type-compat': 'Verifies field types are compatible between v3 and v5 (e.g., string→string, richtext→richtext).',
        'relation-integrity': 'Verifies relation targets exist and cardinality is compatible.',
        'component-integrity': 'Verifies components and dynamic zones are preserved.',
      },
      scoring: 'Parity score = (passed / total) × 100. A score of 100% means every v3 schema element has a corresponding v5 equivalent.',
    },
  };
  return JSON.stringify(enriched, null, 2);
}

/**
 * Generate comprehensive Markdown parity report.
 */
export function generateParityMarkdown(report: ParityReport): string {
  const lines: string[] = [];

  lines.push('# StrapiShift Parity Verification Report');
  lines.push('');
  lines.push(`> Generated: ${report.generatedAt}  `);
  lines.push(`> Source: Strapi ${report.sourceVersion} → Target: Strapi ${report.targetVersion}  `);
  lines.push(`> StrapiShift v${report.version}`);
  lines.push('');

  // Score
  const scoreEmoji = report.parityScore === 100 ? '🟢' : report.parityScore >= 80 ? '🟡' : '🔴';
  lines.push(`## ${scoreEmoji} Parity Score: ${report.parityScore}%`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Checks | ${report.totalChecks} |`);
  lines.push(`| Passed | ✅ ${report.passed} |`);
  lines.push(`| Failed | ❌ ${report.failed} |`);
  lines.push(`| Warnings | ⚠️ ${report.warnings} |`);
  lines.push('');

  // Checks by category
  const categories = ['content-type-presence', 'field-presence', 'field-type-compat', 'relation-integrity', 'component-integrity'] as const;
  const categoryLabels: Record<string, string> = {
    'content-type-presence': 'Content Type Presence',
    'field-presence': 'Field Presence',
    'field-type-compat': 'Field Type Compatibility',
    'relation-integrity': 'Relation Integrity',
    'component-integrity': 'Component Integrity',
  };
  const categoryDescriptions: Record<string, string> = {
    'content-type-presence': 'Verifies every v3 content type exists in the v5 schema.',
    'field-presence': 'Verifies every v3 field exists in the corresponding v5 content type.',
    'field-type-compat': 'Verifies field types are compatible between v3 and v5.',
    'relation-integrity': 'Verifies relation targets exist and cardinality is compatible.',
    'component-integrity': 'Verifies components and dynamic zones are preserved.',
  };

  lines.push('## Results by Category');
  lines.push('');
  for (const cat of categories) {
    const catChecks = report.checks.filter(c => c.category === cat);
    if (catChecks.length === 0) continue;
    const passed = catChecks.filter(c => c.status === 'pass').length;
    const failed = catChecks.filter(c => c.status === 'fail').length;
    const warned = catChecks.filter(c => c.status === 'warning').length;
    lines.push(`### ${categoryLabels[cat]}`);
    lines.push(`*${categoryDescriptions[cat]}*`);
    lines.push(`✅ ${passed} passed · ❌ ${failed} failed · ⚠️ ${warned} warnings`);
    lines.push('');
    for (const check of catChecks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- ${icon} ${location ? `**${location}**` : ''} — ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`  - v3: \`${check.v3Value || '(none)'}\` → v5: \`${check.v5Value || '(none)'}\``);
      }
    }
    lines.push('');
  }

  // Fix checklist for failures
  if (report.failures.length > 0) {
    lines.push('## Fix Checklist — Failures');
    lines.push('');
    lines.push('> These parity failures must be resolved to ensure migration completeness.');
    lines.push('');
    for (const check of report.failures) {
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- [ ] **${location || 'Schema'}**: ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`  - v3: \`${check.v3Value || '(none)'}\` → v5: \`${check.v5Value || '(none)'}\``);
      }
      lines.push(`  - **Action:** ${getParityFixAction(check)}`);
    }
    lines.push('');
  }

  // Warnings
  if (report.warningChecks.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const check of report.warningChecks) {
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- [ ] **${location || 'Schema'}**: ${check.message}`);
      if (check.v3Value || check.v5Value) {
        lines.push(`  - v3: \`${check.v3Value || '(none)'}\` → v5: \`${check.v5Value || '(none)'}\``);
      }
    }
    lines.push('');
  }

  // All passed checks
  const passedChecks = report.checks.filter(c => c.status === 'pass');
  if (passedChecks.length > 0) {
    lines.push('## Passed Checks');
    lines.push('');
    for (const check of passedChecks) {
      const location = [check.contentType, check.field].filter(Boolean).join('.');
      lines.push(`- ✅ ${location ? `**${location}**` : ''} — ${check.message}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by [StrapiShift](https://github.com/ICJIA/strapishift) — MIT License*');
  return lines.join('\n');
}

/**
 * Generate comprehensive CSV parity report — one row per check (pass, fail, and warning).
 */
export function generateParityCsv(report: ParityReport): string {
  const headers = ['Check ID', 'Category', 'Content Type', 'Field', 'Status', 'Message', 'v3 Value', 'v5 Value', 'Suggested Action'];
  const rows = report.checks.map((c) => [
    c.checkId,
    c.category,
    c.contentType || '',
    c.field || '',
    c.status,
    c.message,
    c.v3Value || '',
    c.v5Value || '',
    c.status === 'fail' ? getParityFixAction(c) : c.status === 'warning' ? 'Review and verify manually' : 'No action needed',
  ]);

  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;

  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

/**
 * Generate comprehensive self-contained HTML parity report.
 * Shows ALL checks (pass, fail, warning) with v3/v5 values and fix actions.
 */
export function generateParityHtml(report: ParityReport): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const categories = ['content-type-presence', 'field-presence', 'field-type-compat', 'relation-integrity', 'component-integrity'] as const;
  const categoryLabels: Record<string, string> = {
    'content-type-presence': 'Content Type Presence',
    'field-presence': 'Field Presence',
    'field-type-compat': 'Field Type Compatibility',
    'relation-integrity': 'Relation Integrity',
    'component-integrity': 'Component Integrity',
  };
  const categoryDescriptions: Record<string, string> = {
    'content-type-presence': 'Verifies every v3 content type exists in the v5 schema.',
    'field-presence': 'Verifies every v3 field exists in the corresponding v5 content type.',
    'field-type-compat': 'Verifies field types are compatible between v3 and v5.',
    'relation-integrity': 'Verifies relation targets exist and cardinality is compatible.',
    'component-integrity': 'Verifies components and dynamic zones are preserved.',
  };

  const categorySections = categories.map(cat => {
    const catChecks = report.checks.filter(c => c.category === cat);
    if (catChecks.length === 0) return '';

    const passed = catChecks.filter(c => c.status === 'pass').length;
    const failed = catChecks.filter(c => c.status === 'fail').length;
    const warned = catChecks.filter(c => c.status === 'warning').length;

    const rows = catChecks.map(c => `
      <tr class="${c.status}">
        <td>${c.status === 'fail' ? '<input type="checkbox" class="print-checkbox">' : ''}</td>
        <td>${escapeHtml(c.contentType || '—')}</td>
        <td><code>${escapeHtml(c.field || '—')}</code></td>
        <td><span class="badge ${c.status}">${c.status.toUpperCase()}</span></td>
        <td>${escapeHtml(c.message)}</td>
        <td>${c.v3Value ? `<code>${escapeHtml(c.v3Value)}</code>` : '—'}</td>
        <td>${c.v5Value ? `<code>${escapeHtml(c.v5Value)}</code>` : '—'}</td>
        <td class="action-cell">${c.status === 'fail' ? escapeHtml(getParityFixAction(c)) : c.status === 'warning' ? 'Review manually' : '—'}</td>
      </tr>`).join('');

    return `
      <div class="category-section">
        <h3>${categoryLabels[cat]}</h3>
        <p class="cat-description">${categoryDescriptions[cat]}</p>
        <div class="cat-stats">
          <span class="stat pass">✅ ${passed} passed</span>
          <span class="stat fail">❌ ${failed} failed</span>
          <span class="stat warn">⚠️ ${warned} warnings</span>
        </div>
        <table>
          <thead><tr><th style="width:30px">☐</th><th>Content Type</th><th>Field</th><th>Status</th><th>Issue</th><th>v3 Value</th><th>v5 Value</th><th>Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StrapiShift Parity Report — ${report.parityScore}%</title>
<style>
  :root { --bg: #0f172a; --text: #e2e8f0; --card-bg: #1e293b; --border: #334155; --muted: #94a3b8; }
  .light { --bg: #fff; --text: #1e293b; --card-bg: #f8fafc; --border: #e2e8f0; --muted: #64748b; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 2rem; max-width: 1200px; margin: 0 auto; line-height: 1.6; }
  h1 { margin-bottom: 0.25rem; }
  h2 { margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
  h3 { margin: 1.5rem 0 0.5rem; }
  .score { font-size: 3rem; font-weight: 800; margin: 1rem 0; }
  .score.perfect { color: #22C55E; }
  .score.good { color: #EAB308; }
  .score.poor { color: #EF4444; }
  .stats { display: flex; gap: 2rem; margin-bottom: 2rem; color: var(--muted); }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .summary-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; text-align: center; }
  .summary-card .number { font-size: 1.8rem; font-weight: 700; }
  .summary-card .label { font-size: 0.8rem; color: var(--muted); }
  .summary-card.pass .number { color: #22C55E; }
  .summary-card.fail .number { color: #EF4444; }
  .summary-card.warn .number { color: #EAB308; }
  .category-section { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
  .cat-description { color: var(--muted); font-size: 0.9rem; margin-bottom: 0.75rem; }
  .cat-stats { display: flex; gap: 1.5rem; margin-bottom: 1rem; }
  .stat { font-size: 0.85rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; vertical-align: top; }
  th { color: var(--muted); font-weight: 600; }
  tr.pass { opacity: 0.7; }
  tr.fail { background: rgba(239,68,68,0.05); }
  tr.warning { background: rgba(234,179,8,0.05); }
  code { background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-size: 0.8rem; }
  .badge { font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 3px; }
  .badge.pass { background: #22C55E; color: #052E16; }
  .badge.fail { background: #EF4444; color: white; }
  .badge.warning { background: #EAB308; color: #1e293b; }
  .action-cell { font-size: 0.8rem; color: var(--muted); }
  .theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; z-index: 10; }
  .filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
  .filter-btn { background: var(--card-bg); border: 1px solid var(--border); color: var(--text); padding: 0.3rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
  .filter-btn.active { border-color: #3B82F6; background: #1e3a5f; }
  .toc { margin-bottom: 2rem; }
  .toc a { color: #60a5fa; text-decoration: none; font-size: 0.9rem; }
  .toc ul { list-style: none; }
  .toc li { padding: 0.2rem 0; }

  @media print {
    body { background: white !important; color: #1e293b !important; padding: 1cm; font-size: 10pt; }
    .theme-toggle, .filter-bar, .toc { display: none !important; }
    .score { color: #1e293b !important; }
    .category-section { background: white !important; border-color: #d1d5db !important; break-inside: avoid; }
    table { border: 1px solid #d1d5db; }
    th { background: #f3f4f6 !important; color: #374151 !important; }
    td { border-color: #d1d5db !important; }
    tr.pass { opacity: 1; }
    .badge { border: 1px solid; background: transparent !important; }
    .badge.pass { color: #166534 !important; border-color: #166534; }
    .badge.fail { color: #dc2626 !important; border-color: #dc2626; }
    .badge.warning { color: #ca8a04 !important; border-color: #ca8a04; }
    code { background: #f3f4f6 !important; }
    .stats, .cat-description, .action-cell { color: #6b7280 !important; }
    .summary-card { border-color: #d1d5db !important; background: white !important; }
    input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 14px; height: 14px; border: 1.5px solid #6b7280; display: inline-block; vertical-align: middle; }
  }
</style>
</head>
<body>
<button class="theme-toggle" onclick="document.body.classList.toggle('light')">🌓 Toggle Theme</button>
<h1>StrapiShift Parity Verification Report</h1>
<p style="color:var(--muted)">Generated: ${escapeHtml(report.generatedAt)} | StrapiShift v${report.version}</p>
<div class="score ${report.parityScore === 100 ? 'perfect' : report.parityScore >= 80 ? 'good' : 'poor'}">${report.parityScore}% Parity</div>

<div class="summary-grid">
  <div class="summary-card"><div class="number">${report.totalChecks}</div><div class="label">Total Checks</div></div>
  <div class="summary-card pass"><div class="number">${report.passed}</div><div class="label">Passed</div></div>
  <div class="summary-card fail"><div class="number">${report.failed}</div><div class="label">Failed</div></div>
  <div class="summary-card warn"><div class="number">${report.warnings}</div><div class="label">Warnings</div></div>
</div>

<nav class="toc">
  <strong>Contents:</strong>
  <ul>
    <li><a href="#results">Results by Category</a></li>
    <li><a href="#methodology">Check Methodology</a></li>
  </ul>
</nav>

<h2 id="results">Results by Category</h2>

<div class="filter-bar">
  <button class="filter-btn active" onclick="filterRows('all', this)">All</button>
  <button class="filter-btn" onclick="filterRows('fail', this)">❌ Failed</button>
  <button class="filter-btn" onclick="filterRows('warning', this)">⚠️ Warnings</button>
  <button class="filter-btn" onclick="filterRows('pass', this)">✅ Passed</button>
</div>

${categorySections}

<h2 id="methodology">Check Methodology</h2>
<div class="category-section">
  <p>StrapiShift parity verification performs 5 categories of checks:</p>
  <ol style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--muted);">
    <li style="margin-bottom: 0.4rem;"><strong>Content Type Presence</strong> — Every v3 content type must have a corresponding v5 content type.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Field Presence</strong> — Every v3 field must exist in the v5 schema (accounting for known renames like created_at → createdAt).</li>
    <li style="margin-bottom: 0.4rem;"><strong>Field Type Compatibility</strong> — Field types must be compatible (e.g., v3 "string" → v5 "string", v3 "richtext" → v5 "richtext").</li>
    <li style="margin-bottom: 0.4rem;"><strong>Relation Integrity</strong> — Relation targets must exist in the v5 schema and cardinality must be compatible.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Component Integrity</strong> — Components and dynamic zones must be preserved with matching structures.</li>
  </ol>
  <p style="margin-top: 0.75rem; color: var(--muted);"><strong>Parity Score</strong> = (passed ÷ total) × 100. A score of 100% means every v3 schema element has a verified v5 equivalent.</p>
</div>

<p style="color:var(--muted); font-size:0.85rem; margin-top:2rem;">Generated by <a href="https://github.com/ICJIA/strapishift" target="_blank" rel="noopener" style="color:#60a5fa;">StrapiShift</a> — MIT License</p>

<script>
function filterRows(status, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('tbody tr').forEach(row => {
    if (status === 'all') { row.style.display = ''; return; }
    row.style.display = row.classList.contains(status) ? '' : 'none';
  });
}
</script>
</body>
</html>`;
}

/**
 * Get a suggested fix action for a parity check failure.
 */
function getParityFixAction(check: ParityCheck): string {
  switch (check.category) {
    case 'content-type-presence':
      return `Create the missing content type "${check.contentType}" in your v5 Strapi instance using the Content Type Builder. Match the v3 schema structure.`;
    case 'field-presence':
      return `Add the field "${check.field}" to the "${check.contentType}" content type in v5. Check if it was renamed (e.g., created_at → createdAt) before adding.`;
    case 'field-type-compat':
      return `The field type changed from v3 "${check.v3Value}" to v5 "${check.v5Value}". Update the v5 schema to use a compatible type, or migrate the data to match the new type.`;
    case 'relation-integrity':
      return `Fix the relation on "${check.contentType}.${check.field}". Ensure the target content type exists in v5 and the relation type (oneToOne, oneToMany, etc.) is correct.`;
    case 'component-integrity':
      return `Ensure the component/dynamic zone "${check.field}" on "${check.contentType}" exists in v5 with matching structure.`;
    default:
      return 'Review and fix manually.';
  }
}
