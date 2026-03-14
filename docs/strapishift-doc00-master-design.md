# STRAPISHIFT — Doc 00: Master Design Document

**Strapi v3 → v5 Migration Platform**

Version 1.0.0 | March 14, 2026 | Status: Draft

---

## 1. Executive Summary

StrapiShift is a migration analysis and verification platform for Strapi v3 → v5 migrations. The core product — **the MVP** — is Phase 1: schema analysis, parity verification, and migration reporting, delivered through both a web dashboard (Nuxt 4.4.2 + Nuxt UI 4.5.1) and a CLI tool, organized as a pnpm monorepo.

Additional capabilities — live instance scanning (Phase 2), schema generation (Phase 3), migration script generation (Phase 4), and managed migration execution (Phase 5) — are designed as **optional modules** that extend the core product. The module architecture ensures Phase 1 is complete and useful on its own, while providing clean extension points for future capabilities.

The core insight driving this project: every Strapi v3 → v5 migration currently requires a developer to manually audit schemas, discover breaking changes when things break, and build migration scripts from scratch. StrapiShift automates the analysis and verification layer, encoding hard-won domain knowledge from real migrations into a rule engine that identifies every breaking change, maps corrective actions, and produces structured reports in four formats.

**Critical architectural decision (for future modules):** Data migration modules use the API-to-API approach (read from v3 REST API, write to v5 REST API) rather than direct database manipulation. This lets Strapi v5 handle all database internals — junction tables, relation bookkeeping, media management — while StrapiShift focuses on content transformation. The v5 API is a stable, documented public contract; the v5 database schema is an implementation detail.

### 1.1 MVP Definition

The MVP is Phase 1. It ships as a complete, standalone product:

- **`@strapishift/core`** — Analysis engine, rule system, parity checker, reporters
- **`@strapishift/web`** — Nuxt 4.4.2 + Nuxt UI 4.5.1 web dashboard
- **`@strapishift/cli`** — Terminal interface via citty

A developer can analyze a Strapi v3 schema, receive an actionable migration report, verify a completed migration against the v3 source, and export results in four formats — without any additional modules installed. The MVP is deployed to Netlify (fully client-side) and published to npm.

Phases 2–5 are separate modules that can be developed, published, and installed independently. They are not required. They are not part of the v1.0 release.

---

## 2. Project Overview

### 2.1 Problem Statement

Migrating from Strapi v3 to Strapi v5 is a significant undertaking with no automated tooling. Developers must manually navigate breaking changes across database engines, API response formats, relation storage, media handling, plugin ecosystems, and authentication models.

Common pain points discovered during the ICJIA ResearchHub migration:

- Base64-encoded images stored directly in rich text fields rather than as media library references — a widespread v3 pattern that silently breaks during migration
- MongoDB → SQLite/Postgres paradigm shift requiring restructuring of nested documents, arrays, and polymorphic references
- API response envelope changes (data.attributes flattening) breaking every frontend consumer
- Relation storage format changes invalidating existing queries
- Plugin ecosystem gaps between v3 and v5

### 2.2 Solution

StrapiShift is structured as a core product with optional modules:

**Core Product (MVP — v1.0)**

| Component | Description | Deliverable |
|-----------|-------------|-------------|
| **Schema Analysis** | Parse v3 schemas, run rule engine, produce migration report | Migration report (JSON, HTML, MD, CSV) |
| **Parity Verification** | Verify v3/v5 structural parity with exportable fix checklist | Parity report with printable HTML fix checklist |

**Optional Modules (post-v1.0)**

| Module | Phase | Description | Deliverable |
|--------|-------|-------------|-------------|
| **`@strapishift/scanner`** | 2 | Connect to running v3 instance, detect Base64 images, count affected records | Enhanced report with data-level findings |
| **`@strapishift/generator`** | 3 | Produce complete v5 content type schemas from analysis | Complete `src/api/` directory for v5 |
| **`@strapishift/migrator`** | 4–5 | Generate and execute custom API-to-API migration scripts | Runnable migration script package + verification report |

### 2.3 Target Audience

- State and local government agencies running Strapi v3 (common adoption window: 2019–2022)
- Contract developers managing Strapi migrations for multiple clients
- Nuxt/Vue agencies that adopted Strapi v3 early and need to upgrade
- The Strapi open-source community

---

## 3. Architecture

### 3.1 Monorepo Structure

