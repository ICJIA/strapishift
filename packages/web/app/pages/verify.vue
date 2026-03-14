<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold">Parity Verification</h1>
      <p class="mt-2 text-lg text-(--ui-text-muted)">
        Compare your Strapi v3 and v5 schemas to verify migration completeness.
      </p>
    </div>

    <!-- Input panels -->
    <div v-if="!parityReport" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- V3 panel -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Strapi v3 Schema</h3>
              <div class="flex items-center gap-2">
                <UBadge color="info" variant="subtle" label="source" />
                <UButton size="xs" variant="ghost" color="neutral" label="Fetch" @click="fetchPanel = 'v3'" />
              </div>
            </div>
          </template>

          <!-- Fetch form for v3 -->
          <div v-if="fetchPanel === 'v3'" class="space-y-3 mb-4 p-3 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border)">
            <p class="text-xs text-(--ui-text-muted)">Fetch from a running Strapi v3 instance (requires admin credentials)</p>
            <label for="v3-url" class="sr-only">v3 Instance URL</label>
            <input id="v3-url" v-model="v3FetchUrl" type="url" placeholder="http://localhost:1337" aria-label="Strapi v3 instance URL" class="w-full rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
            <div class="grid grid-cols-2 gap-2">
              <input id="v3-email" v-model="v3FetchEmail" type="email" placeholder="admin@example.com" aria-label="v3 admin email" autocomplete="email" class="rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
              <input id="v3-password" v-model="v3FetchPassword" type="password" placeholder="Password" aria-label="v3 admin password" autocomplete="current-password" class="rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
            </div>
            <div class="flex items-center gap-2">
              <UButton size="xs" color="success" :loading="fetching" label="Fetch v3 Schemas" @click="doFetchV3" />
              <UButton size="xs" variant="ghost" color="neutral" label="Cancel" @click="fetchPanel = null" />
            </div>
            <div v-if="v3FetchError" class="text-xs text-red-400">{{ v3FetchError }}</div>
            <div v-if="v3FetchHelp" class="text-xs text-(--ui-text-muted)"><pre class="whitespace-pre-wrap">{{ v3FetchHelp }}</pre></div>
          </div>

          <UTextarea v-model="v3Input" :rows="18" placeholder="Paste v3 schema JSON..." size="lg" class="font-mono" />
        </UCard>

        <!-- V5 panel -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold">Strapi v5 Schema</h3>
              <div class="flex items-center gap-2">
                <UBadge color="success" variant="subtle" label="target" />
                <UButton size="xs" variant="ghost" color="neutral" label="Fetch" @click="fetchPanel = 'v5'" />
              </div>
            </div>
          </template>

          <!-- Fetch form for v5 -->
          <div v-if="fetchPanel === 'v5'" class="space-y-3 mb-4 p-3 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border)">
            <p class="text-xs text-(--ui-text-muted)">Fetch from a running Strapi v5 instance (requires admin credentials)</p>
            <label for="v5-url" class="sr-only">v5 Instance URL</label>
            <input id="v5-url" v-model="v5FetchUrl" type="url" placeholder="http://localhost:1338" aria-label="Strapi v5 instance URL" class="w-full rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
            <div class="grid grid-cols-2 gap-2">
              <input id="v5-email" v-model="v5FetchEmail" type="email" placeholder="admin@example.com" aria-label="v5 admin email" autocomplete="email" class="rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
              <input id="v5-password" v-model="v5FetchPassword" type="password" placeholder="Password" aria-label="v5 admin password" autocomplete="current-password" class="rounded-lg bg-(--ui-bg) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2 focus:outline-none focus:ring-2 focus:ring-green-500/50">
            </div>
            <div class="flex items-center gap-2">
              <UButton size="xs" color="success" :loading="fetching" label="Fetch v5 Schemas" @click="doFetchV5" />
              <UButton size="xs" variant="ghost" color="neutral" label="Cancel" @click="fetchPanel = null" />
            </div>
            <div v-if="v5FetchError" class="text-xs text-red-400">{{ v5FetchError }}</div>
            <div v-if="v5FetchHelp" class="text-xs text-(--ui-text-muted)"><pre class="whitespace-pre-wrap">{{ v5FetchHelp }}</pre></div>
          </div>

          <UTextarea v-model="v5Input" :rows="18" placeholder="Paste v5 schema JSON..." size="lg" class="font-mono" />
        </UCard>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <span class="text-sm" :class="v3Valid ? 'text-green-400' : 'text-(--ui-text-muted)'">
          v3: {{ v3Input.trim() ? (v3Valid ? 'Valid' : 'Invalid JSON') : 'Empty' }}
        </span>
        <span class="text-sm" :class="v5Valid ? 'text-green-400' : 'text-(--ui-text-muted)'">
          v5: {{ v5Input.trim() ? (v5Valid ? 'Valid' : 'Invalid JSON') : 'Empty' }}
        </span>
      </div>

      <div v-if="error" role="alert" class="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
        <p class="text-sm text-red-300">{{ error }}</p>
      </div>

      <div class="flex items-center gap-3">
        <UButton color="success" :disabled="!v3Valid || !v5Valid" label="Verify Parity" @click="runVerification" />
        <UButton variant="ghost" color="neutral" label="Load Examples" @click="loadExamples" />
      </div>
    </div>

    <!-- Results (unchanged) -->
    <template v-if="parityReport">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" label="Back" @click="resetVerification" />
        <div class="flex items-center gap-2">
          <UDropdownMenu :items="parityChecklistItems">
            <UButton icon="i-lucide-list-checks" label="Export Checklist" color="success" variant="outline" />
          </UDropdownMenu>
          <UDropdownMenu :items="exportItems">
            <UButton icon="i-lucide-download" label="Export Report" color="neutral" variant="outline" />
          </UDropdownMenu>
        </div>
      </div>

      <div class="text-center mb-10">
        <p class="text-7xl sm:text-8xl font-extrabold" :class="scoreColor">{{ parityReport.parityScore }}%</p>
        <p class="text-xl text-(--ui-text-muted) mt-2">Parity Score</p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <UCard><div class="text-center"><p class="text-2xl font-bold">{{ parityReport.totalChecks }}</p><p class="text-xs text-(--ui-text-muted) mt-1">Total Checks</p></div></UCard>
        <UCard><div class="text-center"><p class="text-2xl font-bold text-green-400">{{ parityReport.passed }}</p><p class="text-xs text-(--ui-text-muted) mt-1">Passed</p></div></UCard>
        <UCard><div class="text-center"><p class="text-2xl font-bold text-yellow-400">{{ parityReport.warnings }}</p><p class="text-xs text-(--ui-text-muted) mt-1">Warnings</p></div></UCard>
        <UCard><div class="text-center"><p class="text-2xl font-bold text-red-400">{{ parityReport.failed }}</p><p class="text-xs text-(--ui-text-muted) mt-1">Failed</p></div></UCard>
      </div>

      <UCard>
        <template #header><h3 class="font-semibold">Verification Checks</h3></template>
        <div class="divide-y divide-(--ui-border)">
          <div v-for="(check, i) in parityReport.checks" :key="i" class="flex items-start gap-3 py-3">
            <UBadge :color="checkColor(check.status)" variant="subtle" :label="check.status" size="xs" class="mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="text-sm">{{ check.message }}</p>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span v-if="check.contentType" class="text-xs text-(--ui-text-muted)">{{ check.contentType }}</span>
                <span v-if="check.field" class="text-xs text-(--ui-text-muted)">&middot; {{ check.field }}</span>
                <UBadge color="neutral" variant="subtle" size="xs" :label="check.category" />
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ParityCheckStatus } from '@strapishift/core'

