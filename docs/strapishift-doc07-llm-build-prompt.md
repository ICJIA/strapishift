# STRAPISHIFT — Doc 07: LLM Build Prompt

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Overview

This document contains self-contained prompts for building StrapiShift phase by phase using an LLM. Each prompt includes all context needed to implement that phase — the developer feeds the prompt to an LLM along with any relevant files (test fixtures, previous phase output) and receives working code.

Doc 07 is the critical deliverable in the design suite. Each prompt is written to be copy-pasted directly into an LLM conversation.

---

## 2. Prompt: Phase 1 — Core Analysis Engine

```
You are an expert TypeScript developer building the core analysis engine for 
StrapiShift, a Strapi v3 → v5 migration platform. You are building the 
@strapishift/core package.

## Project Context
- Monorepo using pnpm workspaces
- Package: packages/core/
- Language: TypeScript (strict mode)
- Testing: Vitest
- Zero runtime dependencies (pure TypeScript, runs in browser and Node)

## What to Build

### 1. Schema Parser
Parse Strapi v3 content type schemas into a normalized internal representation.

Input formats:
- Single schema.json (v3 content type definition)
- Directory of schemas (api/ directory structure)
- Content Type Builder API response

Output: ParsedSchema with contentTypes[], components[], and metadata.

Key parsing logic:
- Detect relation type from v3 syntax: "model" = singular, "collection" = plural
- Infer cardinality: model = manyToOne, model+via = manyToOne (inverse defined), 
  collection = oneToMany, collection+via+dominant = manyToMany
- Media detection: model/collection "file" with plugin "upload"
- Component detection: type "component" with component string and optional repeatable
- Dynamic zone detection: type "dynamiczone" with components array
- Database engine inference from connection field and MongoDB patterns

### 2. Rule Engine
Pure functions. Each rule: (contentType, context) → Finding[].

Rule categories and specific rules to implement:

DATABASE RULES:
- db-field-naming: _id→id, created_at→createdAt, updated_at→updatedAt, 
  published_at→publishedAt. Severity: info.
- db-mongodb-nested: JSON fields on MongoDB instances. Severity: warning.
- db-objectid-refs: Relation fields on MongoDB instances. Severity: info.

API RULES:
- api-response-envelope: ALL content types. data.attributes flattened in v5. 
  Severity: warning.
- api-filter-syntax: ALL content types. _where→filters, _sort→sort, 
  _limit/_start→pagination. Severity: warning.
- api-populate-syntax: Content types with relations. v5 doesn't populate by 
  default. Severity: warning.
- api-pagination-format: ALL collection types. X-Total-Count header → 
  meta.pagination. Severity: warning.

MEDIA RULES:
- media-base64-candidate: ALL richtext fields. Flag as BLOCKER. Every richtext 
  field is a candidate for containing Base64 images.
- media-reference-format: ALL media fields. Reference format changed. 
  Severity: warning.

RELATION RULES:
- rel-cardinality-syntax: ALL relation fields. v3 model/collection syntax → 
  v5 type/relation/target syntax. Severity: warning.
- rel-polymorphic: morphTo/morphMany patterns. Severity: warning.
- rel-circular: Content types that reference each other. Severity: info. 
  Critical for Phase 4 dependency ordering.

AUTH RULES:
- auth-user-model: Relations to "user" model. Plugin API routes changed, 
  model UIDs changed. Severity: warning.

PLUGIN RULES:
- plugin-compatibility: Check for known v3 plugins, flag v5 status. 
  Severity varies.

GRAPHQL RULES:
- graphql-schema-changes: If GraphQL detected, flag schema regeneration 
  needed. Severity: warning to blocker (for custom resolvers).

### 3. Parity Checker
Compare v3 ParsedSchema against v5 schema (parsed from files or API).

Checks:
- Content type presence: every v3 type exists in v5
- Field presence: every v3 field exists in v5 (handle known renames)
- Field type compatibility: types match or are expected changes
- Relation integrity: targets exist, cardinality correct
- Component integrity: components exist with correct fields

Output: ParityReport with checks[], parityScore, failures[], warnings[].

### 4. Reporters
Four output formats from the same findings data:

- JSON reporter: LLM-friendly, self-contained, includes summary + 
  contentTypes[] + migrationChecklist[]
- HTML reporter: Self-contained single HTML file. Dark mode default with
  inline light/dark toggle. Traffic-light dashboard. Expandable content
  types. Severity filtering. Export buttons. Includes @media print
  stylesheet: white background, dark text, high-contrast severity badges
  (solid borders not fills), hidden interactive elements, empty checkbox
  squares for manual tracking. For parity reports: side-by-side comparison,
  actionable fix checklist with printable layout.
- Markdown reporter: GitHub-flavored checklist with - [ ] items, organized 
  by severity then phase.
- CSV reporter: Flat table, one row per finding.

Also: ParityReporter generating all four formats for parity check results.
The HTML parity report must be a self-contained, printable fix checklist 
suitable for handing to a contractor.

### 5. Scorer
- Content type status: clean (info only), warning (≥1 warning), 
  blocker (≥1 blocker)
- Migration readiness: percentage of clean content types
- Effort estimate: low=0.5-1hr, medium=2-4hr, high=8-16hr per finding

## File Structure

packages/core/
├── src/
│   ├── parser/
│   │   ├── schema-parser.ts
│   │   ├── directory-parser.ts
│   │   ├── relation-parser.ts
│   │   ├── component-parser.ts
│   │   └── types.ts
│   ├── rules/
│   │   ├── index.ts           (rule registry)
│   │   ├── database-rules.ts
│   │   ├── api-rules.ts
│   │   ├── media-rules.ts
│   │   ├── relation-rules.ts
│   │   ├── auth-rules.ts
│   │   ├── plugin-rules.ts
│   │   └── graphql-rules.ts
│   ├── parity/
│   │   ├── parity-checker.ts
│   │   ├── checks/
│   │   │   ├── content-type-presence.ts
│   │   │   ├── field-presence.ts
│   │   │   ├── field-type-compat.ts
│   │   │   ├── relation-integrity.ts
│   │   │   └── component-integrity.ts
│   │   └── types.ts
│   ├── reporter/
│   │   ├── types.ts
│   │   ├── json-reporter.ts
│   │   ├── html-reporter.ts
│   │   ├── markdown-reporter.ts
│   │   ├── csv-reporter.ts
│   │   └── parity-reporter.ts
│   ├── config/
│   │   ├── define-config.ts   (defineConfig helper)
│   │   ├── load-config.ts     (loadConfig from strapishift.config.ts)
│   │   └── types.ts           (StrapiShiftConfig interface)
│   ├── modules/
│   │   ├── registry.ts        (registerModule, getRegisteredModules, getModule)
│   │   └── types.ts           (StrapiShiftModule, CliCommandDefinition, ReportEnhancer)
│   ├── scorer.ts
│   └── index.ts              (main entry: analyze() + verify() + config + modules)
├── test/
│   ├── fixtures/             (I will provide v3 schema fixtures)
│   ├── parser/
│   ├── rules/
│   ├── parity/
│   ├── reporters/
│   └── integration/
├── package.json
├── tsconfig.json
└── vitest.config.ts

## Key Types

interface Finding {
  ruleId: string;
  contentType: string;
  field?: string;
  severity: 'info' | 'warning' | 'blocker';
  title: string;
  description: string;
  action: string;
  effort: 'low' | 'medium' | 'high';
  docsUrl?: string;
  affectsApi: boolean;
  affectsDatabase: boolean;
}

interface MigrationReport {
  tool: 'strapishift';
  version: string;
  generatedAt: string;
  sourceVersion: '3.x';
  targetVersion: '5.x';
  summary: ReportSummary;
  contentTypes: ContentTypeReport[];
  migrationChecklist: ChecklistPhase[];
}

### 6. Module Registration API
The core package defines extension points for optional modules (scanner,
generator, migrator). This API must be built in Phase 1 even though no
modules exist yet.

interface StrapiShiftModule {
  name: string;                          // e.g., "@strapishift/scanner"
  phase: number;                         // 2, 3, 4, or 5
  description: string;
  cliCommands?: CliCommandDefinition[];  // commands this module adds
  reportEnhancers?: ReportEnhancer[];    // additional report sections
  dependencies?: string[];               // other modules required
}

interface CliCommandDefinition {
  name: string;
  description: string;
  args?: Record<string, ArgDefinition>;
  run: (args: any) => Promise<void>;
}

interface ReportEnhancer {
  name: string;
  enhance: (report: MigrationReport, data: any) => MigrationReport;
}

Export: registerModule(), getRegisteredModules(), getModule(name)

The module registry is a simple Map. Modules register on import.
Validation: reject duplicate names, check dependencies are registered.

### 7. Configuration Loader
Export a defineConfig() helper and loadConfig() function.

defineConfig() provides type safety for strapishift.config.ts:
export function defineConfig(config: StrapiShiftConfig): StrapiShiftConfig {
  return config;
}

interface StrapiShiftConfig {
  name: string;
  version: string;
  sourceVersion: '3.x';
  targetVersion: '5.x';
  reports: {
    formats: ('json' | 'html' | 'md' | 'csv')[];
    outputDir: string;
  };
  rules: Record<string, boolean>;
  modules: Record<string, any>;
}

loadConfig() reads and validates strapishift.config.ts from the project
root. Used by CLI and web at initialization. Returns defaults if no
config file is found (the tool must work without a config file for
the web UI paste-and-analyze flow).

## Build Instructions
- Write all source files
- Write comprehensive Vitest tests for every rule, every parser function,
  every reporter, and the module registration API
- Export analyze(schema) → MigrationReport and verify(v3Schema, v5Schema) →
  ParityReport from index.ts
- Export registerModule(), getRegisteredModules(), getModule() for the
  module system
- Export defineConfig() and loadConfig() for configuration
- All code must be pure TypeScript with no Node or browser runtime
  dependencies (loadConfig uses dynamic import, not fs — works in both
  environments)
```

