<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-(--ui-bg) via-(--ui-bg) to-green-950/30" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div class="text-center max-w-4xl mx-auto">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Migrate Strapi v3
            <span class="text-green-400">&rarr;</span>
            v5 with confidence
          </h1>
          <p class="mt-6 text-lg sm:text-xl text-(--ui-text-muted) max-w-2xl mx-auto leading-relaxed">
            Automated schema analysis, parity verification, and migration
            reporting. Know exactly what needs to change before you start.
          </p>
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <UButton to="/analyze" size="xl" color="success" label="Analyze Your Schema" />
            <UButton to="/about" size="xl" variant="outline" color="neutral" label="Learn More" />
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 sm:py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold">
            Everything you need for a smooth migration
          </h2>
          <p class="mt-4 text-lg text-(--ui-text-muted)">
            Comprehensive tooling to analyze, plan, and verify your Strapi upgrade.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <UCard v-for="feature in features" :key="feature.title">
            <div class="flex flex-col gap-3">
              <div class="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span class="text-green-400 text-lg">{{ feature.emoji }}</span>
              </div>
              <h3 class="text-lg font-semibold">{{ feature.title }}</h3>
              <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ feature.description }}</p>
            </div>
          </UCard>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="py-20 sm:py-24 border-t border-(--ui-border)">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold">How it works</h2>
          <p class="mt-4 text-lg text-(--ui-text-muted)">
            Three simple steps to understand your migration path.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          <div v-for="step in steps" :key="step.number" class="text-center">
            <div class="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <span class="text-lg font-bold text-green-400">{{ step.number }}</span>
            </div>
            <h3 class="text-xl font-semibold mb-2">{{ step.title }}</h3>
            <p class="text-(--ui-text-muted) leading-relaxed">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Technical Deep Dive -->
    <section class="py-20 sm:py-24 border-t border-(--ui-border)">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold">Under the hood</h2>
          <p class="mt-4 text-lg text-(--ui-text-muted) max-w-3xl mx-auto">
            StrapiShift is not a generic diff tool. It encodes domain-specific knowledge from real Strapi v3 &rarr; v5 migrations into a deterministic rule engine. Here is exactly how it works and what it checks.
          </p>
        </div>

        <!-- Rule Engine Architecture -->
        <div class="mb-16">
          <h3 class="text-2xl font-bold mb-6">Rule Engine Architecture</h3>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <p class="text-(--ui-text-muted) leading-relaxed mb-4">
                When you submit a Strapi v3 schema, StrapiShift parses it into a normalized internal representation. Each content type's fields, relations, components, dynamic zones, and plugin references are extracted and classified.
              </p>
              <p class="text-(--ui-text-muted) leading-relaxed mb-4">
                The engine then evaluates <strong class="text-(--ui-text-highlighted)">14 rules across 7 categories</strong> against every content type. Rules are context-aware: MongoDB-specific rules only fire when the schema indicates a MongoDB database engine; pagination rules only apply to collectionTypes, not singleTypes.
              </p>
              <p class="text-(--ui-text-muted) leading-relaxed">
                Each finding includes a severity classification (blocker, warning, info), actionable remediation steps, an effort estimate based on real-world migration data, and links to the relevant Strapi documentation where applicable.
              </p>
            </div>
            <UCard>
              <div class="font-mono text-sm space-y-1">
                <div class="text-(--ui-text-muted) mb-3">// Pipeline</div>
                <div><span class="text-green-400">1.</span> Parse v3 schema JSON</div>
                <div><span class="text-green-400">2.</span> Classify fields, relations, components</div>
                <div><span class="text-green-400">3.</span> Detect database engine (MongoDB/SQL)</div>
                <div><span class="text-green-400">4.</span> Run 14 rules &times; N content types</div>
                <div><span class="text-green-400">5.</span> Classify severity per finding</div>
                <div><span class="text-green-400">6.</span> Calculate readiness score</div>
                <div><span class="text-green-400">7.</span> Estimate effort (hours)</div>
                <div><span class="text-green-400">8.</span> Generate phased migration checklist</div>
                <div><span class="text-green-400">9.</span> Export to JSON / HTML / MD / CSV</div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Rules Table -->
        <div class="mb-16">
          <h3 class="text-2xl font-bold mb-6">All 14 Rules</h3>
          <p class="text-(--ui-text-muted) mb-6">
            Every content type is evaluated against all rules below. Rules that do not apply (e.g., MongoDB rules on a non-MongoDB schema) are skipped automatically. A content type marked "Clean" means none of these rules produced a finding.
          </p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-(--ui-border)">
                  <th class="text-left py-3 px-3 text-(--ui-text-muted) font-semibold">Category</th>
                  <th class="text-left py-3 px-3 text-(--ui-text-muted) font-semibold">Rule</th>
                  <th class="text-left py-3 px-3 text-(--ui-text-muted) font-semibold">Severity</th>
                  <th class="text-left py-3 px-3 text-(--ui-text-muted) font-semibold">What It Detects</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in rules" :key="rule.id" class="border-b border-(--ui-border)/50">
                  <td class="py-3 px-3 font-medium">{{ rule.category }}</td>
                  <td class="py-3 px-3"><code class="text-xs bg-(--ui-bg-elevated) px-1.5 py-0.5 rounded">{{ rule.id }}</code></td>
                  <td class="py-3 px-3">
                    <span
                      class="text-xs font-bold px-1.5 py-0.5 rounded"
                      :class="{
                        'bg-red-500/20 text-red-400': rule.severity === 'blocker',
                        'bg-yellow-500/20 text-yellow-400': rule.severity === 'warning',
                        'bg-blue-500/20 text-blue-400': rule.severity === 'info',
                        'bg-purple-500/20 text-purple-400': rule.severity === 'varies',
                      }"
                    >{{ rule.severity.toUpperCase() }}</span>
                  </td>
                  <td class="py-3 px-3 text-(--ui-text-muted)">{{ rule.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Scoring -->
        <div class="mb-16">
          <h3 class="text-2xl font-bold mb-6">Scoring &amp; Effort Estimation</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UCard>
              <h4 class="font-semibold mb-2">Migration Readiness (0-100%)</h4>
              <p class="text-sm text-(--ui-text-muted) leading-relaxed">
                Calculated from the ratio of clean content types to total, weighted by blocker severity. A score of 100% means no blockers or warnings. Each blocker reduces the score significantly; warnings have a smaller impact.
              </p>
            </UCard>
            <UCard>
              <h4 class="font-semibold mb-2">Effort Estimation</h4>
              <p class="text-sm text-(--ui-text-muted) leading-relaxed">
                Each finding is tagged Low (&lt;1hr), Medium (1-4hr), or High (4-8hr) based on real-world migration data from the ICJIA ResearchHub Strapi v3 &rarr; v5 migration. Total effort is the sum across all findings, shown as a min-max range.
              </p>
            </UCard>
            <UCard>
              <h4 class="font-semibold mb-2">Severity Classification</h4>
              <p class="text-sm text-(--ui-text-muted) leading-relaxed">
                <strong class="text-red-400">Blocker</strong> &mdash; must fix before migration (e.g., Base64 images in rich text).
                <strong class="text-yellow-400">Warning</strong> &mdash; requires attention (e.g., API envelope changes).
                <strong class="text-blue-400">Info</strong> &mdash; automatic or low-impact change (e.g., field renames).
              </p>
            </UCard>
          </div>
        </div>

        <!-- Why Trust This -->
        <div>
          <h3 class="text-2xl font-bold mb-6">Why you can trust these results</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div v-for="point in trustPoints" :key="point.title" class="flex gap-3">
                <span class="text-green-400 text-lg mt-0.5 shrink-0">{{ point.icon }}</span>
                <div>
                  <h4 class="font-semibold">{{ point.title }}</h4>
                  <p class="text-sm text-(--ui-text-muted) leading-relaxed">{{ point.description }}</p>
                </div>
              </div>
            </div>
            <UCard>
              <h4 class="font-semibold mb-3">Open Source &amp; Auditable</h4>
              <p class="text-sm text-(--ui-text-muted) leading-relaxed mb-3">
                StrapiShift is fully open source under the MIT license. Every rule, every scoring algorithm, and every line of analysis logic is available for inspection.
              </p>
              <ul class="text-sm text-(--ui-text-muted) space-y-1.5">
                <li><strong>62 tests</strong> across the core engine and CLI</li>
                <li><strong>14 rules</strong> with documented detection logic</li>
                <li><strong>Real-world fixtures</strong> from production Strapi v3 instances</li>
                <li><strong>Zero data collection</strong> &mdash; analysis runs entirely in your browser</li>
              </ul>
              <div class="mt-4">
                <UButton
                  to="https://github.com/ICJIA/strapishift"
                  target="_blank"
                  size="sm"
                  variant="outline"
                  color="neutral"
                  label="View Source on GitHub"
                />
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 sm:py-24 border-t border-(--ui-border)">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-bold">Ready to migrate?</h2>
        <p class="mt-4 text-lg text-(--ui-text-muted)">
          Paste your Strapi v3 schema and get a full migration report in seconds.
        </p>
        <div class="mt-8">
          <UButton to="/analyze" size="xl" color="success" label="Get Started" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'StrapiShift — Migrate Strapi to v5',
  meta: [
    { name: 'description', content: 'Automated schema analysis, parity verification, and migration reporting. Know exactly what needs to change before you start your Strapi migration.' },
  ],
})

