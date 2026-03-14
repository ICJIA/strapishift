<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-bold">Schema Analysis</h1>
      <p class="mt-2 text-lg text-(--ui-text-muted)">
        Paste your Strapi v3 content-type schema JSON to get a full migration report.
      </p>
      <p class="mt-1 text-sm text-(--ui-text-muted)">
        No schema handy? Click <button class="text-green-400 hover:underline" @click="loadExample(); inputMode = 'paste'">Load Example Schema</button> to try it with a sample v3 project.
      </p>
    </div>

    <!-- Where to find your schemas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="text-blue-400 text-lg">📁</span>
            <h3 class="font-semibold">Finding Your Strapi v3 Schema</h3>
          </div>
        </template>
        <div class="space-y-3 text-sm text-(--ui-text-muted)">
          <p>Your v3 content-type schemas live in your Strapi project's <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">api/</code> directory:</p>
          <div class="rounded-lg bg-(--ui-bg-elevated) p-3 font-mono text-xs leading-relaxed">
            <p class="text-(--ui-text-dimmed)">your-strapi-v3-project/</p>
            <p class="text-(--ui-text-dimmed)">└── api/</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;├── article/</p>
            <p class="text-green-400">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── models/article.settings.json&nbsp;&nbsp;← this file</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;├── category/</p>
            <p class="text-green-400">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── models/category.settings.json</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;└── ...</p>
          </div>
          <p>Open each <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">.settings.json</code> file — it contains the <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">attributes</code> and <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">kind</code> fields StrapiShift needs.</p>
          <p><strong class="text-(--ui-text-highlighted)">Multiple content types?</strong> Paste them as a JSON object keyed by name:</p>
          <div class="rounded-lg bg-(--ui-bg-elevated) p-3 font-mono text-xs">
            <p class="text-(--ui-text-dimmed)">{"article": {"kind": "collectionType", "attributes": {...}},</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;"category": {"kind": "collectionType", "attributes": {...}}}</p>
          </div>
          <p class="text-xs text-(--ui-text-muted)">Or use the CLI: <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">strapishift analyze ./api/</code> to scan the entire directory.</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <span class="text-green-400 text-lg">📁</span>
            <h3 class="font-semibold">Finding Your Strapi v5 Schema</h3>
          </div>
        </template>
        <div class="space-y-3 text-sm text-(--ui-text-muted)">
          <p>In Strapi v5, content-type schemas are in <code class="px-1.5 py-0.5 rounded bg-(--ui-bg-elevated) text-(--ui-text-dimmed) font-mono text-xs">src/api/</code>:</p>
          <div class="rounded-lg bg-(--ui-bg-elevated) p-3 font-mono text-xs leading-relaxed">
            <p class="text-(--ui-text-dimmed)">your-strapi-v5-project/</p>
            <p class="text-(--ui-text-dimmed)">└── src/api/</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;├── article/</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── content-types/</p>
            <p class="text-green-400">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── article/schema.json&nbsp;&nbsp;← this file</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;├── category/</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└── content-types/</p>
            <p class="text-green-400">&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── category/schema.json</p>
            <p class="text-(--ui-text-dimmed)">&nbsp;&nbsp;&nbsp;&nbsp;└── ...</p>
          </div>
          <p>You need v5 schemas for <strong class="text-(--ui-text-highlighted)">parity verification</strong> — comparing what you have in v5 against the original v3 source.</p>
          <p>Go to the <NuxtLink to="/verify" class="text-green-400 hover:underline">Verify page</NuxtLink> to compare v3 and v5 schemas side by side.</p>
          <p class="text-xs text-(--ui-text-muted)">Don't have a v5 instance yet? Start with analysis here — StrapiShift tells you everything that needs to change before you create one.</p>
        </div>
      </UCard>
    </div>

    <!-- Input method tabs -->
    <div class="flex items-center gap-2 mb-4">
      <UButton
        size="sm"
        :variant="inputMode === 'paste' ? 'soft' : 'ghost'"
        :color="inputMode === 'paste' ? 'success' : 'neutral'"
        label="Paste / Upload"
        @click="inputMode = 'paste'"
      />
      <UButton
        size="sm"
        :variant="inputMode === 'fetch' ? 'soft' : 'ghost'"
        :color="inputMode === 'fetch' ? 'success' : 'neutral'"
        label="Fetch from Instance"
        @click="inputMode = 'fetch'"
      />
      <div class="flex-1" />
      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        label="Load Example Schema"
        @click="loadExample(); inputMode = 'paste'"
      />
    </div>

    <!-- Fetch from instance -->
    <UCard v-if="inputMode === 'fetch'" class="mb-6">
      <div class="space-y-4">
        <p class="text-sm text-(--ui-text-muted)">
          Connect to a running Strapi v3 instance to automatically pull all content-type schemas.
          Requires <strong class="text-(--ui-text-highlighted)">admin panel credentials</strong> (not an API token).
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="fetch-url" class="block text-sm font-medium text-(--ui-text-dimmed) mb-1">Instance URL</label>
            <input
              id="fetch-url"
              v-model="fetchUrl"
              type="url"
              placeholder="http://localhost:1337"
              aria-describedby="fetch-security-note"
              class="w-full rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
            >
          </div>
          <div>
            <label for="fetch-version" class="block text-sm font-medium text-(--ui-text-dimmed) mb-1">Strapi Version</label>
            <select
              id="fetch-version"
              v-model="fetchVersion"
              class="w-full rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="v3">Strapi v3</option>
              <option value="v5">Strapi v5</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="fetch-email" class="block text-sm font-medium text-(--ui-text-dimmed) mb-1">Admin Email</label>
            <input
              id="fetch-email"
              v-model="fetchEmail"
              type="email"
              placeholder="admin@example.com"
              autocomplete="email"
              class="w-full rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
            >
          </div>
          <div>
            <label for="fetch-password" class="block text-sm font-medium text-(--ui-text-dimmed) mb-1">Admin Password</label>
            <input
              id="fetch-password"
              v-model="fetchPassword"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
              class="w-full rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) text-(--ui-text-highlighted) text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500"
            >
          </div>
        </div>

        <div id="fetch-security-note" class="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <p class="text-xs text-blue-300">
            <strong>Security:</strong> Credentials are sent directly from your browser to your Strapi instance. Nothing is stored or sent to StrapiShift servers. This page runs entirely client-side.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            color="success"
            :disabled="!fetchUrl || !fetchEmail || !fetchPassword || fetching"
            :loading="fetching"
            label="Fetch Schemas"
            @click="doFetch"
          />
        </div>

        <!-- Fetch success -->
        <div v-if="fetchResult?.success" role="status" aria-live="polite" class="rounded-lg bg-green-500/10 border border-green-500/20 p-4">
          <p class="text-sm text-green-300 font-medium">
            Fetched {{ fetchResult.contentTypeCount }} content types from {{ fetchUrl }}
          </p>
          <p class="text-xs text-green-400/70 mt-1">Schema loaded into the editor below. Click "Analyze Schema" to run the analysis.</p>
        </div>

        <!-- Fetch error -->
        <div v-if="fetchResult && !fetchResult.success" class="space-y-3">
          <div class="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
            <p class="text-sm text-red-300 font-medium">{{ fetchResult.error }}</p>
          </div>
          <div v-if="fetchResult.helpMessage" role="alert" class="rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) p-4">
            <p class="text-xs font-semibold text-(--ui-text-highlighted) mb-2">How to get schemas manually:</p>
            <pre class="text-xs text-(--ui-text-muted) whitespace-pre-wrap leading-relaxed">{{ fetchResult.helpMessage }}</pre>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Paste / upload -->
    <UCard>
      <div class="space-y-4">
        <!-- File upload -->
        <div>
          <label for="schema-file-upload" class="block text-sm font-medium text-(--ui-text-dimmed) mb-2">Upload JSON file</label>
          <input
            id="schema-file-upload"
            type="file"
            accept=".json"
            class="block w-full text-sm text-(--ui-text-muted) file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-(--ui-bg-elevated) file:text-(--ui-text-dimmed) hover:file:bg-(--ui-bg-accented) cursor-pointer"
            @change="handleFileUpload"
          >
        </div>

        <div class="flex items-center gap-3">
          <div class="flex-1 border-t border-(--ui-border)" />
          <span class="text-sm text-(--ui-text-muted)">or paste below</span>
          <div class="flex-1 border-t border-(--ui-border)" />
        </div>

        <!-- Text input -->
        <UTextarea
          v-model="schemaInput"
          :rows="16"
          placeholder='{"kind": "collectionType", "attributes": { ... }}'
          size="lg"
          class="font-mono"
        />

        <!-- Validation -->
        <div v-if="validationMessage" class="text-sm" :class="isValidJson ? 'text-green-400' : 'text-red-400'">
          {{ validationMessage }}
        </div>

        <!-- Error -->
        <div v-if="error" role="alert" class="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p class="text-sm text-red-300">{{ error }}</p>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2">
          <UButton color="success" :disabled="!isValidJson" label="Analyze Schema" @click="runAnalysis" />
          <UButton v-if="schemaInput" variant="ghost" color="neutral" label="Clear" @click="clearInput" />
          <UButton variant="ghost" color="neutral" label="Load Example" @click="loadExample" />
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Schema Analysis | StrapiShift',
  meta: [
    { name: 'description', content: 'Analyze your Strapi v3 schema against 14 rules across 7 categories. Get a detailed migration report with blockers, warnings, and actionable fix instructions.' },
  ],
})