---

## 3. Prompt: Phase 1 — CLI

```
You are building the CLI interface for StrapiShift (@strapishift/cli).

## Dependencies
- @strapishift/core (the analysis engine — already built)
- citty (UnJS CLI framework, TypeScript-native)

## Commands

### strapishift analyze <schema>
- Accepts path to schema.json or api/ directory
- Flags: --format (json,html,md,csv), --output, --output-dir, --recursive, 
  --quiet, --no-color
- Default: all four formats to ./strapishift-report/
- Terminal output: colored traffic-light summary per content type
- Exit codes: 0 (success, no blockers), 1 (error), 2 (blockers found)

### strapishift verify
- Flags: --v3-schema, --v5-schema, --v5-url, --v5-token, --format, --output-dir
- Compare v3 schema against v5 schema files or live v5 instance
- Terminal output: parity score, content-type-by-content-type comparison
- HTML report is the primary output — self-contained, printable fix checklist

### strapishift (no args)
- Interactive wizard using citty prompts
- Options: Analyze, Verify Parity
- If modules are installed, their commands appear in the wizard
- Uninstalled module commands shown grayed out with install instructions

### Module Discovery
At startup, the CLI auto-discovers installed @strapishift/* packages:
1. Call getRegisteredModules() from @strapishift/core
2. For each module, register its cliCommands with citty
3. Module commands appear alongside built-in commands
4. In the interactive wizard, show installed module commands as active
   options and known-but-uninstalled modules as grayed-out hints

## File Structure
packages/cli/
├── src/
│   ├── index.ts
│   ├── commands/
│   │   ├── analyze.ts
│   │   ├── verify.ts
│   │   └── wizard.ts
│   ├── output/
│   │   ├── terminal-reporter.ts  (colored console output)
│   │   └── file-writer.ts
│   └── utils/
│       ├── glob-loader.ts
│       └── module-discovery.ts   (find and register installed modules)
├── test/
├── package.json
└── vitest.config.ts

## Build Instructions
- Use citty for command definitions
- The terminal reporter should use chalk or similar for colors
- Test all commands with Vitest (mock filesystem for file operations)
- Package as 'strapishift' for npx/global install
- At startup, call loadConfig() from @strapishift/core to read
  strapishift.config.ts. Use config values for defaults (output formats,
  output directory, rule toggles). CLI flags override config values.
- Module discovery must gracefully handle missing module packages
  (try/catch on dynamic import, log info message, continue)
```