```
strapishift/
├── packages/
│   ├── core/         @strapishift/core      Analysis engine + rule system + parity checker
│   ├── web/          @strapishift/web       Nuxt 4.4.2 + Nuxt UI 4.5.1
│   ├── cli/          @strapishift/cli       Terminal interface (citty)
│   │
│   │   ── Optional Modules (post-v1.0) ──
│   ├── scanner/      @strapishift/scanner   Live instance connector
│   ├── generator/    @strapishift/generator v5 schema generator
│   └── migrator/     @strapishift/migrator  Script generator + runner
├── docs/                  13-doc design suite
├── strapishift.config.ts        Single source of truth (see Section 3.6)
├── pnpm-workspace.yaml
├── package.json
├── .nvmrc                       Node.js version pin
├── .gitignore
└── LICENSE                      MIT
```

**Package manager:** pnpm is the only supported package manager for this project. All commands, CI scripts, and documentation reference pnpm exclusively. The root `package.json` includes `"packageManager": "pnpm@9.15.0"` to enforce this via corepack.

### 3.2 Package Dependency Graph

All packages depend on `@strapishift/core`. No circular dependencies. Each module is independent of other modules. The parity checker lives in `@strapishift/core` because it shares the schema parser — it is used by Phase 1 and reused by any module that needs verification.

**Core Product (v1.0):**
```
core (includes parity checker)  ←  web, cli
```

**With Optional Modules (post-v1.0):**
```
core  ←  scanner, generator, migrator
scanner  ←  web (if installed), cli (if installed)
generator  ←  web (if installed), cli (if installed)
migrator  ←  cli (if installed), web (if installed)
```

### 3.3 Module Architecture

Modules extend the core product without modifying it. The core defines extension points; modules register against them.

```typescript
// @strapishift/core — module registration
interface StrapiShiftModule {
  name: string;                          // e.g., "@strapishift/scanner"
  phase: number;                         // 2, 3, 4, or 5
  description: string;
  cliCommands?: CliCommandDefinition[];  // commands this module adds
  reportEnhancers?: ReportEnhancer[];    // additional report sections
  dependencies?: string[];               // other modules required
}

const moduleRegistry = new Map<string, StrapiShiftModule>();

export function registerModule(mod: StrapiShiftModule): void {
  if (mod.dependencies?.some(d => !moduleRegistry.has(d))) {
    throw new Error(`Missing dependency: ${mod.dependencies.filter(d => !moduleRegistry.has(d)).join(', ')}`);
  }
  moduleRegistry.set(mod.name, mod);
}

export function getRegisteredModules(): StrapiShiftModule[] {
  return Array.from(moduleRegistry.values());
}
```

**CLI module discovery:** The CLI auto-discovers installed `@strapishift/*` packages at startup and registers their commands. Uninstalled modules are shown as grayed-out options in the interactive wizard with install instructions.

**Web module discovery:** The Nuxt app uses a runtime plugin that checks for installed module packages. Module pages and navigation items are conditionally rendered based on which modules are available. Unavailable modules show a "not installed" placeholder page with `pnpm add` instructions.

**Key constraint:** The core product (core + web + cli) must never import from or reference module packages at build time. Module integration is always runtime discovery, never compile-time dependency.

**Module discovery mechanism:** CLI and web discover modules via Node.js `require.resolve()` / dynamic `import()` wrapped in try/catch. The known module package names are hardcoded (`@strapishift/scanner`, `@strapishift/generator`, `@strapishift/migrator`). If a package resolves, it is imported and its `registerModule()` call executes. If it does not resolve, the module is treated as not installed. This avoids filesystem walking or npm queries.

### 3.4 Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Frontend | Nuxt 4.4.2 + Nuxt UI 4.5.1 | Dark mode default, light/dark toggle |
| CLI framework | citty (UnJS) | TypeScript-native, Nuxt ecosystem |
| Package manager | pnpm | Workspace monorepo (only supported manager) |
| Language | TypeScript (strict) | All packages |
| Testing | Vitest | Unit + integration |
| Deploy (Phase 1) | Netlify | Static/SSR, client-side only |
| Deploy (Phase 2+) | DigitalOcean / Laravel Forge | When backend required |
| Database | None (Phase 1–3) / SQLite (Phase 5) | Progress tracking only |
| License | MIT | See LICENSE in project root |

### 3.5 Project Root Files