const features = [
  { emoji: '\u{1F50D}', title: 'Schema Analysis', description: '14 rules across 7 categories detect breaking changes, deprecations, and migration requirements.' },
  { emoji: '\u{2705}', title: 'Parity Verification', description: 'Compare your v3 and v5 schemas field-by-field to ensure nothing was lost in migration.' },
  { emoji: '\u{1F4E5}', title: 'Four Export Formats', description: 'Download your reports as JSON, HTML, Markdown, or CSV for any workflow.' },
  { emoji: '\u{1F4BB}', title: 'CLI + Web', description: 'Use whichever interface fits your workflow: command line or browser.' },
]

const steps = [
  { number: 1, title: 'Paste Your Schema', description: 'Export your Strapi v3 content-type schema JSON and paste it into the analyzer.' },
  { number: 2, title: 'Review Findings', description: 'Get a detailed report of blockers, warnings, and migration actions for each content type.' },
  { number: 3, title: 'Export & Execute', description: 'Download your migration plan and follow the phased checklist to complete the upgrade.' },
]

const rules = [
  { id: 'db-field-naming', category: 'Database', severity: 'info', description: 'Detects v3 snake_case fields (_id, created_at, updated_at) renamed to camelCase in v5.' },
  { id: 'db-mongodb-nested', category: 'Database', severity: 'warning', description: 'Flags JSON fields on MongoDB that use native nested documents \u2014 v5 on SQL stores JSON as serialized text.' },
  { id: 'db-objectid-refs', category: 'Database', severity: 'info', description: 'Flags MongoDB ObjectId string references that become integer IDs in v5.' },
  { id: 'api-response-envelope', category: 'API', severity: 'warning', description: 'v5 wraps responses in { data: { id, attributes } } instead of flat objects.' },
  { id: 'api-filter-syntax', category: 'API', severity: 'warning', description: 'v5 replaces _where, _sort, _limit with filters[], sort[], pagination[] syntax.' },
  { id: 'api-populate-syntax', category: 'API', severity: 'warning', description: 'v5 no longer auto-populates relations, media, components, or dynamic zones.' },
  { id: 'api-pagination-format', category: 'API', severity: 'warning', description: 'v3 used X-Total-Count header. v5 uses meta.pagination in the response body.' },
  { id: 'media-base64-candidate', category: 'Media', severity: 'blocker', description: 'Flags richtext fields that may contain Base64-encoded images \u2014 a widespread v3 pattern that silently breaks.' },
  { id: 'media-reference-format', category: 'Media', severity: 'warning', description: 'v3 media fields used upload plugin relations. v5 uses { type: "media" } with new API format.' },
  { id: 'rel-cardinality-syntax', category: 'Relations', severity: 'warning', description: 'v3 model/collection syntax changed to v5 type/relation/target format.' },
  { id: 'rel-polymorphic', category: 'Relations', severity: 'warning', description: 'Detects morphTo/morphMany patterns requiring manual migration.' },
  { id: 'rel-circular', category: 'Relations', severity: 'info', description: 'Detects bidirectional relations (A \u2194 B) requiring two-pass migration.' },
  { id: 'auth-user-model', category: 'Auth', severity: 'warning', description: 'Detects user model relations \u2014 Users & Permissions plugin changed significantly in v5.' },
  { id: 'plugin-compatibility', category: 'Plugins', severity: 'varies', description: 'Checks plugin references against a 12-plugin v5 compatibility database.' },
]

const trustPoints = [
  { icon: '\u{1F9EA}', title: 'Built from real migrations', description: 'Rules are derived from a 50-item checklist produced during the ICJIA ResearchHub Strapi v3 \u2192 v5 migration \u2014 not theoretical documentation reading.' },
  { icon: '\u{1F3AF}', title: 'Deterministic analysis', description: 'Same input always produces the same output. No AI hallucinations, no probabilistic guessing. Pure rule-based evaluation against documented breaking changes.' },
  { icon: '\u{1F6E1}\uFE0F', title: 'Catches undocumented issues', description: 'The Base64-in-richtext rule catches a widespread v3 pattern not mentioned in Strapi\u2019s official migration docs. This alone has saved teams weeks of debugging.' },
  { icon: '\u{1F50D}', title: 'Field-level granularity', description: 'Analysis goes beyond schema-level diffs. Every individual field is evaluated against all applicable rules, with specific remediation actions tailored to that field\u2019s type and context.' },
]
</script>
