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
    url: 'https://strapishift.icjia.app',
    name: 'StrapiShift',
  },

  app: {
    head: {
      title: 'StrapiShift — Strapi v3 → v5 Migration Platform',
      meta: [
        { name: 'description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { property: 'og:title', content: 'StrapiShift — Migrate Strapi to v5' },
        { property: 'og:description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { property: 'og:image', content: 'https://strapishift.icjia.app/og-image.png' },
        { property: 'og:url', content: 'https://strapishift.icjia.app' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'StrapiShift — Migrate Strapi to v5' },
        { name: 'twitter:description', content: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.' },
        { name: 'twitter:image', content: 'https://strapishift.icjia.app/og-image.png' },
        { property: 'og:image:alt', content: 'StrapiShift — Migrate Strapi to v5. Automated schema analysis with 14 rules, parity verification, 4 export formats, and client-side only processing.' },
        { name: 'twitter:image:alt', content: 'StrapiShift — Migrate Strapi to v5. Automated schema analysis with 14 rules, parity verification, 4 export formats, and client-side only processing.' },
        { name: 'theme-color', content: '#0f172a' },
      ],
      link: [
        { rel: 'canonical', href: 'https://strapishift.icjia.app' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'StrapiShift',
            description: 'Automated schema analysis, parity verification, and migration reporting for Strapi v3 to v5 migrations.',
            url: 'https://strapishift.icjia.app',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web, macOS, Linux, Windows',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            license: 'https://opensource.org/licenses/MIT',
            datePublished: '2026-03-14',
            dateModified: '2026-03-14',
            softwareVersion: '0.1.5',
            author: {
              '@type': 'Organization',
              name: 'Illinois Criminal Justice Information Authority',
              url: 'https://icjia.illinois.gov',
            },
          }),
        },
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