| File | Purpose |
|------|---------|
| `strapishift.config.ts` | **Single source of truth** for project-wide configuration (see Section 3.6) |
| `.nvmrc` | Pins Node.js version (e.g., `20.11.0`) for all contributors |
| `.gitignore` | Standard ignores: `node_modules/`, `dist/`, `.nuxt/`, `.output/`, `.tmp/`, `*.local`, `.env`, `coverage/`, `migration-temp/` |
| `LICENSE` | MIT license |
| `pnpm-workspace.yaml` | Workspace package definitions |
| `.npmrc` | pnpm configuration (`shamefully-hoist=true`, `strict-peer-dependencies=false`) |

### 3.6 strapishift.config.ts — Single Source of Truth

All packages read shared configuration from `strapishift.config.ts` in the project root. This file is the single source of truth for values that would otherwise be duplicated across packages.

```typescript
// strapishift.config.ts
import { defineConfig } from '@strapishift/core';

export default defineConfig({
  // Project metadata
  name: 'strapishift',
  version: '1.0.0',

  // Source and target Strapi versions
  sourceVersion: '3.x',
  targetVersion: '5.x',

  // Report defaults
  reports: {
    formats: ['json', 'html', 'md', 'csv'],
    outputDir: './strapishift-report',
  },

  // Rule engine configuration
  rules: {
    // Enable/disable specific rule categories
    database: true,
    api: true,
    media: true,
    relation: true,
    auth: true,
    plugin: true,
    graphql: true,
  },

  // Module configuration (populated when modules are installed)
  modules: {},
});
```

The `defineConfig()` helper provides type safety and validation. The config is loaded by `@strapishift/core` at initialization and passed to all consumers (web, cli, modules). Individual packages never define their own copies of these values.

### 3.7 Migration Strategy: API-to-API (Modules)

StrapiShift uses the API-to-API migration approach: read content from the Strapi v3 REST API and write to the Strapi v5 REST API.

**Why API-to-API:**

- Strapi v5 handles all database internals: junction tables, relation bookkeeping, media management, internal fields
- The v5 REST API is a documented, stable public contract; the database schema is an undocumented implementation detail
- Built-in validation: the v5 API rejects malformed data with clear errors rather than silently writing bad records
- Works remotely: source and target instances can be on different machines/networks
- Incremental and resumable: migrate one content type at a time, verify, continue

**Known Tradeoffs:**

- Slower than bulk database operations for large datasets (HTTP overhead)
- Cannot preserve original database IDs (v5 assigns new IDs) — tool maintains a v3 → v5 ID mapping
- Cannot preserve original timestamps through the API — tool applies a post-migration timestamp patch via targeted database update
- Requires both v3 and v5 instances to be running during migration

---

## 4. Core Analysis Engine

### 4.1 Rule Engine Architecture

The analysis engine is a pure TypeScript library with no runtime dependencies on Node or browser APIs. It takes a normalized Strapi v3 schema as input and produces a structured findings report.

Every rule is a pure function: content type in, findings out. No side effects. Rules are registered in a central registry and executed in sequence against each content type.

### 4.2 Rule Categories

| Category | What It Detects | Source Knowledge |
|----------|----------------|-----------------|
| **database** | MongoDB → SQL field naming (`_id` → `id`), nested document flattening, relation storage format | ResearchHub migration |
| **api** | Response envelope changes, populate syntax, filter syntax (`_where` → `filters`), pagination format | Strapi v5 docs + experience |
| **media** | Base64-encoded images in rich text, media library reference format, upload provider config | ResearchHub (critical) |
| **relation** | Cardinality syntax changes, population behavior, junction table format | Strapi v5 docs |
| **auth** | Users & Permissions plugin API changes, role format, JWT config | Strapi v5 docs |
| **plugin** | v3 plugins without v5 equivalents, i18n breaking changes | Strapi v5 docs |
| **graphql** | GraphQL plugin changes, schema differences, resolver patterns | ICJIA Apollo migration |

### 4.3 Severity Levels

| Severity | Meaning | Example |
|----------|---------|---------|
| **info** | Informational change, no action required or trivial fix | Field naming convention updated but auto-handled by v5 |
| **warning** | Breaking change that requires developer action | API filter syntax changed; frontend queries need updating |
| **blocker** | Migration cannot proceed without resolving this issue | Base64 images in rich text fields must be extracted first |

### 4.4 Finding Data Structure

