<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <!-- No report -->
    <div v-if="!report" class="text-center py-20">
      <h2 class="text-2xl font-bold mb-2">No report available</h2>
      <p class="text-(--ui-text-muted) mb-6">Run a schema analysis first to see results here.</p>
      <UButton to="/analyze" color="success" label="Go to Analyzer" />
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold">Migration Report</h1>
          <p class="mt-1 text-(--ui-text-muted)">Generated {{ new Date(report.generatedAt).toLocaleString() }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UDropdownMenu :items="checklistItems">
            <UButton icon="i-lucide-list-checks" label="Export Checklist" color="success" variant="outline" />
          </UDropdownMenu>
          <UDropdownMenu :items="exportItems">
            <UButton icon="i-lucide-download" label="Export Report" color="neutral" variant="outline" />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <UCard v-for="card in summaryCards" :key="card.label">
          <div class="text-center">
            <p class="text-2xl font-bold" :class="card.colorClass">{{ card.value }}</p>
            <p class="text-xs text-(--ui-text-muted) mt-1">{{ card.label }}</p>
          </div>
        </UCard>
      </div>

      <!-- Filter buttons -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <UButton
          v-for="f in filters"
          :key="f.value"
          size="sm"
          :variant="activeFilter === f.value ? 'soft' : 'ghost'"
          :color="activeFilter === f.value ? 'success' : 'neutral'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
          <UBadge :color="f.badgeColor" variant="subtle" size="xs" :label="String(f.count)" class="ml-1" />
        </UButton>
      </div>

      <!-- Content type cards -->
      <div class="space-y-4">
        <UCard v-for="ct in filteredContentTypes" :key="ct.name">
          <!-- Header -->
          <button
            type="button"
            class="flex items-center justify-between cursor-pointer w-full text-left"
            :aria-expanded="expanded.has(ct.name)"
            :aria-controls="`findings-${ct.name}`"
            @click="toggleExpanded(ct.name)"
          >
            <div class="flex items-center gap-3">
              <UBadge :color="statusColor(ct.status)" variant="subtle" :label="ct.status" />
              <h3 class="text-lg font-semibold">{{ ct.name }}</h3>
              <span class="text-sm text-(--ui-text-muted)">{{ ct.kind }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm text-(--ui-text-muted)">
                {{ ct.fieldCount }} fields &middot; {{ ct.findings.length }} findings
              </span>
            </div>
          </button>

          <!-- Expanded findings -->
          <div v-if="expanded.has(ct.name)" :id="`findings-${ct.name}`" class="mt-4 space-y-3">
            <div v-if="ct.findings.length === 0" class="text-sm text-(--ui-text-muted) py-2">
              No findings. This content type is ready to migrate.
            </div>
            <div
              v-for="(finding, i) in ct.findings"
              :key="i"
              class="border border-(--ui-border) rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <UBadge :color="severityColor(finding.severity)" variant="subtle" :label="finding.severity" size="xs" class="mt-0.5" />
                <div class="flex-1 min-w-0">
                  <p class="font-medium">{{ finding.title }}</p>
                  <p class="text-sm text-(--ui-text-muted) mt-1">{{ finding.description }}</p>
                  <div class="flex flex-wrap items-center gap-2 mt-2">
                    <UBadge v-if="finding.field" color="neutral" variant="subtle" size="xs">
                      {{ finding.field }}
                    </UBadge>
                    <UBadge color="neutral" variant="subtle" size="xs" :label="`${finding.effort} effort`" />
                    <UBadge v-if="finding.affectsDatabase" color="info" variant="subtle" size="xs" label="database" />
                    <UBadge v-if="finding.affectsApi" color="secondary" variant="subtle" size="xs" label="api" />
                  </div>
                  <p class="text-sm text-green-400 mt-2">
                    <span class="font-medium">Action:</span> {{ finding.action }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ContentTypeStatus, Severity } from '@strapishift/core'

const { report, exportReport, exportChecklist } = useAnalysis()

const activeFilter = ref<'all' | 'blocker' | 'warning' | 'clean'>('all')
const expanded = ref(new Set<string>())

const summaryCards = computed(() => {
  if (!report.value) return []
  const s = report.value.summary
  const readinessColor = s.migrationReadiness >= 80 ? 'text-green-400' : s.migrationReadiness >= 50 ? 'text-yellow-400' : 'text-red-400'
  return [
    { value: s.totalContentTypes, label: 'Content Types', colorClass: '' },
    { value: s.clean, label: 'Clean', colorClass: 'text-green-400' },
    { value: s.warnings, label: 'Warnings', colorClass: 'text-yellow-400' },
    { value: s.blockers, label: 'Blockers', colorClass: 'text-red-400' },
    { value: `${s.migrationReadiness}%`, label: 'Readiness', colorClass: readinessColor },
    { value: `${s.estimatedEffort.totalHoursMin}-${s.estimatedEffort.totalHoursMax}h`, label: 'Est. Effort', colorClass: 'text-blue-400' },
  ]
})

const filters = computed(() => {
  if (!report.value) return []
  const cts = report.value.contentTypes
  return [
    { value: 'all' as const, label: 'All', count: cts.length, badgeColor: 'neutral' as const },
    { value: 'blocker' as const, label: 'Blockers', count: cts.filter(c => c.status === 'blocker').length, badgeColor: 'error' as const },
    { value: 'warning' as const, label: 'Warnings', count: cts.filter(c => c.status === 'warning').length, badgeColor: 'warning' as const },
    { value: 'clean' as const, label: 'Clean', count: cts.filter(c => c.status === 'clean').length, badgeColor: 'success' as const },
  ]
})

const filteredContentTypes = computed(() => {
  if (!report.value) return []
  if (activeFilter.value === 'all') return report.value.contentTypes
  return report.value.contentTypes.filter(ct => ct.status === activeFilter.value)
})

function toggleExpanded(name: string) {
  if (expanded.value.has(name)) expanded.value.delete(name)
  else expanded.value.add(name)
  expanded.value = new Set(expanded.value)
}

function statusColor(status: ContentTypeStatus) {
  return { clean: 'success' as const, warning: 'warning' as const, blocker: 'error' as const }[status]
}

function severityColor(severity: Severity) {
  return { info: 'info' as const, warning: 'warning' as const, blocker: 'error' as const }[severity]
}

const exportItems = [
  [
    { label: 'JSON', onSelect: () => exportReport('json') },
    { label: 'HTML', onSelect: () => exportReport('html') },
    { label: 'Markdown', onSelect: () => exportReport('md') },
    { label: 'CSV', onSelect: () => exportReport('csv') },
  ]
]

const checklistItems = [
  [
    { label: 'HTML (interactive)', onSelect: () => exportChecklist('html') },
    { label: 'Markdown', onSelect: () => exportChecklist('md') },
    { label: 'JSON', onSelect: () => exportChecklist('json') },
  ]
]
</script>