---

## 4. Prompt: Phase 1 — Web UI

```
You are building the web interface for StrapiShift (@strapishift/web).

## Stack
- Nuxt 4.4.2
- Nuxt UI 4.5.1
- pnpm (only supported package manager)
- TypeScript
- Nuxt Content (for /docs pages — Markdown/MDC authored)

## Dependencies
- @strapishift/core (analysis engine)

## Design Direction
The site should look and feel like nuxt.com — dark default, high contrast,
clean typography, generous whitespace, subtle gradients and border effects.

Key visual characteristics to match:
- Dark background with high-contrast white/gray text
- Card-based layouts with subtle borders and hover effects
- Hero sections with gradient overlays or grid patterns
- Clean, modern sans-serif typography
- Generous padding and spacing
- Smooth transitions and micro-interactions

## Pages

### / (Landing Page — nuxt.com style)
- Hero section: headline "Migrate Strapi v3 → v5 with confidence",
  subhead, gradient/grid background, primary CTA "Analyze Your Schema"
  (→ /analyze), secondary CTA "Read the Docs" (→ /docs)
- Value props: 4-card grid below fold with icons
- How it works: 3-step visual flow (paste → review → export)
- Social proof: "Built from real-world migration experience at ICJIA",
  GitHub stars badge, MIT license badge
- Footer: GitHub, npm, MIT license, author credit

### /features (Feature Showcase)
- Feature cards organized by phase
- Phase 1 features shown as "available now"
- Module features shown as "coming soon" with descriptions
- Each card: icon, title, description, docs link

### /docs (Documentation Hub)
- Sidebar navigation with doc sections
- Content rendered from Markdown/MDC files via Nuxt Content
- Sections: Getting Started, CLI Reference, Web UI Guide, Rule Reference,
  Report Formats, Configuration, Module Development, FAQ
- Search within docs (Nuxt Content search or client-side)

### /docs/[slug] (Individual Doc Pages)
- Rendered from Markdown/MDC
- Table of contents sidebar
- Previous/Next navigation
- Edit on GitHub link

### /analyze (Schema Analysis Tool)
- SchemaInput component: paste textarea + file upload drop zone
- Validate JSON before enabling Analyze button
- Loading state during analysis
- Navigate to /report on completion

### /report (Migration Report Dashboard)
- Summary bar: content type count, clean/warning/blocker counts,
  readiness score
- Filter controls: severity, category, effort
- Content type cards in responsive grid: name, status badge, finding count
- Click card → expand findings with severity badges, actions, effort
- ExportMenu: download JSON, HTML, Markdown, CSV

### /verify (Parity Verification)
- Dual-input: v3 source (paste/upload) + v5 target (paste/upload or URL)
- ParityDashboard: parity score banner, side-by-side comparison
- Per-content-type expandable comparison: field-by-field table
- ParityFixList: actionable fix items with severity badges
- Export: HTML fix checklist (primary), JSON, Markdown, CSV
- The HTML export must be a self-contained, printable document with
  checkbox items that a developer can hand to a contractor

### /about
- About the project, author (Chris at ICJIA), license (MIT)
- GitHub link, contribution guidelines
- Technology stack overview

### Module Placeholder Pages
For known modules (scanner, generator, migrator) that are NOT installed,
show a placeholder page at the expected route (/scan, /generate, /migrate,
/dashboard) with:
- Module name and description
- "Not installed" status badge
- Install instructions: pnpm add @strapishift/scanner
- Link back to the analysis/verify pages

If a module IS installed (detected via runtime plugin), show its actual
pages instead of placeholders.

## Design Requirements
- All Nuxt UI components
- Dark mode default via Nuxt UI colorMode; light/dark toggle in app header;
  preference persisted to localStorage
- WCAG AA 2.1 compliant:
  - All interactive elements keyboard-navigable
  - Visible focus indicators
  - Color contrast ratios: 4.5:1 normal text, 3:1 large text (both modes)
  - ARIA labels on all interactive components
  - Skip-to-content link
  - Semantic HTML with proper heading hierarchy (h1 → h2 → h3, no skips)
  - Form inputs have associated labels
  - Error messages announced to screen readers
- Mobile-first responsive layout: fully functional on mobile, tablet,
  desktop. Breakpoints: Tailwind defaults (sm, md, lg, xl)
- Traffic-light colors: green (#22C55E), yellow (#EAB308), red (#EF4444),
  blue (#3B82F6) — all must meet AA contrast in both light and dark modes
- No backend required for core product — everything client-side
- Print stylesheet: all exported HTML reports include @media print CSS
  that switches to white background, dark text, high-contrast severity
  badges (solid borders instead of colored backgrounds), and hides
  interactive elements. Checkboxes render as empty squares.

## Build Instructions
- Create all pages and components
- Use composables for analysis state management
- Write component tests with Vitest + @vue/test-utils
- Test accessibility: use @axe-core/vue or similar for automated a11y checks
- Ensure Netlify deployment works (static mode)
- Module discovery via runtime plugin: try to import @strapishift/scanner,
  @strapishift/generator, @strapishift/migrator — show their pages if
  available, placeholder pages if not
- Read project config from strapishift.config.ts (single source of truth)
```

---

## 5. Prompt: Phase 2 — Scanner Module

