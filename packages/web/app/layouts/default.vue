<template>
  <div class="min-h-screen bg-(--ui-bg) text-(--ui-text-highlighted) flex flex-col">
    <!-- Skip to content -->
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-green-500 focus:text-gray-950 focus:font-semibold focus:outline-none"
    >
      Skip to main content
    </a>

    <!-- Navbar -->
    <header class="border-b border-(--ui-border) bg-(--ui-bg)/80 backdrop-blur-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-8">
            <NuxtLink to="/" class="text-xl font-bold hover:text-green-400 transition-colors" aria-label="StrapiShift home">
              StrapiShift
            </NuxtLink>
            <UNavigationMenu :items="navItems" class="hidden md:flex" aria-label="Main navigation" />
          </div>

          <div class="flex items-center gap-3">
            <UButton
              :icon="colorMode.preference === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              :aria-label="colorMode.preference === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              @click="toggleColorMode"
            />
            <UButton
              icon="i-lucide-menu"
              color="neutral"
              variant="ghost"
              class="md:hidden"
              aria-label="Open navigation menu"
              :aria-expanded="mobileMenuOpen"
              @click="mobileMenuOpen = !mobileMenuOpen"
            />
          </div>
        </div>

        <!-- Mobile menu -->
        <nav v-if="mobileMenuOpen" class="md:hidden pb-4" aria-label="Mobile navigation">
          <div class="flex flex-col gap-2">
            <template v-for="link in navLinks" :key="link.to">
              <a
                v-if="link.to.startsWith('http')"
                :href="link.to"
                target="_blank"
                rel="noopener"
                class="text-sm font-medium text-(--ui-text-muted) hover:text-(--ui-text-highlighted) transition-colors px-2 py-1"
                @click="mobileMenuOpen = false"
              >
                {{ link.label }}
              </a>
              <NuxtLink
                v-else
                :to="link.to"
                class="text-sm font-medium text-(--ui-text-muted) hover:text-(--ui-text-highlighted) transition-colors px-2 py-1"
                active-class="!text-(--ui-text-highlighted)"
                @click="mobileMenuOpen = false"
              >
                {{ link.label }}
              </NuxtLink>
            </template>
          </div>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main id="main-content" class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-(--ui-border) py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-(--ui-text-muted)">
            MIT License &mdash; Built by
            <a
              href="https://icjia.illinois.gov"
              target="_blank"
              rel="noopener"
              class="text-(--ui-text-dimmed) hover:text-(--ui-text-highlighted) transition-colors"
            >ICJIA</a>
          </p>
          <div class="flex items-center gap-4">
            <a
              href="https://github.com/ICJIA/strapishift"
              target="_blank"
              rel="noopener"
              class="text-sm text-(--ui-text-muted) hover:text-(--ui-text-highlighted) transition-colors"
            >
              GitHub
            </a>
            <span class="text-(--ui-border)" aria-hidden="true">|</span>
            <a href="https://github.com/ICJIA/strapishift/blob/main/CHANGELOG.md" target="_blank" rel="noopener" class="text-sm text-(--ui-text-muted) hover:text-(--ui-text-highlighted) transition-colors">
              Changelog
            </a>
          </div>
        </div>
      </div>
    </footer>

    <!-- Status bar -->
    <div class="border-t border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-1.5 text-xs text-(--ui-text-muted) flex items-center justify-between" role="contentinfo" aria-label="Application status">
      <div class="flex items-center gap-3">
        <span>StrapiShift v{{ appVersion }}</span>
        <span aria-hidden="true">&middot;</span>
        <span>Nuxt {{ nuxtVersion }}</span>
      </div>
      <div class="flex items-center gap-3">
        <a href="https://github.com/ICJIA/strapishift" target="_blank" rel="noopener" class="hover:text-(--ui-text-highlighted) transition-colors">
          github.com/ICJIA/strapishift
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
const mobileMenuOpen = ref(false)

const appVersion = '0.1.2'
const nuxtVersion = '4.4.2'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Analyze', to: '/analyze' },
  { label: 'Verify', to: '/verify' },
  { label: 'Changelog', to: 'https://github.com/ICJIA/strapishift/blob/main/CHANGELOG.md' },
  { label: 'About', to: '/about' },
]

const navItems = navLinks.map(link => ({
  label: link.label,
  to: link.to,
}))

function toggleColorMode() {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}
</script>