```typescript
interface Finding {
  ruleId: string;              // unique rule identifier
  contentType: string;          // affected content type
  field?: string;               // affected field (if field-level)
  severity: 'info' | 'warning' | 'blocker';
  title: string;                // human-readable title
  description: string;          // detailed explanation
  action: string;               // what the developer must do
  effort: 'low' | 'medium' | 'high';
  docsUrl?: string;             // link to Strapi v5 docs
  affectsApi: boolean;          // changes external API contract?
  affectsDatabase: boolean;     // changes database structure?
}
```

---

## 5. Output Formats

| Format | Audience | Use Case | Key Features |
|--------|----------|----------|--------------|
| **JSON** | LLMs, CI pipelines, other tools | Feed to an LLM for migration code generation | Full findings array with metadata, summary statistics, migration checklist |
| **HTML** | Developers, managers | Interactive review of migration scope and effort | Traffic-light dashboard, expandable content types, severity filtering, self-contained single file |
| **Markdown** | GitHub repos, documentation | Commit as migration audit trail | Checklist format with task items, phase-organized, GitHub-compatible |
| **CSV** | Spreadsheet users, PMs | Sort, filter, assign findings in Excel/Sheets | Flat table: content type, field, severity, action, effort, category |

All four formats are generated by the shared `@strapishift/core` package. Both the web UI and CLI have access to all formats. The JSON format is specifically designed to be self-contained — it includes enough context that an LLM can generate migration code from it without additional input.

---

## 6. Phase Specifications

Phase 1 is the core product (MVP). It ships as v1.0 and stands alone. Phases 2–5 are optional modules developed and released independently after v1.0.

### 6.1 Phase 1 — Core Product (MVP): Schema Analysis, Parity Verification & Migration Report

**Package:** `@strapishift/core` + `@strapishift/web` + `@strapishift/cli`
**Deploy:** Netlify (fully client-side for analysis; Nitro server route for live v5 parity checks)

#### Inputs

- Strapi v3 content type schema JSON (paste or file upload)
- Optional: entire `api/` directory (zip upload for web, path for CLI)
- For parity checking: v5 schema files OR live v5 instance URL + token

#### Outputs

- Migration report in all four formats (JSON, HTML, Markdown, CSV)
- Traffic-light summary per content type (✅ clean / ⚠️ warning / 🔴 blocker)
- Per-field remediation plan with severity, action, effort, and docs links
- Exportable checklist organized by migration phase
- **Parity verification report** — structural comparison of v3 source against v5 target with downloadable HTML fix checklist identifying every missing content type, missing field, type mismatch, and broken relation

#### Working Deliverable

A user can visit the web app, paste a Strapi v3 schema.json, click Analyze, and download a complete migration report. A developer can run `strapishift analyze schema.json` from the terminal and get the same report. Additionally, a developer can run `strapishift verify` to compare their existing v5 instance against the v3 source and receive a detailed parity report with an actionable fix checklist — critical for validating migrations that were performed manually or via direct database manipulation.

#### Test Suite

**Unit tests (core):** Rule engine tests — one test file per rule category. Each test provides a known v3 schema fragment and asserts the correct findings are produced.

- `database-rules.test.ts` — test `_id` → `id` detection, nested document flagging
- `api-rules.test.ts` — test filter/populate/pagination syntax detection
- `media-rules.test.ts` — test Base64 candidate flagging for rich text fields
- `relation-rules.test.ts` — test cardinality syntax change detection
- `auth-rules.test.ts` — test Users & Permissions changes
- `plugin-rules.test.ts` — test plugin gap detection
- `graphql-rules.test.ts` — test GraphQL plugin changes

**Unit tests (reporters):** Each reporter produces valid output from a known findings set.

- `json-reporter.test.ts` — output is valid JSON, contains all required fields
- `html-reporter.test.ts` — output is valid HTML, contains all content types
- `markdown-reporter.test.ts` — output contains checklist items for all findings
- `csv-reporter.test.ts` — output is valid CSV with correct column count

**Integration tests:** End-to-end schema analysis with real-world v3 schemas.

- Use the actual ResearchHub v3 schema as a test fixture
- Verify the known Base64 image issue is flagged as a blocker
- Verify all 50 items from the original manual checklist appear in output

**CLI tests:** Command execution tests.

- `strapishift analyze` with valid schema → exit code 0, report written
- `strapishift analyze` with invalid JSON → exit code 1, clear error
- `strapishift analyze` with `--format` flag → correct format produced
- `strapishift` (no args) → interactive wizard launches

**Web tests:** Component and page tests.

- SchemaInput accepts JSON paste and file upload
- ReportDashboard renders correct traffic-light summary
- ExportMenu produces downloadable files in all four formats