```
You are an expert TypeScript developer building the scanner module for
StrapiShift, a Strapi v3 → v5 migration platform. You are building the
@strapishift/scanner package — an optional module that extends the core
product with live instance scanning capabilities.

## Project Context
- Monorepo using pnpm workspaces
- Package: packages/scanner/
- Language: TypeScript (strict mode)
- Testing: Vitest
- Depends on: @strapishift/core (already built — provides ParsedSchema,
  Finding, MigrationReport types, schema parser, and module registration)
- This is a MODULE — it registers itself with core's module system

## What to Build

### 1. Module Registration
Register this package as a StrapiShift module on import:

import { registerModule } from '@strapishift/core';
registerModule({
  name: '@strapishift/scanner',
  phase: 2,
  description: 'Live v3 instance scanning with Base64 detection',
  cliCommands: [scanCommand],
  reportEnhancers: [base64Enhancer, mediaInventoryEnhancer, recordCountEnhancer],
});

### 2. Connection Manager
Handles authenticated communication with the Strapi v3 REST API.

interface ScannerConfig {
  v3Url: string;               // e.g., "http://localhost:1337"
  v3Token: string;             // API token or JWT
  sampleSize: number;          // records to sample per content type (default: 100)
  contentTypes?: string[];     // specific types to scan (default: all)
  timeout: number;             // request timeout in ms (default: 30000)
  concurrency: number;         // parallel requests (default: 3)
}

Authentication: Support both API tokens (Authorization: Bearer <token>) and
JWT auth. Validate connection by hitting GET / and checking for valid response.

Rate limiting: Throttle to configured concurrency with 100ms delay between
batches. Never overwhelm the v3 instance.

Error handling:
- Connection timeout → clear error: "Cannot reach v3 instance at {url}"
- Auth failure (401/403) → clear error: "Authentication failed. Check token."
- DNS failure → clear error: "Cannot resolve hostname {host}"

### 3. Schema Puller
Retrieve content type definitions from the live v3 instance.

Endpoints:
- GET /content-type-builder/content-types → all content type schemas
- GET /content-type-builder/components → all component schemas
- GET /content-manager/content-types → metadata (counts, configuration)

Feed pulled schemas into @strapishift/core's parser to produce ParsedSchema.

### 4. Content Sampler
Retrieve actual content records for data-level analysis.

Pagination: Strapi v3 uses _start and _limit parameters.
  GET /articles?_start=0&_limit=100&_sort=id:ASC
  GET /articles?_start=100&_limit=100&_sort=id:ASC

Record count: Hit GET /articles/count before sampling.

Sample up to configured sampleSize records per content type. If total records
< sampleSize, fetch all.

### 5. Base64 Image Scanner
For each content type with richtext fields, scan sampled records for Base64
encoded images.

Detection regex:
const BASE64_PATTERN = /data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]{100,}/g;

Minimum 100 Base64 chars to avoid false positives from small data URI icons.

Output per content type + field:
interface Base64ScanResult {
  contentType: string;
  field: string;
  totalRecords: number;
  sampledRecords: number;
  affectedRecords: number;
  affectedPercentage: number;
  estimatedTotalAffected: number;   // extrapolated from sample
  totalImagesFound: number;
  estimatedTotalSize: number;       // bytes (Base64 length * 0.75)
  mimeTypeDistribution: Record<string, number>;
  sampleIds: string[];              // IDs of affected records
}

Extrapolation: if sample < total, extrapolate affected percentage to estimate
total affected. Clearly mark extrapolated values as estimates.

### 6. Media Library Inventory
Catalog all media library entries in the v3 instance.

Endpoints:
- GET /upload/files/count → total media entries
- GET /upload/files?_start=0&_limit=100 → paginated media entries

Collect:
- Total entries and total storage size
- Format distribution (image/jpeg, image/png, application/pdf, etc.)
- Provider distribution (local, S3, Cloudinary — from file metadata)
- Orphan detection: cross-reference media IDs against content type
  relation fields. A media entry with no references is orphaned.

### 7. Enhanced Report
Produce an enhanced MigrationReport that includes all Phase 1 findings
plus data-level findings. Use core's ReportEnhancer interface.

Additional JSON structure:
{
  "scanMetadata": {
    "v3Url": "http://localhost:1337",
    "scanDate": "2026-03-14T12:00:00Z",
    "sampleSize": 100,
    "scanDuration": "2m 34s"
  },
  "dataFindings": {
    "base64Scan": [...Base64ScanResult],
    "mediaInventory": {
      "totalEntries": 4521,
      "totalSize": 2147483648,
      "orphanedEntries": 234,
      "formatDistribution": {...}
    },
    "recordCounts": { "Article": 2100, "Author": 45 }
  }
}

All four output formats (JSON, HTML, Markdown, CSV) include these
enhancements. The HTML report adds a "Data Findings" section with
Base64 scan results highlighted per content type.

## Security Requirements
- Tokens are NEVER logged, stored in reports, or written to disk
- Tokens held in memory only for the duration of the scan
- Content records are analyzed in memory, never persisted
- Scan report includes counts and metadata, not raw content
- SSL certificates validated by default; self-signed requires --insecure flag
- Response size limit: 10MB per API response

## File Structure

packages/scanner/
├── src/
│   ├── index.ts                (module registration + public API)
│   ├── connection-manager.ts   (auth, HTTP client, retry, rate limiting)
│   ├── schema-puller.ts        (Content Type Builder API)
│   ├── content-sampler.ts      (pagination, record fetching)
│   ├── base64-scanner.ts       (Base64 detection + extrapolation)
│   ├── media-inventory.ts      (media catalog + orphan detection)
│   ├── report-enhancer.ts      (merge data findings into MigrationReport)
│   └── types.ts
├── test/
│   ├── fixtures/               (mock API responses, test records with Base64)
│   ├── connection-manager.test.ts
│   ├── schema-puller.test.ts
│   ├── content-sampler.test.ts
│   ├── base64-scanner.test.ts
│   ├── media-inventory.test.ts
│   ├── report-enhancer.test.ts
│   └── integration/
│       └── full-scan.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts

## Key Dependencies
- node-fetch (or ofetch from UnJS) for HTTP requests
- @strapishift/core for types, parser, and module registration

## CLI Command (registered via module system)
The scanner registers a "scan" command:

strapishift scan
  --url <url>              Strapi v3 API URL
  --token <token>          API token (prefer STRAPISHIFT_V3_TOKEN env var)
  --sample-size <n>        Records to sample per type (default: 100)
  --content-types <types>  Specific types to scan (comma-separated)
  --insecure               Allow self-signed SSL certificates
  --format json,html,md,csv
  --output <file>
  --output-dir <dir>

Exit codes: 0 (success, no blockers), 1 (error), 2 (blockers found)

## Test Instructions
- Write comprehensive Vitest tests for every component
- Use mock HTTP responses for unit tests (no real API calls)
- Test Base64 detection: real Base64 images detected, URLs not flagged,
  small data URIs below threshold ignored, all MIME types recognized
- Test extrapolation accuracy at various sample sizes
- Test error handling: connection timeout, auth failure, DNS failure
- Test rate limiting: verify concurrency limits respected
```

---

