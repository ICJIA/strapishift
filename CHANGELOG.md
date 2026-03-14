# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
