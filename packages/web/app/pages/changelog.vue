<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold mb-2">Changelog</h1>
    <p class="text-(--ui-text-muted) mb-8">All notable changes to StrapiShift.</p>

    <div class="space-y-8">
      <UCard v-for="release in releases" :key="release.version">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-semibold">v{{ release.version }}</h2>
              <UBadge v-if="release.latest" color="success" variant="subtle" label="latest" />
            </div>
            <span class="text-sm text-(--ui-text-muted)">{{ release.date }}</span>
          </div>
        </template>

        <div class="space-y-4">
          <div v-if="release.added.length">
            <h3 class="text-sm font-semibold text-green-400 mb-2">Added</h3>
            <ul class="space-y-1">
              <li v-for="(item, i) in release.added" :key="i" class="text-sm text-(--ui-text-muted) flex items-start gap-2">
                <span class="text-green-400 mt-0.5 shrink-0">+</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div v-if="release.changed.length">
            <h3 class="text-sm font-semibold text-yellow-400 mb-2">Changed</h3>
            <ul class="space-y-1">
              <li v-for="(item, i) in release.changed" :key="i" class="text-sm text-(--ui-text-muted) flex items-start gap-2">
                <span class="text-yellow-400 mt-0.5 shrink-0">~</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div v-if="release.fixed.length">
            <h3 class="text-sm font-semibold text-blue-400 mb-2">Fixed</h3>
            <ul class="space-y-1">
              <li v-for="(item, i) in release.fixed" :key="i" class="text-sm text-(--ui-text-muted) flex items-start gap-2">
                <span class="text-blue-400 mt-0.5 shrink-0">*</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>

          <div v-if="release.security.length">
            <h3 class="text-sm font-semibold text-red-400 mb-2">Security</h3>
            <ul class="space-y-1">
              <li v-for="(item, i) in release.security" :key="i" class="text-sm text-(--ui-text-muted) flex items-start gap-2">
                <span class="text-red-400 mt-0.5 shrink-0">!</span>
                <span>{{ item }}</span>
              </li>
            </ul>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Release {
  version: string
  date: string
  latest: boolean
  added: string[]
  changed: string[]
  fixed: string[]
  security: string[]
}

const releases: Release[] = [
  {
    version: '0.1.1',
    date: '2026-03-14',
    latest: true,
    added: [],
    changed: [],
    fixed: [
      'Netlify deployment: moved netlify.toml into packages/web/ to match monorepo convention',
      'Set NITRO_PRESET=netlify as environment variable for proper serverless function discovery',
      'Added _redirects file routing all requests to the Nitro serverless function',
      'Bumped Node version to 22 (Node 20.11 lacks styleText required by @clack/core)',
      'Enabled SSR for server-rendered HTML instead of blank SPA shell',
      'Added .netlify/ to .gitignore to prevent build artifacts from being committed',
    ],
    security: [],
  },
  {
    version: '0.1.0',
    date: '2026-03-14',
    latest: false,
    added: [
      'Initial release of StrapiShift Phase 1 (MVP)',
      '@strapishift/core — schema analysis engine with 14 rules across 7 categories',
      '@strapishift/cli — terminal interface with analyze and verify commands',
      '@strapishift/web — Nuxt 4.4.2 + Nuxt UI 4.5.1 web dashboard',
      'Schema parser supporting single schemas, directories, and Content Type Builder API responses',
      'Parity checker with 5 check types',
      'Four report formats: JSON, HTML (with print stylesheet), Markdown, CSV',
      'Migration readiness scoring and effort estimation',
      'Module registration API for future Phase 2-5 extensions',
      '"Fetch from Instance" — connect to running Strapi v3/v5 to pull schemas automatically',
      'Netlify serverless proxy for CORS-free schema fetching',
      'Dark mode default with light/dark toggle',
      'WCAG 2.1 AA accessibility features',
      '62 tests across core and CLI packages',
    ],
    changed: [],
    fixed: [],
    security: [
      'Serverless proxy: SSRF protection (private IP blocking, URL validation)',
      'Serverless proxy: Rate limiting (10 req/min per IP)',
      'Serverless proxy: Fixed endpoint paths only (/admin/login, /content-type-builder)',
      'No credentials logged, stored, or included in error messages',
    ],
  },
]
</script>