**Acceptance criteria:** All tests pass. A developer can analyze a real Strapi v3 schema and receive an accurate, actionable migration report in under 5 seconds.

---

### 6.2 Module: Phase 2 — Live Instance Scanning & Base64 Detection

**Package:** `@strapishift/scanner` (optional module)
**Deploy:** DigitalOcean / Laravel Forge (requires backend for API proxying)

#### Inputs

- Strapi v3 API URL + API token
- Optional: specific content types to scan (default: all)
- Optional: sample size per content type (default: 100 records)

#### Outputs

- Enhanced migration report with data-level findings
- Base64 image scan results: affected content types, affected field names, affected record count, estimated total volume
- Media library inventory: total media entries, orphaned references, format distribution
- Actual record counts per content type (for migration effort estimation)

#### Working Deliverable

A user provides their v3 API URL and token. StrapiShift connects to the live instance, pulls schemas programmatically, samples content records, and produces an enhanced report that includes data-level findings. The Base64 scanner specifically identifies which content types have embedded images and how many records are affected.

#### Test Suite

**Unit tests (scanner):**

- Schema pull from mock v3 API endpoint returns expected content types
- Base64 detector correctly identifies `data:image/` strings in rich text content
- Base64 detector ignores legitimate URLs and non-Base64 image references
- Media inventory correctly counts entries and identifies orphans
- Record counter handles pagination correctly (v3 uses `_start`/`_limit`)

**Integration tests:**

- Scan against a Docker-hosted Strapi v3 instance with known test data
- Verify Base64 images in test data are correctly detected and counted
- Verify scan handles connection errors, auth failures, and timeouts gracefully
- Verify scan respects sample size limits and doesn't overload v3 instance

**CLI tests:**

- `strapishift scan` with valid URL/token → enhanced report produced
- `strapishift scan` with invalid token → clear auth error
- `strapishift scan` with unreachable URL → clear connection error

**Acceptance criteria:** All tests pass. A developer can point StrapiShift at a running Strapi v3 instance and receive a data-aware migration report, including a precise count of records containing Base64 images.

---

### 6.3 Module: Phase 3 — v5 Schema Generation

**Package:** `@strapishift/generator` (optional module)
**Deploy:** Same as Phase 2 infrastructure

#### Inputs

- Phase 1 or Phase 2 analysis results (the MigrationReport JSON)
- Optional: custom field type mappings (override defaults)
- Optional: target database engine preference (SQLite or Postgres)

#### Outputs

- Complete Strapi v5 `src/api/` directory structure with all content type schemas
- Component definitions translated to v5 format
- Per-content-type README documenting what changed and why
- A Strapi v5 project scaffold that can be initialized with `strapi develop`

#### Working Deliverable

A developer runs the generator against their analysis report. StrapiShift produces a complete set of v5 content type schema files. The developer creates a fresh Strapi v5 project, drops the generated schemas into `src/api/`, runs `strapi develop`, and Strapi v5 boots with the correct content type structure. No manual schema writing required.

#### Test Suite

**Unit tests (generator):**

- Each v3 field type produces a valid v5 field definition
- Relation fields generate correct v5 cardinality syntax
- Component fields generate valid v5 component references
- Dynamic zone fields generate valid v5 dynamic zone definitions
- Generated schemas pass JSON Schema validation against v5 content type spec

**Integration tests:**

- Generate v5 schemas from the ResearchHub v3 schema fixture
- Boot a Strapi v5 instance (Docker) with generated schemas — verify startup succeeds with no errors
- Verify all content types appear in v5 admin panel
- Verify all fields have correct types and configurations
- Verify relations between content types are intact

**CLI tests:**

- `strapishift generate` with valid report → v5 schema files written
- `strapishift generate` with `--output` flag → files written to specified directory
- `strapishift generate` with invalid report → clear validation error

**Acceptance criteria:** All tests pass. Generated schemas boot a clean Strapi v5 instance with correct content types, fields, relations, and components. Zero manual schema editing required.

---

### 6.4 Module: Phase 4 — Migration Script Generation

**Package:** `@strapishift/migrator` (optional module)
**Deploy:** CLI-primary (scripts run locally); web UI for configuration

#### Inputs

- Phase 1/2 analysis results (MigrationReport JSON)
- Confirmed v5 schema from Phase 3
- v3 API URL + token
- v5 API URL + token
- Migration options: batch size, dry-run flag, timestamp preservation flag

#### Outputs