## 6. Prompt: Phase 3 — Generator Module

```
You are an expert TypeScript developer building the schema generator module
for StrapiShift, a Strapi v3 → v5 migration platform. You are building the
@strapishift/generator package — an optional module that extends the core
product with v5 schema generation capabilities.

## Project Context
- Monorepo using pnpm workspaces
- Package: packages/generator/
- Language: TypeScript (strict mode)
- Testing: Vitest
- Depends on: @strapishift/core (provides ParsedSchema, MigrationReport,
  parity checker, and module registration)
- This is a MODULE — registers with core's module system

## What to Build

### 1. Module Registration
import { registerModule } from '@strapishift/core';
registerModule({
  name: '@strapishift/generator',
  phase: 3,
  description: 'Generate complete v5 content type schemas from v3 analysis',
  cliCommands: [generateCommand],
});

### 2. Field Type Mapper
Map every v3 field type to its v5 equivalent.

DIRECT MAPPINGS (no transformation needed):
v3 string → v5 string
v3 text → v5 text
v3 richtext → v5 richtext
v3 email → v5 email
v3 integer → v5 integer
v3 biginteger → v5 biginteger
v3 float → v5 float
v3 decimal → v5 decimal
v3 date → v5 date
v3 time → v5 time
v3 datetime → v5 datetime
v3 boolean → v5 boolean
v3 enumeration → v5 enumeration
v3 json → v5 json
v3 uid → v5 uid (targetField syntax unchanged)
v3 password → v5 password

### 3. Relation Mapper
Relations require complete syntax transformation:

v3: { "model": "user" }
v5: { "type": "relation", "relation": "manyToOne", "target": "api::user.user" }

v3: { "model": "user", "via": "articles" }
v5: { "type": "relation", "relation": "manyToOne", "target": "api::user.user", "inversedBy": "articles" }

v3: { "collection": "category" }
v5: { "type": "relation", "relation": "oneToMany", "target": "api::category.category" }

v3: { "collection": "category", "via": "articles", "dominant": true }
v5: { "type": "relation", "relation": "manyToMany", "target": "api::category.category", "inversedBy": "articles" }

v3: { "model": "file", "plugin": "upload" }
v5: { "type": "media", "multiple": false, "allowedTypes": ["images", "files", "videos", "audios"] }

v3: { "collection": "file", "plugin": "upload" }
v5: { "type": "media", "multiple": true, "allowedTypes": ["images", "files", "videos", "audios"] }

### 4. Component Mapper
v3: { "type": "component", "component": "sections.hero" }
v5: { "type": "component", "component": "sections.hero", "repeatable": false }

v3: { "type": "component", "component": "sections.hero", "repeatable": true }
v5: { "type": "component", "component": "sections.hero", "repeatable": true }

### 5. Dynamic Zone Mapper
v3: { "type": "dynamiczone", "components": ["sections.hero", "sections.cta"] }
v5: { "type": "dynamiczone", "components": ["sections.hero", "sections.cta"] }
(Largely unchanged, but component UIDs may need updating)

### 6. UID Generator
Content type "article" → "api::article.article"
Plugin content type "article" → "plugin::plugin-name.article"
Component "sections.hero" → "sections.hero" (unchanged)

### 7. Schema File Writer
For each content type, generate the v5 directory structure:

src/api/
├── article/
│   ├── content-types/
│   │   └── article/
│   │       └── schema.json
│   ├── controllers/
│   │   └── article.ts          (factory stub)
│   ├── routes/
│   │   └── article.ts          (factory stub)
│   └── services/
│       └── article.ts          (factory stub)

Components:
src/components/
├── sections/
│   ├── hero.json
│   └── cta.json

Generated schema.json format:
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Article",
    "description": "Migrated from Strapi v3 by StrapiShift"
  },
  "options": { "draftAndPublish": true },
  "pluginOptions": {},
  "attributes": { ... }
}

Controller/Route/Service stubs use Strapi v5 factory pattern:
// controllers/article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::article.article');

### 8. Per-Content-Type Migration Notes
Generate a MIGRATION-NOTES.md per content type documenting what changed
and why. Include: field changes, relation syntax changes, media format
changes, Base64 warnings, API response changes.

### 9. Post-Generation Parity Check
After generating all schemas, automatically run @strapishift/core's
parity checker comparing the v3 source ParsedSchema against the generated
v5 schemas. Report parity score. If < 100%, list what's missing and why.

## File Structure

packages/generator/
├── src/
│   ├── index.ts                 (module registration + public API)
│   ├── field-mapper.ts          (v3 → v5 field type mapping)
│   ├── relation-mapper.ts       (v3 → v5 relation transformation)
│   ├── component-mapper.ts      (component + dynamic zone translation)
│   ├── uid-generator.ts         (content type → api::name.name UIDs)
│   ├── schema-writer.ts         (file system output: schemas, stubs)
│   ├── readme-generator.ts      (per-content-type MIGRATION-NOTES.md)
│   ├── parity-runner.ts         (post-generation parity check)
│   └── types.ts
├── test/
│   ├── fixtures/                (v3 schema inputs, expected v5 outputs)
│   ├── field-mapper.test.ts
│   ├── relation-mapper.test.ts
│   ├── component-mapper.test.ts
│   ├── uid-generator.test.ts
│   ├── schema-writer.test.ts
│   ├── readme-generator.test.ts
│   └── integration/
│       ├── researchhub-generation.test.ts
│       └── post-generation-parity.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts

## CLI Command
strapishift generate
  --input <report.json>     Analysis report (from Phase 1 or 2)
  --output <dir>            Output directory for v5 schemas
  --db-engine sqlite|postgres  Target database (default: sqlite)
  --skip-parity             Skip post-generation parity check
  --format json,html,md,csv   Parity report formats

## Test Instructions
- Test every v3 field type → v5 field definition
- Test all 6 v3 relation patterns → v5 relation definitions
- Test component and dynamic zone translation
- Test UID generation for content types and plugins
- Test generated JSON validity against v5 schema expectations
- Test directory structure output correctness
- Test factory pattern stubs are syntactically valid
- Integration: generate from ResearchHub fixture, verify all content
  types generated, parity check returns 100%
```

---

## 7. Prompt: Phase 4 — Migrator Module (Script Generation)