useHead({
  title: 'Parity Verification | StrapiShift',
  meta: [
    { name: 'description', content: 'Compare your Strapi v3 and v5 schemas field-by-field to verify migration completeness. Get a parity score and fix checklist.' },
  ],
})

const { parityReport, error, verifyParity, exportParityReport, exportParityChecklist } = useAnalysis()
const { fetchSchemas, fetching } = useStrapiFetch()

const v3Input = ref('')
const v5Input = ref('')
const fetchPanel = ref<'v3' | 'v5' | null>(null)

// V3 fetch state
const v3FetchUrl = ref('')
const v3FetchEmail = ref('')
const v3FetchPassword = ref('')
const v3FetchError = ref<string | null>(null)
const v3FetchHelp = ref<string | null>(null)

// V5 fetch state
const v5FetchUrl = ref('')
const v5FetchEmail = ref('')
const v5FetchPassword = ref('')
const v5FetchError = ref<string | null>(null)
const v5FetchHelp = ref<string | null>(null)

async function doFetchV3() {
  v3FetchError.value = null
  v3FetchHelp.value = null
  const result = await fetchSchemas(v3FetchUrl.value, v3FetchEmail.value, v3FetchPassword.value, 'v3')
  if (result.success && result.schemas) {
    v3Input.value = JSON.stringify(result.schemas, null, 2)
    fetchPanel.value = null
  } else {
    v3FetchError.value = result.error
    v3FetchHelp.value = result.helpMessage
  }
}