- A custom Node.js migration script package tailored to the specific v3 instance
- Content type migration files ordered by dependency graph
- Media migration module (download from v3, upload to v5, map references)
- Base64 extraction module (extract, upload, replace in rich text)
- ID mapping persistence (v3 ID → v5 ID)
- Progress tracking and resume capability
- Dry-run mode for validation without writes
- README with execution instructions

#### Generated Script Structure

```
migration/
├── migrate.ts                  main orchestrator
├── config.ts                   source/target URLs, tokens, options
├── content-types/
│   ├── 01-author.ts            Author migration (dependency order)
│   ├── 02-category.ts          Category migration
│   ├── 03-article.ts           Article migration (depends on Author, Category)
│   └── ...
├── media/
│   ├── media-migrator.ts       download from v3, upload to v5
│   └── base64-extractor.ts     extract Base64, upload, replace references
├── utils/
│   ├── id-map.ts               v3 ID → v5 ID mapping persistence
│   ├── progress.ts             resume tracking
│   └── verify.ts               post-migration verification
├── dry-run.ts                  validate without writing
└── README.md                   what this script does, how to run it
```

#### Working Deliverable

A developer runs the script generator. StrapiShift produces a complete, runnable migration script package in a specified directory. The developer reviews the scripts, makes any instance-specific adjustments, and runs the migration. The scripts read from the v3 API, transform content, and write to the v5 API.

#### Test Suite

**Unit tests (migrator):**

- Dependency graph correctly orders content types (referenced types before referencing types)
- Content transformers correctly map v3 field values to v5 format
- ID mapper correctly persists and retrieves v3 → v5 ID mappings
- Media migrator generates correct download/upload sequences
- Base64 extractor correctly identifies and extracts embedded images from rich text
- Dry-run mode performs all transforms but writes nothing to v5

**Integration tests:**

- Generate migration scripts from ResearchHub analysis fixture
- Execute generated scripts against Docker-hosted v3 and v5 instances with known test data
- Verify all records migrated correctly (field values, relations, media references)
- Verify Base64 images extracted and re-uploaded as media library entries
- Verify ID mapping file is complete and accurate
- Verify migration resumes correctly after simulated interruption

**CLI tests:**

- `strapishift migrate` with valid inputs → script package generated
- `strapishift migrate --dry-run` → validation passes, no writes to v5
- `strapishift migrate` with missing v5 instance → clear connection error

**Acceptance criteria:** All tests pass. Generated migration scripts successfully move all content from a test v3 instance to a v5 instance via API-to-API transfer. All records, relations, and media are intact. Base64 images are extracted and properly referenced.

---

### 6.5 Module: Phase 5 — Migration Runner & Verification Dashboard

**Package:** `@strapishift/migrator` (extended, optional module) + `@strapishift/web` (dashboard extensions)
**Deploy:** DigitalOcean / Laravel Forge

#### Inputs

- Generated migration scripts from Phase 4
- Running v3 and v5 instances
- Migration configuration (batch size, concurrency, retry policy)

#### Outputs

- Live progress dashboard (web UI) or terminal progress display (CLI)
- Real-time status per content type: pending, in-progress, complete, failed
- Error queue with full context for failed records (retryable individually)
- Post-migration verification report: record counts, field completeness, relation integrity, media availability
- Final migration summary: total migrated, total failed, total skipped, elapsed time

#### Working Deliverable

A developer launches the migration runner from the web UI or CLI. StrapiShift executes the migration scripts with live progress tracking. The dashboard shows real-time status per content type, surfaces errors immediately, and provides retry capability for failed records. After completion, a verification suite runs automatically.

#### Test Suite

**Unit tests (runner):**

- Progress tracker correctly updates state for each content type
- Error queue captures failed records with full error context
- Retry mechanism re-attempts failed records with correct backoff
- Batch processor respects configured batch size and concurrency limits

**Unit tests (verifier):**

- Record count comparison detects missing records
- Field completeness check identifies null fields that should have values
- Relation integrity check verifies all referenced records exist in v5
- Media availability check confirms all media files are accessible

**Integration tests:**

- Full end-to-end migration of test v3 instance → v5 instance via runner
- Simulate network interruption during migration → verify resume works
- Simulate v5 API errors → verify error queue captures and retry works
- Verification suite correctly identifies intentionally introduced discrepancies

**Web dashboard tests:**

- Progress display updates in real-time during migration
- Error queue displays failed records with context
- Retry button re-attempts individual failed records
- Verification report renders after migration completion