```
You are an expert TypeScript developer building the migrator module for
StrapiShift, a Strapi v3 → v5 migration platform. You are building the
@strapishift/migrator package — an optional module that generates custom,
human-readable migration scripts using the API-to-API approach.

## Project Context
- Monorepo using pnpm workspaces
- Package: packages/migrator/
- Language: TypeScript (strict mode)
- Testing: Vitest
- Depends on: @strapishift/core (types, module registration)
- This is a MODULE — registers with core's module system

## Critical Architecture: API-to-API Migration
Read content from Strapi v3 REST API, transform, write to Strapi v5 REST API.
Strapi v5 handles all database internals (junction tables, relations, media).
The v5 API is the stable contract; the database schema is an implementation
detail. The generated scripts use this approach exclusively.

## What to Build

### 1. Module Registration
import { registerModule } from '@strapishift/core';
registerModule({
  name: '@strapishift/migrator',
  phase: 4,
  description: 'Generate and execute API-to-API migration scripts',
  cliCommands: [migrateCommand, runCommand],
});

### 2. Dependency Graph Builder
Content types reference each other through relations. The migrator must
determine correct creation order.

Algorithm:
1. Build directed graph: edges from each content type to its relation targets
2. Topological sort: dependencies before dependents
3. Circular reference handling: if A → B → A, break cycle:
   a. Create all A records WITHOUT the relation to B
   b. Create all B records WITH the relation to A
   c. Update A records to add the relation to B (second pass)

Output: numbered script files in execution order:
content-types/
├── 01-category.ts       (no dependencies)
├── 02-author.ts         (no dependencies)
├── 03-tag.ts            (no dependencies)
├── 04-article.ts        (depends on category, author, tag)
├── 05-page.ts           (depends on article)
└── 99-circular-fixup.ts (second-pass relation updates)

### 3. Content Transformer Generator
Generate a transform function per content type that converts a v3 API
response record into a v5 API request payload.

function transformArticle(v3Record: any, idMap: IdMap): V5Payload {
  return {
    data: {
      title: v3Record.title,
      body: v3Record.body,
      slug: v3Record.slug,
      author: idMap.resolve('author', v3Record.author),
      categories: v3Record.categories.map(
        c => idMap.resolve('category', c.id || c._id || c)
      ),
    }
  };
}

Relation handling:
- manyToOne: v3 { "author": { "_id": "abc" } } or "abc" → v5 { "author": 42 }
- oneToMany: populated array → array of v5 IDs
- manyToMany: populated array → array of v5 IDs
- media (single): { "cover": { "url": "/uploads/img.jpg" } } → { "cover": 17 }
- media (multiple): array of media objects → array of v5 media IDs

### 4. ID Mapper
Persistent JSON file mapping v3 IDs → v5 IDs.

{
  "author": { "5f8a...": 1, "5f8b...": 2 },
  "category": { "5f8c...": 1, "5f8d...": 2 },
  "article": { "5f8f...": 1, "5f90...": 2 }
}

Handle both MongoDB ObjectId strings and SQL integer IDs.

interface IdMap {
  set(contentType: string, v3Id: string, v5Id: number): void;
  resolve(contentType: string, v3Id: string | number | object): number;
  save(filePath: string): void;
  load(filePath: string): void;
}

The resolve method must handle: raw ID string, integer, or populated
object with _id/id field.

### 5. Media Migrator Generator
Generate scripts that:
1. Download each media file from v3: GET {v3Url}{file.url}
2. Upload to v5: POST {v5Url}/api/upload (multipart/form-data)
3. Preserve metadata: name, alternativeText, caption
4. Record v3 media ID → v5 media ID mapping
5. Batch process with configurable concurrency (default: 10)
6. Handle external providers (S3, Cloudinary): download from provider URL

### 6. Base64 Extractor Generator
Generate scripts that handle Base64-encoded images in rich text fields:
1. Parse rich text HTML content
2. Find all <img src="data:image/..."> tags
3. Decode Base64 data to binary
4. Upload each image to v5 via POST /api/upload
5. Replace <img> src with v5 media URL
6. Return cleaned HTML content

async function extractBase64Images(
  htmlContent: string,
  v5Url: string,
  v5Token: string
): Promise<{ cleanedContent: string; uploadedMedia: MediaMapping[] }>

### 7. Progress and Resume
Write checkpoint file after each batch:

{
  "status": "in-progress",
  "startedAt": "2026-03-14T12:00:00Z",
  "contentTypes": {
    "category": { "status": "complete", "total": 28, "migrated": 28, "failed": 0 },
    "article": { "status": "in-progress", "total": 2100, "migrated": 850, "failed": 3, "lastProcessedId": "5f8f..." }
  },
  "media": { "status": "complete", "total": 4521, "migrated": 4521, "failed": 0 },
  "failedRecords": [
    { "contentType": "article", "v3Id": "5f91...", "error": "Validation error: title is required", "timestamp": "..." }
  ]
}

If --resume is passed, read checkpoint and skip completed types, resume
from lastProcessedId.

### 8. Dry-Run Mode
Execute all transforms and validations but write nothing to v5. Produce
a report showing what would be migrated.

### 9. Timestamp Preservation (Optional)
If preserveTimestamps is enabled, generate a post-migration SQL script
that sets createdAt and updatedAt to original v3 values:
  UPDATE articles SET created_at = ?, updated_at = ? WHERE id = ?;

This requires direct database access to v5 (connection string in config).
Clearly document this as the ONE exception to API-to-API, and make it
opt-in only.

### 10. Generated Script Package Structure

migration/
├── package.json              dependencies: ofetch, form-data
├── tsconfig.json
├── migrate.ts                main orchestrator
├── config.ts                 source/target URLs, tokens (env var placeholders), options
├── content-types/
│   ├── 01-category.ts
│   ├── 02-author.ts
│   ├── 03-article.ts
│   └── 99-circular-fixup.ts
├── media/
│   ├── media-migrator.ts     download from v3, upload to v5
│   └── base64-extractor.ts   extract Base64, upload, replace
├── utils/
│   ├── id-map.ts             v3→v5 ID persistence
│   ├── progress.ts           resume tracking
│   ├── api-client.ts         v3/v5 API wrappers with error handling
│   └── logger.ts             structured logging
├── dry-run.ts                validate without writing
├── verify.ts                 post-migration parity check
└── README.md                 execution instructions

config.ts uses env var placeholders, NEVER hardcoded tokens:
const config = {
  v3: { url: process.env.V3_URL || 'http://localhost:1337',
        token: process.env.V3_TOKEN || '' },
  v5: { url: process.env.V5_URL || 'http://localhost:1338',
        token: process.env.V5_TOKEN || '' },
  options: { batchSize: 50, concurrency: 3, dryRun: false,
             preserveTimestamps: false }
};

## Security Requirements
- Generated config.ts uses environment variables, never hardcoded tokens
- No eval(), new Function(), or dynamic code execution in generated scripts
- Generated scripts are human-readable TypeScript with comments
- Dry-run mode performs all transforms but writes nothing
- Token handling: never logged, never in checkpoint files, never in reports

## File Structure

packages/migrator/
├── src/
│   ├── index.ts                  (module registration + public API)
│   ├── dependency-graph.ts       (topological sort, circular detection)
│   ├── content-transformer.ts    (per-field-type transformation rules)
│   ├── id-mapper.ts              (v3→v5 ID mapping)
│   ├── media-migrator.ts         (download/upload logic)
│   ├── base64-extractor.ts       (Base64 detection + extraction)
│   ├── progress-tracker.ts       (checkpoint file management)
│   ├── script-generator.ts       (generates the migration script package)
│   ├── template/                 (template files for generated package)
│   │   ├── package.json.tmpl
│   │   ├── config.ts.tmpl
│   │   ├── migrate.ts.tmpl
│   │   ├── dry-run.ts.tmpl
│   │   ├── verify.ts.tmpl
│   │   └── utils/
│   │       ├── api-client.ts.tmpl
│   │       ├── id-map.ts.tmpl
│   │       ├── progress.ts.tmpl
│   │       └── logger.ts.tmpl
│   └── types.ts
├── test/
│   ├── fixtures/
│   ├── dependency-graph.test.ts
│   ├── content-transformer.test.ts
│   ├── id-mapper.test.ts
│   ├── media-migrator.test.ts
│   ├── base64-extractor.test.ts
│   ├── progress-tracker.test.ts
│   ├── script-generator.test.ts
│   └── integration/
│       ├── full-migration.test.ts
│       └── resume-after-interrupt.test.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts

## CLI Commands
strapishift migrate
  --input <report.json>    Analysis report
  --v3-url <url>           Source v3 API URL
  --v5-url <url>           Target v5 API URL
  --output <dir>           Output directory for scripts
  --dry-run                Validate without writing to v5

strapishift run <migration-dir>
  --verify                 Run verification after migration
  --batch-size <n>         Records per batch (default: 50)
  --resume                 Resume interrupted migration

## Test Instructions
- Test topological sort: correct ordering, circular ref detection/handling
- Test content transformers: every field type transforms correctly
- Test ID mapper: store/retrieve, persist to JSON, handle ObjectId + integer
- Test Base64 extractor: HTML parsing, replacement produces valid HTML
- Test progress tracker: checkpoint write/read, resume from correct position
- Test dry-run: all transforms execute, zero writes to v5
- Integration: generate scripts from fixture, verify they are syntactically
  valid TypeScript that compiles without errors
```

