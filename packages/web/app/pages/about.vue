<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-bold mb-6">About StrapiShift</h1>

    <div class="space-y-8">
      <UCard>
        <div class="space-y-4 text-(--ui-text-muted) leading-relaxed">
          <p class="text-lg">
            <strong class="text-(--ui-text-highlighted)">StrapiShift</strong> is an open-source migration analysis platform
            that helps development teams upgrade from Strapi v3 to Strapi v5 with confidence.
          </p>
          <p>
            Built from real-world migration experience at the
            <a href="https://icjia.illinois.gov" target="_blank" rel="noopener" class="text-green-400 hover:underline">ICJIA</a>,
            StrapiShift encodes hard-won domain knowledge into an automated rule engine.
          </p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Features</h2>
        </template>
        <ul class="space-y-2 text-(--ui-text-muted)">
          <li>14 migration rules across 7 categories</li>
          <li>Field-by-field parity verification</li>
          <li>Migration readiness scoring and effort estimation</li>
          <li>Export in JSON, HTML, Markdown, CSV</li>
          <li>CLI and web interfaces</li>
        </ul>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Links</h2>
        </template>
        <div class="flex flex-wrap gap-3">
          <UButton to="https://github.com/ICJIA/strapishift" target="_blank" label="GitHub" color="neutral" variant="outline" />
          <UButton to="/analyze" label="Try It Now" color="success" />
        </div>
      </UCard>

      <p class="text-sm text-(--ui-text-muted)">
        MIT License &copy; 2026 Illinois Criminal Justice Information Authority
      </p>
    </div>
  </div>
</template>
