export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark'
  },
  ssr: true,
  site: {
    url: 'https://strapishift.com',
    name: 'StrapiShift',
  },

  app: {
    head: {
      title: 'StrapiShift — Strapi v3 → v5 Migration Platform',
      meta: [
        { name: 'description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { property: 'og:title', content: 'StrapiShift — Strapi v3 → v5 Migration Platform' },
        { property: 'og:description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { property: 'og:image', content: '/og-image.png' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'StrapiShift — Strapi v3 → v5 Migration Platform' },
        { name: 'twitter:description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { name: 'twitter:image', content: '/og-image.png' },
      ],
      htmlAttrs: { lang: 'en' }
    }
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  },

  compatibilityDate: '2025-01-01'
})
