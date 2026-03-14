# STRAPISHIFT — Doc 11: Architecture Decision Records

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## ADR-001: API-to-API Migration over Direct Database

**Status:** Accepted

**Context:** Data migration from Strapi v3 to v5 can be done by manipulating databases directly (read MongoDB, write SQLite/Postgres) or by using the Strapi REST APIs on both ends.

**Decision:** Use API-to-API migration.

**Rationale:**
- Strapi v5 handles all database internals (junction tables, relation bookkeeping, media management) when content is created through its API.
- The v5 REST API is a documented, stable public contract. The v5 database schema is an undocumented implementation detail that could change between minor versions.
- Built-in validation: the v5 API rejects malformed data with clear errors.
- Works remotely — source and target can be on different machines.
- Incremental and resumable.

**Tradeoffs:**
- Slower than bulk database operations (HTTP overhead per request).
- Cannot preserve original database IDs — tool maintains v3→v5 ID mapping.
- Cannot preserve timestamps through the API — addressed with optional post-migration database patch.
- Requires both instances running during migration.

**Alternatives considered:**
- Direct MongoDB → SQLite migration: rejected due to undocumented v5 schema internals and risk of corrupting Strapi's bookkeeping.
- Strapi export/import: no built-in migration tool exists for v3→v5.

---

## ADR-002: citty over Commander.js for CLI

**Status:** Accepted

**Context:** The CLI needs a command parser and prompt framework.

**Decision:** Use citty (from the UnJS ecosystem).

**Rationale:**
- TypeScript-native — no @types packages needed, full type inference.
- From the UnJS ecosystem (same team behind Nuxt, Nitro, h3) — consistent with the rest of the stack.
- Lighter weight than Commander.js.
- Built-in prompt support for the interactive wizard mode.

**Alternatives considered:**
- Commander.js: mature and widely used, but JavaScript-first with bolted-on types. Heavier.
- yargs: similar maturity concerns, TypeScript support adequate but not native.
- oclif: too heavy for this use case (framework for building CLI suites, not individual tools).

---

## ADR-003: Pnpm Monorepo

**Status:** Accepted

**Context:** The project has multiple packages (core, web, cli, scanner, generator, migrator) that share code and types.

**Decision:** Pnpm workspace monorepo.

**Rationale:**
- Pnpm's `workspace:*` protocol provides clean cross-package references.
- Strict dependency management — prevents phantom dependencies.
- Fast installs via content-addressable storage.
- Consistent with project preferences.

**Alternatives considered:**
- npm workspaces: functional but slower, less strict.
- Turborepo: adds build orchestration, may add value later but premature for initial development.
- Separate repos: rejected — shared types and the core engine need to be in sync.

---

## ADR-004: Parity Checker as Phase 1 Feature

**Status:** Accepted

**Context:** Originally the parity checker was planned as a supporting feature used mainly in Phase 3 (post-generation) and Phase 5 (post-migration). However, an immediate need exists: validating a Strapi v5 instance that was migrated via direct database manipulation by a contract developer.

**Decision:** Elevate the parity checker to a primary Phase 1 deliverable, shipping on day one alongside the analysis engine.

**Rationale:**
- The parity checker shares the schema parser with the analysis engine — no additional dependencies.
- It solves an immediate, real-world problem: verifying a completed migration.
- The HTML fix checklist output is directly useful: hand it to a contractor, say "fix these items."
- It provides standalone value even for developers who never use StrapiShift for migration — it's the "did I miss anything?" safety net.

**Implication:** Phase 1 scope increases. The web UI now includes a `/verify` page. The CLI includes a `verify` command. The HTML parity report with printable fix checklist is a primary output format.

---

## ADR-005: Pure TypeScript Core with No Runtime Dependencies

**Status:** Accepted

**Context:** The core analysis engine needs to run in both the browser (web UI) and Node.js (CLI).

**Decision:** The `@strapishift/core` package has zero runtime dependencies. Pure TypeScript, no Node APIs, no browser APIs.

**Rationale:**
- Runs identically in browser and Node without polyfills or conditional imports.
- Smaller bundle size for the web UI.
- Easier to test — no mocking of external dependencies.
- Forces clean architecture — side effects are pushed to the consuming packages.

**Exception:** Phase 2+ packages (`scanner`, `migrator`) have Node dependencies (`node-fetch`, `form-data`) because they make network requests. These packages only run in Node, never in the browser.

---

## ADR-006: Dark Mode Default with Light/Dark Toggle

**Status:** Accepted (revised)

**Context:** Design decision for the web UI and HTML report exports.

**Decision:** Dark mode as default. Light/dark toggle available in the app header. Preference persisted to `localStorage`.

**Rationale:**
- Dark mode is the dominant preference for the developer audience.
- Light mode is necessary for WCAG AA 2.1 compliance — some users with visual impairments prefer light backgrounds.
- Exported HTML reports include a `@media print` stylesheet that forces light mode for paper output.
- Nuxt UI v4 has built-in `colorMode` support with seamless toggling.
- Both themes must meet WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text).

---

## ADR-007: Four Output Formats (JSON, HTML, Markdown, CSV)

**Status:** Accepted

**Context:** Reports need to serve different audiences and use cases.

**Decision:** Every report (migration analysis, parity check, verification) is produced in four formats.

**Rationale:**
- JSON: machine-readable, LLM-friendly. Feed to an LLM for automated code generation. Integrate into CI pipelines.
- HTML: human-readable dashboard. Self-contained single file. Printable fix checklist for parity reports.
- Markdown: GitHub-friendly. Commit to repo as audit trail. Use as issue template.
- CSV: spreadsheet-friendly. Sort, filter, assign findings in Excel/Sheets. Project management.

Each format serves a distinct workflow. Removing any one would create a gap.

---

## ADR-008: Vitest for Testing

**Status:** Accepted

**Context:** Need a test framework compatible with TypeScript, ESM, and the Nuxt/UnJS ecosystem.

**Decision:** Vitest for all packages.

**Rationale:**
- Native TypeScript and ESM support.
- Compatible with Vite (used by Nuxt).
- Fast — parallel test execution, smart watch mode.
- Compatible with Jest's API (low learning curve).
- Workspace support for monorepo testing.

---

## ADR-009: Netlify for Phase 1, DigitalOcean/Forge for Phase 2+

**Status:** Accepted

**Context:** Phase 1 is fully client-side. Phase 2+ requires a backend.

**Decision:** Deploy Phase 1 to Netlify (static). Move to DigitalOcean with Laravel Forge when backend is needed.

**Rationale:**
- Phase 1 has zero backend requirements — Netlify is simpler, cheaper, and faster for static sites.
- Phase 2 introduces API proxying (scanner connects to v3 instances), which requires server-side code. Netlify serverless functions could work but have limitations (timeout, bundle size).
- DigitalOcean via Laravel Forge is the established deployment pattern — nginx built-in, easy Let's Encrypt SSL, PM2 for process management.

**Transition trigger:** When Phase 2 is ready for deployment.

---

## 10. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial 9 ADRs | Chris |