const router = useRouter()
const { analyzeSchema, error } = useAnalysis()
const { fetchSchemas, fetching } = useStrapiFetch()

const schemaInput = ref('')
const inputMode = ref<'paste' | 'fetch'>('fetch')

// Fetch state
const fetchUrl = ref('')
const fetchEmail = ref('')
const fetchPassword = ref('')
const fetchVersion = ref<'v3' | 'v5'>('v3')
const fetchResult = ref<Awaited<ReturnType<typeof fetchSchemas>> | null>(null)

async function doFetch() {
  fetchResult.value = null
  const result = await fetchSchemas(fetchUrl.value, fetchEmail.value, fetchPassword.value, fetchVersion.value)
  fetchResult.value = result

  if (result.success && result.schemas) {
    schemaInput.value = JSON.stringify(result.schemas, null, 2)
    // Switch to paste view to show the loaded schema
    inputMode.value = 'paste'
  }
}

const isValidJson = computed(() => {
  if (!schemaInput.value.trim()) return false
  try { JSON.parse(schemaInput.value); return true } catch { return false }
})

const validationMessage = computed(() => {
  if (!schemaInput.value.trim()) return ''
  return isValidJson.value ? 'Valid JSON' : 'Invalid JSON'
})

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => { schemaInput.value = e.target?.result as string }
  reader.readAsText(file)
}