---

## 8. Prompt: Phase 5 — Runner Module (Execution Engine + Dashboard)

```
You are an expert TypeScript developer building the migration runner
extensions for StrapiShift. You are extending the @strapishift/migrator
package with managed execution and adding a dashboard to @strapishift/web.

## Project Context
- Extends: packages/migrator/ (Phase 4 already built)
- Extends: packages/web/ (Nuxt 4.4.2 + Nuxt UI 4.5.1, already built)
- Language: TypeScript (strict mode)
- Testing: Vitest
- The runner wraps Phase 4's generated scripts in a managed execution
  environment with progress tracking, error handling, and verification.

## What to Build

### 1. Execution Engine (packages/migrator/)

#### 1.1 Orchestrator
Reads the generated migration package and executes each step in order:
1. Pre-flight checks: verify v3 and v5 instances are reachable and
   authenticated
2. Media migration (if not already complete per checkpoint)
3. Content type migration in dependency order
4. Circular reference fixup pass
5. Timestamp preservation pass (if enabled)
6. Post-migration verification

#### 1.2 Batch Processor
Process records in configurable batches:
- Batch size: 50 records (default, configurable)
- Concurrency: 3 parallel API calls within a batch (configurable)
- Checkpoint: progress saved to disk after each batch
- Backpressure: if v5 API returns 429, pause and retry with exponential
  backoff (respect Retry-After header)

#### 1.3 Error Queue
Failed records are captured, not fatal:

interface FailedRecord {
  contentType: string;
  v3Id: string;
  v3Data: Record<string, any>;
  error: string;
  errorCode?: number;
  timestamp: string;
  retryCount: number;
  retryable: boolean;
}

Retry policy:
- Network timeout → retryable, exponential backoff, max 3 retries
- 429 Rate limit → retryable, wait for Retry-After header
- 500 Server error → retryable, wait 5s, retry once
- 400 Validation error → NOT retryable, log for manual review
- 404 Not found (relation target) → NOT retryable, log

#### 1.4 Event Emitter
The runner emits events consumed by both CLI progress display and
WebSocket dashboard:

type RunnerEvent =
  | { type: 'progress'; contentType: string; migrated: number; total: number; failed: number }
  | { type: 'error'; contentType: string; v3Id: string; error: string }
  | { type: 'phase-complete'; phase: string; duration: number }
  | { type: 'migration-complete'; summary: MigrationSummary }
  | { type: 'verification-start' }
  | { type: 'verification-complete'; report: VerificationReport };

### 2. Verification Suite (packages/migrator/)

Run automatically after migration completes:

#### Record count comparison
Compare v3 count per content type against v5. Flag mismatches.

#### Field completeness
Sample v5 records and verify non-null fields that were non-null in v3.

#### Relation integrity
For each relation, verify target record exists in v5.

#### Media availability
Verify all media files are accessible via v5 URLs (HEAD request).

#### Base64 cleanup
Verify no richtext fields in v5 still contain data:image/ strings.

Output:
{
  "reportType": "post-migration-verification",
  "summary": {
    "recordParity": { "total": 7362, "matched": 7359, "missing": 3 },
    "fieldCompleteness": { "checked": 1000, "complete": 998, "incomplete": 2 },
    "relationIntegrity": { "checked": 4200, "intact": 4200, "broken": 0 },
    "mediaAvailability": { "checked": 4521, "accessible": 4521, "missing": 0 },
    "base64Cleanup": { "checked": 2100, "clean": 2100, "remaining": 0 }
  }
}

Produce in all four formats (JSON, HTML, Markdown, CSV).

### 3. CLI Progress Display (packages/migrator/)

Terminal progress using a library like cli-progress or custom ANSI output:

StrapiShift Migration Runner v1.0.0

Pre-flight: ✅ v3 reachable  ✅ v5 reachable  ✅ auth valid

Media Library:    ████████████████████ 4,521/4,521  ✅ complete (2m 14s)
Categories:       ████████████████████    28/28     ✅ complete (0.4s)
Authors:          ████████████████████    45/45     ✅ complete (0.8s)
Articles:         ████████████░░░░░░░░   850/2,100  ⏳ in progress (47%)
  └─ Base64 extraction: 234 images extracted so far
Pages:            ░░░░░░░░░░░░░░░░░░░░     0/156   ⏸ pending
Navigation:       ░░░░░░░░░░░░░░░░░░░░     0/12    ⏸ pending

Errors: 3 (2 retryable, 1 manual review needed)
Elapsed: 4m 32s  |  Est. remaining: 5m 10s

### 4. Web Dashboard (packages/web/)

Add a /dashboard page to the Nuxt app:

#### 4.1 Backend
Add a Nitro server route that:
- Accepts WebSocket connections
- Runs the migration runner
- Forwards RunnerEvent emissions to connected WebSocket clients
- Accepts client commands: pause, resume, retry, abort

WebSocket protocol:
// Server → Client: RunnerEvent objects (see above)
// Client → Server:
{ type: 'pause' }
{ type: 'resume' }
{ type: 'retry', contentType: string, v3Id: string }
{ type: 'abort' }

#### 4.2 Frontend
- Real-time progress bars per content type (Nuxt UI UProgress)
- Content type cards showing: name, status badge, migrated/total count,
  timing, error count
- Error panel: expandable error details, individual retry buttons
- Live log stream of migration events
- Controls: pause button, resume button, abort (with confirmation modal)
- Verification report display after migration completes

#### 4.3 Design
- Dark mode only (consistent with rest of app)
- Nuxt UI components throughout
- Print stylesheet for verification report (light mode for print)
- Responsive: desktop-primary

## File Structure (additions)

packages/migrator/
├── src/
│   ├── runner/
│   │   ├── execution-engine.ts     (orchestrator)
│   │   ├── batch-processor.ts      (batching + concurrency)
│   │   ├── error-queue.ts          (capture + retry)
│   │   ├── event-emitter.ts        (RunnerEvent emission)
│   │   └── cli-progress.ts         (terminal progress display)
│   └── verification/
│       ├── verification-suite.ts   (runs all checks)
│       ├── record-count.ts
│       ├── field-completeness.ts
│       ├── relation-integrity.ts
│       ├── media-availability.ts
│       └── base64-cleanup.ts

packages/web/
├── server/
│   └── routes/
│       └── ws/
│           └── migration.ts        (WebSocket endpoint)
├── pages/
│   └── dashboard.vue               (migration progress page)
├── components/
│   ├── MigrationProgress.vue       (per-content-type progress bars)
│   ├── ErrorQueue.vue              (error list with retry buttons)
│   ├── MigrationControls.vue       (pause/resume/abort)
│   ├── MigrationLog.vue            (live event stream)
│   └── VerificationReport.vue      (post-migration verification)
└── composables/
    └── useMigrationSocket.ts       (WebSocket connection management)

## Test Instructions

### Runner tests
- batch-processor.test.ts: batch size respected, concurrency enforced,
  backpressure on 429
- error-queue.test.ts: failed records captured with full context, retry
  counts tracked
- retry-policy.test.ts: correct strategy per error type, exponential
  backoff timing, max retries
- event-emitter.test.ts: correct events emitted for each state change

### Verification tests
- record-count.test.ts: detect missing records
- field-completeness.test.ts: detect null fields that should have values
- relation-integrity.test.ts: verify referenced records exist
- media-availability.test.ts: verify URLs are accessible
- base64-cleanup.test.ts: detect remaining Base64 strings

### Integration tests
- full-run.test.ts: complete migration of test data, verification passes
- resume-run.test.ts: interrupt mid-migration, resume, no duplicates
- error-retry.test.ts: inject failures, retry succeeds

### Web dashboard tests
- MigrationProgress renders and updates from WebSocket events
- ErrorQueue displays errors with retry buttons
- MigrationControls sends correct WebSocket commands
- VerificationReport renders after migration completes
```