async function doFetchV5() {
  v5FetchError.value = null
  v5FetchHelp.value = null
  const result = await fetchSchemas(v5FetchUrl.value, v5FetchEmail.value, v5FetchPassword.value, 'v5')
  if (result.success && result.schemas) {
    v5Input.value = JSON.stringify(result.schemas, null, 2)
    fetchPanel.value = null
  } else {
    v5FetchError.value = result.error
    v5FetchHelp.value = result.helpMessage
  }
}

const v3Valid = computed(() => { if (!v3Input.value.trim()) return false; try { JSON.parse(v3Input.value); return true } catch { return false } })
const v5Valid = computed(() => { if (!v5Input.value.trim()) return false; try { JSON.parse(v5Input.value); return true } catch { return false } })

const scoreColor = computed(() => {
  if (!parityReport.value) return ''
  const s = parityReport.value.parityScore
  return s >= 80 ? 'text-green-400' : s >= 50 ? 'text-yellow-400' : 'text-red-400'
})

function runVerification() { verifyParity(v3Input.value, v5Input.value) }
function resetVerification() { parityReport.value = null; error.value = null }

function checkColor(status: ParityCheckStatus) {
  return { pass: 'success' as const, warning: 'warning' as const, fail: 'error' as const }[status]
}

const exportItems = [[
  { label: 'JSON', onSelect: () => exportParityReport('json') },
  { label: 'HTML', onSelect: () => exportParityReport('html') },
  { label: 'Markdown', onSelect: () => exportParityReport('md') },
  { label: 'CSV', onSelect: () => exportParityReport('csv') },
]]

const parityChecklistItems = [[
  { label: 'HTML (interactive)', onSelect: () => exportParityChecklist('html') },
  { label: 'Markdown', onSelect: () => exportParityChecklist('md') },
  { label: 'JSON', onSelect: () => exportParityChecklist('json') },
]]

function loadExamples() {
  v3Input.value = JSON.stringify({
    article: { kind: 'collectionType', connection: 'default', collectionName: 'articles', info: { name: 'Article' },
      attributes: { title: { type: 'string', required: true }, content: { type: 'richtext' }, category: { model: 'category', via: 'articles' } } },
  }, null, 2)
  v5Input.value = JSON.stringify({
    article: { kind: 'collectionType', collectionName: 'articles', info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
      attributes: { title: { type: 'string', required: true }, content: { type: 'richtext' } } },
  }, null, 2)
}
</script>