**Acceptance criteria:** All tests pass. A complete Strapi v3 instance can be migrated to v5 with live progress tracking, error handling, and automated post-migration verification. The final verification report confirms data integrity.

---

## 7. CLI Specification

### 7.1 Command Reference

```
strapishift analyze <schema>           Analyze v3 schema, produce report
  --format json,html,md,csv             Output formats (default: all)
  --output <file>                       Output file path
  --output-dir <dir>                    Output directory (for multiple formats)
  --recursive                           Scan entire api/ directory
  --quiet                               Suppress terminal output (for piping)

strapishift verify                      Check v3/v5 parity (schema or data)
  --v3-schema <file>                    Path to v3 schema or api/ directory
  --v5-schema <file>                    Path to v5 schema or api/ directory
  --v3-url <url>                        Live v3 instance URL (for data parity)
  --v3-token <token>                    v3 API token
  --v5-url <url>                        Live v5 instance URL
  --v5-token <token>                    v5 API token
  --data                                Include data-level parity (record counts, relations)
  --format json,html,md,csv             Output formats (default: json,md)

strapishift scan                        Scan live v3 instance
  --url <url>                           Strapi v3 API URL
  --token <token>                       API token
  --sample-size <n>                     Records to sample per type (default: 100)
  --content-types <types>               Specific types to scan (comma-sep)

strapishift generate                    Generate v5 schema files
  --input <report.json>                 Analysis report to use
  --output <dir>                        Output directory for v5 schemas
  --db-engine sqlite|postgres           Target database (default: sqlite)

strapishift migrate                     Generate migration scripts
  --input <report.json>                 Analysis report to use
  --v3-url <url>                        Source v3 API URL
  --v5-url <url>                        Target v5 API URL
  --output <dir>                        Output directory for scripts
  --dry-run                             Validate without writing to v5

strapishift run <migration-dir>         Execute migration scripts
  --verify                              Run verification after migration
  --batch-size <n>                      Records per batch (default: 50)
  --resume                              Resume interrupted migration

strapishift                             Interactive wizard (no args)
```

### 7.2 Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| **0** | Success | Analysis complete, no blockers |
| **1** | Error (invalid input, connection failure) | Invalid JSON, unreachable API |
| **2** | Analysis complete with blockers found | Base64 images detected |
| **3** | Migration completed with errors | Some records failed to migrate |

---

## 8. Web Interface Specification

### 8.1 Pages

| Route | Purpose | Key Components | Phase |
|-------|---------|---------------|-------|
| `/` | Landing page (nuxt.com-style hero, value props, CTA) | Hero, ValueProps, HowItWorks | 1 |
| `/features` | Feature showcase by phase | FeatureCards | 1 |
| `/docs` | Documentation hub (Nuxt Content / MDC) | DocsSidebar, DocsContent | 1 |
| `/docs/[slug]` | Individual doc pages | DocsContent | 1 |
| `/analyze` | Schema analysis tool (paste/upload) | SchemaInput, file drop zone | 1 |
| `/report` | Interactive report dashboard | ReportDashboard, ContentTypeCard, FindingRow, ExportMenu | 1 |
| `/verify` | Parity verification tool | ParityDashboard, ParityFixList, DualInput | 1 |
| `/about` | About the project, author, license | Static content | 1 |
| `/scan` | Live instance scanner (module placeholder or active) | ScanConfig, Base64Scanner | 2 (module) |
| `/generate` | Schema generation (module placeholder or active) | GenerateConfig, SchemaPreview | 3 (module) |
| `/migrate` | Migration configuration (module placeholder or active) | MigrateConfig, DependencyGraph | 4 (module) |
| `/dashboard` | Live migration progress (module placeholder or active) | ProgressDashboard, ErrorQueue, VerificationReport | 5 (module) |

### 8.2 Design Requirements

