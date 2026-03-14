# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
