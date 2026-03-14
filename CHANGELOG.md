# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-03-14

### Added
- JSON-LD `SoftwareApplication` structured data for rich search snippets
- `robots.txt` with sitemap reference for search engine and AI crawler guidance
- `llms.txt` following llmstxt.org standard for LLM-friendly site description
- SVG favicon with green arrow on dark background
- Page-level `useHead()` SEO meta on all 5 pages (unique titles and descriptions)
- Canonical URL and `theme-color` meta tags
- Absolute URLs for `og:image` and `twitter:image`

### Changed
- Redesigned OG image: modern dark layout with feature cards (14 rules, 5 checks, 4 formats, 0 data sent), severity badges, and project links
- Updated OG/Twitter titles to "Migrate Strapi to v5" (less version-specific)

## [0.1.3] - 2026-03-14

### Added
- Standalone checklist export on Report and Verify pages (separate from full reports)
- HTML checklist with interactive checkboxes, localStorage progress persistence, progress bar, print-friendly layout, and v3→v5 quick reference
- Markdown checklist with GitHub checkbox items grouped by phase and content type, documentation links
- JSON checklist with unique item IDs and `done` flags for programmatic tracking
- Parity fix checklists (HTML, Markdown, JSON) for contract developer handoff
- "Load Example Schema" button always visible on Analyze page regardless of input mode
- Inline "Load Example Schema" link in Analyze page description

## [0.1.2] - 2026-03-14

### Changed
- HTML report now shows all content types expanded with complete analysis (clean types show detailed pass summaries)
- HTML report includes table of contents, rules-applied table, methodology section, migration checklist, and per-finding metadata (rule ID, impact badges, effort)
- Markdown report rewritten with executive summary table, v3 → v5 code examples (API response, filter syntax, relations, media), rules reference, documentation links
- CSV report now includes summary section, rule categories, content type status, and rows for clean content types
- JSON report enriched with `_metadata` containing all 14 rule descriptions, v3 → v5 quick reference, Strapi documentation links, and methodology
- All parity reporters (JSON, HTML, Markdown, CSV) enhanced with per-category results, v3/v5 value comparison, suggested fix actions, and filterable HTML view
- Landing page now includes detailed technical overview: rule engine architecture, all 14 rules table, scoring methodology, and trust/accuracy section

## [0.1.1] - 2026-03-14

### Fixed
- Netlify deployment: moved `netlify.toml` into `packages/web/` to match monorepo convention
- Set `NITRO_PRESET=netlify` as environment variable for proper serverless function discovery
- Added `_redirects` file routing all requests to the Nitro serverless function
- Bumped Node version to 22 (Node 20.11 lacks `styleText` required by `@clack/core`)
- Enabled SSR (`ssr: true`) for server-rendered HTML instead of blank SPA shell
- Added `.netlify/` to `.gitignore` to prevent build artifacts from being committed

## [0.1.0] - 2026-03-14

### Added
- Initial release of StrapiShift Phase 1 (MVP)
- `@strapishift/core` — schema analysis engine with 14 rules across 7 categories
- `@strapishift/cli` — terminal interface with `analyze` and `verify` commands
- `@strapishift/web` — Nuxt 4.4.2 + Nuxt UI 4.5.1 web dashboard
- Schema parser supporting single schemas, directories, and Content Type Builder API responses
- Rule engine: database, API, media, relation, auth, plugin, and GraphQL rule categories
- Parity checker with 5 check types (content-type presence, field presence, type compatibility, relation integrity, component integrity)
- Four report formats: JSON (LLM-friendly), HTML (with print stylesheet), Markdown (GitHub checklist), CSV
- Migration readiness scoring and effort estimation
- Module registration API for future Phase 2-5 extensions
- "Fetch from Instance" — connect to a running Strapi v3/v5 to pull schemas automatically
- Netlify serverless proxy for CORS-free schema fetching (with SSRF protection, rate limiting)
- Dark mode default with light/dark toggle
- OG image for social media sharing
- 13-document design suite in `/docs`
- 62 tests across core and CLI packages