- **Color mode:** Dark mode default via Nuxt UI's `colorMode`. Light/dark toggle in the app header. Preference persisted to `localStorage`.
- Nuxt UI 4.5.1 component library for all UI elements
- **Accessibility:** WCAG AA 2.1 compliant. All interactive elements keyboard-navigable, focus indicators visible, color contrast ratios meet AA thresholds (4.5:1 for normal text, 3:1 for large text) in both light and dark modes. ARIA labels on all interactive components. Skip-to-content link. Semantic HTML structure with proper heading hierarchy.
- **Responsive:** Mobile-first responsive layout. Fully functional on mobile, tablet, and desktop. Breakpoints aligned with Nuxt UI / Tailwind defaults (sm, md, lg, xl).
- Traffic-light color system: green (clean), yellow (warning), red (blocker), blue (info) — all colors must meet AA contrast ratios against both light and dark backgrounds
- All reports downloadable from any page that displays results
- **Print stylesheet:** All exported HTML reports (migration report, parity fix checklist) include a `@media print` stylesheet that switches to light background, dark text, high-contrast severity badges (solid colored borders instead of colored fills), and removes interactive elements. The parity fix checklist is specifically designed to be printed and handed to a contractor — it must be legible on paper. Checkboxes render as empty squares for manual tracking.

---

## 9. JSON Report Schema (LLM-Friendly)

The JSON output is designed to be fed directly to an LLM for automated migration code generation. It is self-contained.

### Top-Level Structure

```json
{
  "tool": "strapishift",
  "version": "1.0.0",
  "generatedAt": "2026-03-14T12:00:00Z",
  "sourceVersion": "3.x",
  "targetVersion": "5.x",
  "summary": { "totalContentTypes": 0, "clean": 0, "warnings": 0, "blockers": 0 },
  "contentTypes": [{ "name": "", "uid": "", "status": "", "findings": [] }],
  "migrationChecklist": [{ "phase": "", "items": [] }]
}
```

---

## 10. Design Document Suite

| Doc | Title | Contents |
|-----|-------|----------|
| **00** | Master Design (this document) | Architecture, phasing, tech stack, interfaces |
| **01** | Phase 1: Schema Analysis | Rule engine spec, parser details, reporter specs, test plan |
| **02** | Phase 2: Live Scanning | API connector, Base64 scanner, sampling strategy, test plan |
| **03** | Phase 3: Schema Generation | Field type mappings, relation translation, v5 project scaffold, test plan |
| **04** | Phase 4: Script Generation | API-to-API pipeline, dependency ordering, Base64 extraction, test plan |
| **05** | Phase 5: Migration Runner | Progress tracking, error handling, verification suite, test plan |
| **06** | Security | API token handling, input validation, rate limiting, sandbox execution |
| **07** | LLM Build Prompt | Self-contained prompt per phase for LLM-driven implementation |
| **08** | Differentiation | Competitive analysis, unique value (ResearchHub domain knowledge) |
| **09** | Monorepo & Website | pnpm workspace config, package structure, marketing site |
| **10** | Revision & Gap Analysis | Cross-doc consistency checks, known gaps, open questions |
| **11** | Architecture Decisions | ADRs: API-to-API rationale, citty over Commander, monorepo structure |
| **12** | Use Cases | User journeys for each phase, persona definitions, edge cases |

---

## 11. Open Questions

1. **Domain:** Is `strapishift.com` available? Fallback options: `strapishift.dev`, `getstrapishift.com`
2. **npm package name:** Is `strapishift` available on npm? May need scoped `@strapishift/cli`
3. **Strapi v4 support:** Should the tool also handle v4 → v5 migrations? (v4 → v5 is a smaller diff than v3 → v5, but wider user base)
4. **Timestamp preservation:** Should post-migration timestamp patching be automatic or opt-in?
5. **MongoDB Atlas:** For Phase 2 scanning, should the tool support connecting to MongoDB Atlas directly (bypassing the v3 API) for Base64 detection?
6. ~~**Licensing:** MIT? If so, the Strapi community can freely adopt and contribute.~~ **RESOLVED: MIT license.**
7. **Docker test fixtures:** Phase 2+ integration tests need Docker-hosted Strapi v3 and v5 instances. Define the Docker Compose setup in Doc 01 or Doc 09?

---

## 12. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft — 5-phase architecture with API-to-API migration strategy, test specifications per phase | Chris |
| 2026-03-14 | 1.1.0 | Redefined MVP as Phase 1; reframed Phases 2-5 as optional modules; added module architecture (Section 3.3); added print stylesheet requirement for HTML reports | Chris |
| 2026-03-14 | 1.2.0 | Added strapishift.config.ts as single source of truth (Section 3.6); added root files (.nvmrc, .gitignore, LICENSE); pnpm as sole package manager; dark mode default with light/dark toggle; WCAG AA 2.1 compliance; mobile-first responsive; nuxt.com-style design direction; added /features, /docs, /analyze pages; security fixes (token handling, SSL, zip traversal, rate limiting, response limits); module discovery mechanism specification | Chris |