function runAnalysis() {
  const result = analyzeSchema(schemaInput.value)
  if (result) router.push('/report')
}

function clearInput() {
  schemaInput.value = ''
  error.value = null
  fetchResult.value = null
}

const exampleSchema = {
  article: {
    kind: 'collectionType', connection: 'default', collectionName: 'articles',
    info: { name: 'Article', description: 'Blog articles' },
    attributes: {
      title: { type: 'string', required: true },
      slug: { type: 'uid', targetField: 'title' },
      content: { type: 'richtext' },
      excerpt: { type: 'text' },
      published_at: { type: 'datetime' },
      cover_image: { model: 'file', via: 'related', plugin: 'upload' },
      gallery: { collection: 'file', via: 'related', plugin: 'upload' },
      category: { model: 'category', via: 'articles' },
      tags: { collection: 'tag', via: 'articles', dominant: true },
      author: { model: 'user', via: 'articles', plugin: 'users-permissions' },
      seo: { type: 'component', component: 'shared.seo' },
      status: { type: 'enumeration', enum: ['draft', 'published', 'archived'] },
    },
  },
  category: {
    kind: 'collectionType', connection: 'default', collectionName: 'categories',
    info: { name: 'Category' },
    attributes: {
      name: { type: 'string', required: true, unique: true },
      slug: { type: 'uid', targetField: 'name' },
      description: { type: 'text' },
      articles: { collection: 'article', via: 'category' },
    },
  },
  tag: {
    kind: 'collectionType', connection: 'default', collectionName: 'tags',
    info: { name: 'Tag' },
    attributes: {
      name: { type: 'string', required: true, unique: true },
      articles: { collection: 'article', via: 'tags' },
    },
  },
}

function loadExample() {
  schemaInput.value = JSON.stringify(exampleSchema, null, 2)
}
</script>
