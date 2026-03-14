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
</script>