---

## 9. Usage Notes

- Feed one prompt per LLM conversation for best results.
- Provide test fixtures (v3 schema JSON files) alongside the prompt.
- After each phase, run the test suite before proceeding to the next prompt.
- Phase prompts reference the output of previous phases — provide the built code as context when moving to the next phase.
- The Phase 1 Core prompt is the most detailed because it defines the types and patterns that all subsequent phases depend on.
- **Module architecture:** Phases 2-5 are optional modules. Each prompt includes the module registration code. Ensure @strapishift/core's module registration API is built and tested in Phase 1 before starting any module prompt.
- **Provide previous phase code:** When starting a module prompt, include the built @strapishift/core source (especially types.ts, index.ts, and the module registration API) as context so the LLM can import correctly.

---

## 10. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft — Phase 1 prompts fully specified, Phase 2-5 prompts outlined | Chris |
| 2026-03-14 | 1.1.0 | Completed all Phase 2-5 prompts to full specification; added module registration patterns; added security requirements per prompt | Chris |
| 2026-03-14 | 1.2.0 | Rewrote Web UI prompt: nuxt.com-style design, added /features + /docs pages, WCAG AA 2.1 requirements, responsive mobile-first, dark default with toggle, strapishift.config.ts integration, Nuxt Content for docs | Chris |
