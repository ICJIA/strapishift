# STRAPISHIFT — Doc 01: Phase 1 — Schema Analysis, Parity Verification & Migration Report

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Phase 1 Overview

Phase 1 delivers two core capabilities from day one:

**Schema Analysis** — parse Strapi v3 content type schemas, run a rule engine against them, and produce a structured migration report in four formats (JSON, HTML, Markdown, CSV). Everything analysis-related is client-side — no backend, no database.

**Parity Verification** — compare a Strapi v3 schema against an existing Strapi v5 instance (or v5 schema files) and produce a structural parity report identifying every missing content type, missing field, type mismatch, and broken relation. This is a first-class Phase 1 deliverable, not an afterthought. It ships on day one because it solves an immediate need: validating migrations that have already been performed (whether manually, via direct database manipulation, or by a contract developer).

The parity checker produces a downloadable HTML report with an actionable fix checklist — a developer can hand this to a contractor and say "fix these items."

### Working Deliverables

1. A user can analyze a v3 schema via web UI or CLI and download a migration report.
2. A developer can run `strapishift verify` to compare their existing v5 instance against the v3 source and receive a detailed parity report with fix checklist.
3. Both tools produce output in four formats: JSON (LLM-friendly), HTML (human-readable with fix checklist), Markdown (GitHub-friendly), and CSV (spreadsheet-friendly).

### Packages Involved

- `@strapishift/core` — analysis engine, rule system, reporters, parity checker
- `@strapishift/web` — Nuxt 4.4.2 + Nuxt UI 4.5.1 dashboard
- `@strapishift/cli` — terminal interface via citty

---

## 2. Schema Parser

### 2.1 Input Formats

The parser accepts Strapi v3 schemas in three forms:

**Single schema JSON** — a content type's `schema.json` file:

```json
{
  "kind": "collectionType",
  "connection": "default",
  "collectionName": "articles",
  "info": { "name": "article", "description": "" },
  "options": { "increments": true, "timestamps": ["created_at", "updated_at"] },
  "attributes": {
    "title": { "type": "string", "required": true },
    "body": { "type": "richtext" },
    "slug": { "type": "uid", "targetField": "title" },
    "author": { "model": "user", "via": "articles" },
    "categories": { "collection": "category", "via": "articles", "dominant": true },
    "cover": { "model": "file", "via": "related", "plugin": "upload" },
    "published_at": { "type": "datetime" }
  }
}
```

**Multiple schema files** — a zip of the `api/` directory or a directory path (CLI). The parser walks the directory tree looking for `content-types/*/schema.json` files and `components/**/*.json` files.

**Content Type Builder export** — the JSON returned by Strapi v3's `/content-type-builder/content-types` endpoint (used in Phase 2 for live scanning, but the parser handles this format from Phase 1).

### 2.2 Internal Representation

All input formats are normalized into a common internal structure:

```typescript
interface ParsedSchema {
  contentTypes: ParsedContentType[];
  components: ParsedComponent[];
  metadata: {
    sourceFormat: 'single-schema' | 'directory' | 'content-type-builder';
    strapiVersion: '3.x';
    databaseEngine: 'mongodb' | 'sqlite' | 'postgres' | 'mysql' | 'unknown';
    totalContentTypes: number;
    totalComponents: number;
  };
}

interface ParsedContentType {
  name: string;                    // e.g., "article"
  uid: string;                     // e.g., "api::article.article" (v5 format, generated)
  collectionName: string;          // e.g., "articles"
  kind: 'collectionType' | 'singleType';
  fields: ParsedField[];
  hasTimestamps: boolean;
  hasDraftPublish: boolean;
  usesI18n: boolean;
  rawSchema: Record<string, any>;  // original v3 schema for reference
}

interface ParsedField {
  name: string;
  type: V3FieldType;
  required: boolean;
  unique: boolean;
  defaultValue?: any;
  // Relation-specific
  relation?: {
    type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
    target: string;           // target content type name
    via?: string;             // inverse field name
    dominant?: boolean;       // v3 dominant side (manyToMany)
    plugin?: string;          // e.g., "upload" for media fields
  };
  // Component-specific
  component?: {
    name: string;
    repeatable: boolean;
  };
  // Dynamic zone
  dynamicZone?: {
    components: string[];
  };
  // Enum
  enumValues?: string[];
  // UID
  targetField?: string;
  rawAttribute: Record<string, any>;  // original v3 attribute
}

type V3FieldType =
  | 'string' | 'text' | 'richtext' | 'email' | 'password'
  | 'integer' | 'biginteger' | 'float' | 'decimal'
  | 'date' | 'time' | 'datetime' | 'timestamp'
  | 'boolean' | 'enumeration' | 'json' | 'uid'
  | 'relation' | 'component' | 'dynamiczone'
  | 'media';
```

### 2.3 Parser Logic

**Relation detection:** Strapi v3 uses `model` for singular relations and `collection` for plural relations. The parser infers cardinality:

| v3 Attribute | Inferred Relation |
|-------------|------------------|
| `{ "model": "user" }` | manyToOne (or oneToOne if `unique: true`) |
| `{ "model": "user", "via": "articles" }` | manyToOne (inverse side defined) |
| `{ "collection": "category" }` | oneToMany |
| `{ "collection": "category", "via": "articles", "dominant": true }` | manyToMany (dominant side) |
| `{ "model": "file", "plugin": "upload" }` | media (single) |
| `{ "collection": "file", "plugin": "upload" }` | media (multiple) |

**Component detection:** Fields with `"type": "component"` include a `"component"` string (e.g., `"components.hero"`) and optional `"repeatable": true`.

**Database engine inference:** The parser checks the `connection` field and known configuration patterns. If the schema references a MongoDB connection or uses MongoDB-specific patterns (`ObjectId`, embedded documents), it flags the source as MongoDB.

---

## 3. Rule Engine

### 3.1 Architecture

Rules are pure functions registered in a central registry. Each rule receives a `ParsedContentType` and returns an array of `Finding` objects (possibly empty). Rules are stateless and side-effect-free.

```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  phase: 'schema' | 'data' | 'api' | 'infrastructure';
  detect(contentType: ParsedContentType, context: AnalysisContext): Finding[];
}

interface AnalysisContext {
  allContentTypes: ParsedContentType[];  // for cross-reference checks
  allComponents: ParsedComponent[];
  metadata: ParsedSchema['metadata'];
}

type RuleCategory = 'database' | 'api' | 'media' | 'relation' | 'auth' | 'plugin' | 'graphql';
```

The registry loads all rules at initialization and executes them in category order against each content type. Cross-content-type rules (like relation consistency checks) receive the full context.

### 3.2 Database Rules

These rules detect breaking changes related to the MongoDB → SQL migration and field storage format changes.

#### `db-field-naming` — Field Naming Convention Changes

**Detects:** Fields that will be renamed during migration.

| v3 Pattern | v5 Equivalent | Severity |
|-----------|--------------|----------|
| `_id` | `id` | info |
| `created_at` | `createdAt` | info |
| `updated_at` | `updatedAt` | info |
| `published_at` | `publishedAt` | info |
| Any `snake_case` custom field | Still `snake_case` (no change) | — |

**Action:** Update all API consumers that reference `_id` to use `id`. Timestamp fields are auto-renamed by Strapi v5 but consumers must update.

**Effort:** Low

#### `db-mongodb-nested` — Nested Document Flattening

**Detects:** JSON fields that likely contain nested documents (MongoDB-specific pattern). In v3 on MongoDB, JSON fields could store arbitrarily nested documents. On SQL, these become serialized JSON strings with different query behavior.

**Severity:** Warning

**Action:** Review JSON field contents. Complex nested queries against these fields will not work in SQL. Consider restructuring as components or separate content types.

**Effort:** Medium to High (depends on query complexity)

#### `db-objectid-refs` — ObjectId Reference Format

**Detects:** Relation fields on MongoDB-backed instances. ObjectId references are replaced by integer IDs in SQL.

**Severity:** Info

**Action:** All code that constructs or parses ObjectId strings must be updated. The ID mapping table (Phase 4) handles data migration.

**Effort:** Low

#### `db-mixed-type-fields` — Mixed-Type Field Values

**Detects:** JSON fields or relation fields that may contain mixed types (a MongoDB flexibility not available in SQL).

**Severity:** Warning

**Action:** Audit field contents for type consistency. SQL columns enforce a single type.

**Effort:** Medium

### 3.3 API Rules

These rules detect breaking changes in the REST and GraphQL API surface.

#### `api-response-envelope` — Response Envelope Changes

**Detects:** All content types (this is a universal change). Strapi v5 flattens the response envelope — `data.attributes` no longer exists.

| v3 Response | v5 Response |
|------------|------------|
| `{ data: { id, attributes: { title, body } } }` | `{ data: { id, title, body } }` |
| `{ data: [{ id, attributes: {...} }] }` | `{ data: [{ id, title, body }] }` |

**Severity:** Warning (every frontend consumer must update)

**Action:** Update all API consumers to remove `.attributes` access. Search codebase for `.attributes.` and `data.attributes`.

**Effort:** Medium (proportional to number of frontend consumers)

#### `api-filter-syntax` — Filter Query Parameter Changes

**Detects:** All content types. Filter syntax changed completely between v3 and v5.

| v3 Filter | v5 Filter |
|----------|----------|
| `?title_contains=hello` | `?filters[title][$contains]=hello` |
| `?_where[title]=hello` | `?filters[title][$eq]=hello` |
| `?_sort=title:ASC` | `?sort=title:asc` |
| `?_limit=10&_start=0` | `?pagination[limit]=10&pagination[start]=0` |

**Severity:** Warning

**Action:** Update all API queries in frontend code. The v3 shorthand filters are not supported in v5.

**Effort:** Medium

#### `api-populate-syntax` — Population Behavior Changes

**Detects:** Content types with relation fields. Strapi v5 does not populate relations by default (v3 populated one level deep by default).

**Severity:** Warning

**Action:** Add explicit `?populate=*` or targeted populate parameters to all API queries that expect relation data. Review v5 populate documentation for nested population syntax.

**Effort:** Medium

#### `api-pagination-format` — Pagination Response Changes

**Detects:** All collection types. Pagination metadata format changed.

| v3 Pagination | v5 Pagination |
|--------------|--------------|
| `X-Total-Count` header | `meta.pagination.total` in response body |
| `_start` / `_limit` params | `pagination[start]` / `pagination[limit]` or `pagination[page]` / `pagination[pageSize]` |

**Severity:** Warning

**Action:** Update pagination logic in frontend consumers. V5 supports both offset and page-based pagination but with different parameter names.

**Effort:** Low to Medium

#### `api-graphql-changes` — GraphQL Plugin Breaking Changes

**Detects:** Projects using the GraphQL plugin (inferred from schema or configuration).

**Key changes:**

- Query/mutation naming conventions changed
- Nested filtering syntax changed
- Custom resolver registration API changed completely
- Shadow CRUD auto-generation behavior changed

**Severity:** Warning

**Action:** Audit all GraphQL queries and mutations. Custom resolvers must be rewritten for v5's resolver API. Consider using `nuxt-graphql-client` (or equivalent) for the updated schema.

**Effort:** High (for projects with custom resolvers)

### 3.4 Media Rules

#### `media-base64-candidate` — Base64 Image Detection (Schema-Level)

**Detects:** All `richtext` fields. These are candidates for containing Base64-encoded images — a common v3 pattern where uploaded images were stored as `data:image/` strings directly in the rich text content rather than as media library references.

**Severity:** Blocker

**Why blocker:** Base64 images in rich text will not display correctly in v5's media handling. They inflate database size, cannot be managed through the media library, and break responsive image handling. This must be resolved before migration.

**Action:** Flag for Phase 2 content scanning. If Phase 2 is not used, manually audit rich text content for `data:image/` strings. Extract Base64 images to the media library and replace with proper references.

**Effort:** High

**Note:** At the schema level, this rule can only flag candidates. It cannot confirm whether the actual content contains Base64 images — that requires Phase 2's live content scanning.

#### `media-reference-format` — Media Library Reference Changes

**Detects:** All media fields (single and multiple).

**v3 format:** `{ "model": "file", "plugin": "upload" }` with relation stored as file ID reference.

**v5 format:** Media fields use a standardized relation format with different population behavior.

**Severity:** Warning

**Action:** Update media field handling in frontend code. Media fields must be explicitly populated in v5 (`?populate=cover` or `?populate[cover][fields][0]=url`).

**Effort:** Low to Medium

#### `media-provider-config` — Upload Provider Changes

**Detects:** Projects using custom upload providers (inferred from configuration if available).

**Severity:** Info

**Action:** Verify upload provider compatibility with Strapi v5. Some v3 providers may not have v5-compatible versions.

**Effort:** Low (if provider has v5 version) to High (if custom provider needs rewriting)

### 3.5 Relation Rules

#### `rel-cardinality-syntax` — Relation Definition Changes

**Detects:** All relation fields. Strapi v5 uses a different syntax for defining relations.

| v3 Definition | v5 Definition |
|--------------|--------------|
| `{ "model": "user", "via": "articles" }` | `{ "type": "relation", "relation": "manyToOne", "target": "api::user.user", "inversedBy": "articles" }` |
| `{ "collection": "category", "via": "articles", "dominant": true }` | `{ "type": "relation", "relation": "manyToMany", "target": "api::category.category", "inversedBy": "articles" }` |

**Severity:** Warning (schema change, but Phase 3 auto-generates the correct v5 syntax)

**Action:** No manual action needed if using Phase 3 schema generation. If migrating manually, rewrite all relation definitions.

**Effort:** Low (with Phase 3) / High (without)

#### `rel-polymorphic` — Polymorphic Relation Changes

**Detects:** Relations using `morphTo` or `morphMany` patterns (v3 polymorphic relations, commonly used by the upload plugin).

**Severity:** Warning

**Action:** Review polymorphic relation usage. V5 handles media polymorphic relations automatically but custom polymorphic relations may need restructuring.

**Effort:** Medium

#### `rel-circular` — Circular Relation Detection

**Detects:** Content types that reference each other (A → B → A). Not a breaking change per se, but critical for Phase 4's dependency ordering algorithm.

**Severity:** Info

**Action:** Noted for migration script generation. Circular relations require special handling in dependency ordering (create records first, populate relations in a second pass).

**Effort:** N/A (handled by Phase 4)

### 3.6 Auth Rules

#### `auth-user-model` — Users & Permissions Plugin Changes

**Detects:** Content types with relations to the `user` model.

**Key changes:**

- Plugin API routes changed (`/auth/local` → `/api/auth/local`)
- User model uid changed to `plugin::users-permissions.user`
- Role model uid changed to `plugin::users-permissions.role`
- JWT configuration structure changed
- Permission format changed

**Severity:** Warning

**Action:** Update all auth-related API calls. Review JWT configuration. If using custom authentication logic, rewrite for v5's auth API.

**Effort:** Medium

### 3.7 Plugin Rules

#### `plugin-compatibility` — Plugin Ecosystem Gap Detection

**Detects:** Known v3 plugins that do not have v5 equivalents or have breaking changes.

**Known plugin status:**

| v3 Plugin | v5 Status | Severity |
|----------|----------|----------|
| `@strapi/plugin-graphql` | Available, API changed significantly | Warning |
| `@strapi/plugin-i18n` | Available, configuration changes | Warning |
| `@strapi/plugin-users-permissions` | Available, API changes | Warning |
| `strapi-plugin-upload` | Built-in, API changes | Warning |
| `strapi-plugin-email` | Available, provider config changes | Info |
| `strapi-plugin-documentation` | Available | Info |
| Community plugins | Check npm for v5-compatible versions | Warning |

**Action:** Audit all installed plugins. Check npm for v5-compatible versions. Plan replacements for plugins without v5 support.

**Effort:** Varies

### 3.8 GraphQL Rules

#### `graphql-schema-changes` — GraphQL Schema Generation Differences

**Detects:** Projects using GraphQL (if schema or plugin configuration indicates GraphQL usage).

**Key changes:**

- Auto-generated type names changed (e.g., `ArticleEntity` → different naming)
- Query/mutation naming changed
- Nested filter arguments restructured
- Custom resolver registration completely rewritten
- Extensions API changed

**Severity:** Warning (auto-generated queries) to Blocker (custom resolvers)

**Action:** Regenerate all GraphQL queries after v5 schema is live. Rewrite custom resolvers for v5's extension API. If using Apollo Client, review cache configuration for new type names.

**Effort:** High

---

## 4. Parity Checker

### 4.1 Purpose

The parity checker is a structural comparison engine that answers the question: "Does my Strapi v5 instance have everything my Strapi v3 instance had?"

It operates at two levels:

**Schema parity** (Phase 1/3): Compare v3 schema definitions against v5 schema definitions. Every content type, every field, every relation in v3 should have a corresponding element in v5.

**Data parity** (Phase 5): Compare actual record counts, field population rates, relation integrity, and media availability between v3 and v5 instances.

### 4.2 Schema Parity Checks

The parity checker compares a v3 `ParsedSchema` against a v5 schema (either generated files from Phase 3 or pulled from a live v5 instance via its Content Type Builder API).

#### Check: Content Type Presence

Every content type in v3 must exist in v5. Report missing content types.

```
✅ Article       — present in v5
✅ Author        — present in v5
✅ Category      — present in v5
🔴 Tag           — MISSING from v5
```

#### Check: Field Presence

Every field in each v3 content type must have a corresponding field in the v5 content type. Field names may differ (e.g., `snake_case` → `camelCase` for timestamp fields) — the checker accounts for known renames.

```
Content Type: Article
  ✅ title (string → string)
  ✅ body (richtext → richtext)
  ✅ slug (uid → uid)
  ✅ author (relation → relation)
  ⚠️  published_at → publishedAt (renamed, expected)
  🔴 legacy_field — MISSING from v5
```

#### Check: Field Type Compatibility

For each field present in both v3 and v5, verify the types are compatible. Some type changes are expected (the rule engine documents them); unexpected type changes are flagged.

```
Content Type: Article
  ✅ title: string → string (match)
  ✅ body: richtext → richtext (match)
  ⚠️  metadata: json → json (match, but nested query behavior differs on SQL)
  🔴 count: integer → string (TYPE MISMATCH)
```

#### Check: Relation Integrity

For each relation in v3, verify the corresponding v5 relation points to the correct target and has the correct cardinality.

```
Content Type: Article
  ✅ author: manyToOne → user (correct target, correct cardinality)
  ✅ categories: manyToMany → category (correct target, correct cardinality)
  🔴 tags: manyToMany → tag (target content type 'tag' missing from v5)
```

#### Check: Component Integrity

For each component used in v3, verify it exists in v5 with the correct fields.

```
Component: components.hero
  ✅ Present in v5
  ✅ title (string → string)
  ✅ image (media → media)
  🔴 subtitle — MISSING from v5
```

### 4.3 Parity Report Format

The parity report follows the same four-format pattern as the migration report:

**JSON** — machine-readable parity results for CI/CD integration:

```json
{
  "tool": "strapishift",
  "reportType": "parity-check",
  "version": "1.0.0",
  "generatedAt": "2026-03-14T12:00:00Z",
  "source": { "version": "3.x", "origin": "schema-file" },
  "target": { "version": "5.x", "origin": "live-instance" },
  "summary": {
    "totalChecks": 156,
    "passed": 148,
    "warnings": 5,
    "failures": 3,
    "parityScore": "94.9%"
  },
  "contentTypes": [
    {
      "name": "Article",
      "status": "pass",
      "checks": {
        "present": true,
        "fields": {
          "total": 8,
          "matched": 7,
          "missing": 1,
          "typeMismatch": 0,
          "details": [
            { "v3Field": "title", "v5Field": "title", "status": "match", "v3Type": "string", "v5Type": "string" },
            { "v3Field": "legacy_field", "v5Field": null, "status": "missing", "v3Type": "string", "v5Type": null }
          ]
        },
        "relations": { "total": 2, "matched": 2, "broken": 0 },
        "components": { "total": 1, "matched": 1, "incomplete": 0 }
      }
    }
  ]
}
```

**HTML** — visual parity dashboard with side-by-side comparison

**Markdown** — checklist of parity failures for remediation tracking

**CSV** — flat table of all checks for spreadsheet filtering

### 4.4 Usage Modes

**Standalone (Phase 1):** Compare v3 schema file against v5 schema file.

```bash
strapishift verify --v3-schema ./v3-schema.json --v5-schema ./v5-schema.json
```

**Against live v5 instance (Phase 3+):** Compare v3 schema against a running v5 instance.

```bash
strapishift verify --v3-schema ./v3-schema.json --v5-url http://localhost:1338 --v5-token xxx
```

**Full data parity (Phase 5):** Compare both schemas and data between live v3 and v5 instances.

```bash
strapishift verify --v3-url http://localhost:1337 --v3-token xxx --v5-url http://localhost:1338 --v5-token xxx --data
```

### 4.5 Integration with Pipeline

| Pipeline Stage | Parity Check Role |
|---------------|------------------|
| After Phase 3 (Schema Generation) | Verify generated v5 schemas match v3 source — every content type, field, relation, component accounted for |
| After Phase 4 (Script Generation, dry-run) | Verify the migration script's transform logic produces v5-compatible output for every v3 field |
| After Phase 5 (Migration Complete) | Full data parity: record counts, field population, relation integrity, media availability |
| Standalone | Manual migration verification — developer migrated without StrapiShift, wants to confirm parity |

---

## 5. Reporters

### 5.1 JSON Reporter

Produces an LLM-friendly JSON report. The full schema is documented in Doc 00, Section 9.

Key design principles:

- Self-contained: an LLM can generate migration code from this JSON alone
- Summary-first: top-level summary with aggregate counts before detailed findings
- Stable schema: the JSON structure is versioned and backward-compatible
- Includes both findings and the migration checklist (phased action plan)

### 5.2 HTML Reporter

Produces a self-contained single HTML file with inline CSS and JS. No external dependencies.

**Layout:**

- Header: project name, generation timestamp, summary statistics
- Traffic-light grid: one card per content type, color-coded by worst severity
- Click a card → expands to show all findings for that content type
- Sidebar filters: severity, category, effort level
- Export buttons: download as JSON, Markdown, or CSV from within the HTML report
- Default: dark mode for screen display (matches web app default). Both dark and light themes supported in the web app via Nuxt UI colorMode toggle.
- **Print stylesheet (`@media print`):** Switches to white background, dark text, high-contrast severity badges (solid colored borders instead of colored backgrounds), hides interactive elements (filters, export buttons, expand/collapse JS). The parity fix checklist is the primary print target — it must be legible, professional, and actionable on paper. Checkbox items render as empty squares for manual tracking.

### 5.3 Markdown Reporter

Produces a GitHub-flavored Markdown document structured as a migration checklist.

**Structure:**

```markdown
# StrapiShift Migration Report
Generated: 2026-03-14

## Summary
- Content Types: 12
- Clean: 7 | Warnings: 3 | Blockers: 2
- Total Findings: 34

## Blockers (Resolve Before Migration)
### MediaGallery
- [ ] **[BLOCKER]** `body` (richtext): May contain Base64-encoded images
  - Action: Audit content for `data:image/` strings, extract to media library
  - Effort: High

## Warnings
### Article
- [ ] **[WARNING]** API response envelope changed (data.attributes flattened)
  - Action: Update all API consumers to remove `.attributes` access
  - Effort: Medium

## Info
...

## Migration Checklist
### Pre-Migration
- [ ] Audit all rich text fields for Base64-encoded images
- [ ] ...
### Schema Migration
- [ ] ...
### API Migration
- [ ] ...
### Post-Migration Verification
- [ ] Run parity check: `strapishift verify --v3-schema ... --v5-url ...`
```

### 5.4 CSV Reporter

Produces a flat CSV with one row per finding:

```
content_type,field,rule_id,severity,category,title,action,effort,affects_api,affects_database
Article,body,media-base64-candidate,blocker,media,"Rich text field may contain Base64 images","Audit content for data:image/ strings",high,true,true
Article,,api-response-envelope,warning,api,"Response envelope changed","Update API consumers",medium,true,false
```

---

## 6. Scoring Engine

### 6.1 Content Type Scoring

Each content type receives a status based on its worst finding:

| Status | Condition | Display |
|--------|-----------|---------|
| `clean` | No findings, or info-only findings | ✅ Green |
| `warning` | At least one warning, no blockers | ⚠️ Yellow |
| `blocker` | At least one blocker | 🔴 Red |

### 6.2 Overall Migration Score

The report includes an overall migration readiness score:

```
Migration Readiness: 67% (8 of 12 content types clean)
Blockers: 2 content types require action before migration can proceed
Estimated Effort: 40-60 hours (based on finding count and effort ratings)
```

The effort estimate is a rough heuristic:

| Effort Level | Estimated Hours Per Finding |
|-------------|---------------------------|
| Low | 0.5–1 hour |
| Medium | 2–4 hours |
| High | 8–16 hours |

---

## 7. Web Interface (Phase 1)

### 7.1 Page: `/` (Landing + Input)

**Components:**

- `SchemaInput.vue` — dual-mode input:
  - **Paste mode:** Large textarea with JSON syntax highlighting (or at minimum, monospace font and basic validation). Paste button that reads from clipboard.
  - **Upload mode:** Drop zone accepting `.json` files and `.zip` files (for `api/` directory uploads). Shows filename and size after drop.
- Validation feedback: if the JSON is invalid or doesn't look like a Strapi v3 schema, show a clear error before allowing analysis.
- "Analyze" button — triggers the core engine, navigates to `/report` on completion.

### 7.2 Page: `/report` (Dashboard)

**Components:**

- `ReportDashboard.vue` — top-level layout:
  - Summary bar: total content types, clean/warning/blocker counts, migration readiness score
  - Filter controls: severity dropdown, category dropdown, effort dropdown
  - Content type grid: cards arranged in a responsive grid
- `ContentTypeCard.vue` — one per content type:
  - Name, status badge (green/yellow/red), finding count
  - Click to expand → shows all findings for this content type
- `FindingRow.vue` — one per finding within an expanded card:
  - Severity badge, field name (if field-level), title, action summary
  - Expandable detail: full description, effort, docs link
- `ExportMenu.vue` — dropdown with four options:
  - Download JSON
  - Download HTML (self-contained report)
  - Download Markdown
  - Download CSV
- `ParityCheck.vue` (optional in Phase 1) — if the user also provides a v5 schema, show parity results alongside migration findings.

### 7.3 Page: `/verify` (Parity Verification)

**This is a primary Phase 1 page**, not secondary to the analysis dashboard.

**Components:**

- `VerifyInput.vue` — dual-source input:
  - **v3 source:** Paste schema JSON, upload file, or provide v3 API URL + token
  - **v5 target:** Upload v5 schema files, provide v5 API URL + token, or point to v5 `src/api/` directory
  - Validation: both sides must be provided before the "Verify Parity" button enables
- `ParityDashboard.vue` — parity results layout:
  - Parity score banner: "94.9% parity — 3 failures, 5 warnings, 148 passed"
  - Side-by-side content type list: v3 (left) ↔ v5 (right) with match indicators
  - Color-coded: green (match), yellow (expected change), red (failure/missing)
- `ParityContentType.vue` — expandable per content type:
  - Field-by-field comparison table: v3 field name, v3 type, v5 field name, v5 type, status
  - Relation comparison: target, cardinality, status
  - Component comparison: fields present/missing
- `ParityFixList.vue` — the actionable output:
  - Filterable list of all parity failures and warnings
  - Each item: content type, field, what's wrong, what needs to happen
  - Severity badge: 🔴 missing (must fix), ⚠️ changed (review), ℹ️ expected rename
- `ParityExportMenu.vue` — download parity report:
  - **HTML fix checklist** (primary) — self-contained, printable, hand-to-contractor ready
  - JSON — for CI/CD or LLM consumption
  - Markdown — for GitHub issues or project tracking
  - CSV — for spreadsheet assignment and tracking

**The HTML fix checklist** is designed to be the document you hand to a contractor. It includes:
- Executive summary with parity score
- Critical fixes section (missing content types, missing fields) — items that must be resolved
- Review items section (type changes, expected renames) — items that should be verified
- Each fix item includes: what's wrong, where it is, what the v3 original looked like, what the v5 target should look like
- Printable layout with checkbox-style items for tracking completion

### 7.4 Page: `/about`

Static page explaining what StrapiShift is, who it's for, and how to use it. Links to GitHub repo and documentation.

---

## 8. CLI Interface (Phase 1)

### 8.1 Commands

#### `strapishift analyze`

```
Usage: strapishift analyze <schema> [options]

Arguments:
  schema              Path to v3 schema.json file or api/ directory

Options:
  --format <formats>  Output formats: json,html,md,csv (default: "json,html,md,csv")
  --output <file>     Output file path (single format only)
  --output-dir <dir>  Output directory (multiple formats, default: "./strapishift-report")
  --recursive         Treat input as api/ directory, scan recursively
  --quiet             Suppress terminal output (for piping)
  --no-color          Disable colored output
```

**Terminal output (when not `--quiet`):**

```
StrapiShift v1.0.0 — Analyzing Strapi v3 schema...

Parsed 12 content types, 8 components

  ✅ Article          — 2 warnings, 0 blockers
  ✅ Author           — 0 warnings, 0 blockers
  ✅ Category         — 1 info
  ⚠️  Page             — 3 warnings, 0 blockers
  ⚠️  Navigation       — 1 warning, 0 blockers
  🔴 MediaGallery     — 1 warning, 3 blockers
  ...

Summary: 8 clean, 3 warnings, 1 blocker
Migration Readiness: 67%

Reports written to ./strapishift-report/
  → report.json (42 KB)
  → report.html (118 KB)
  → report.md (24 KB)
  → report.csv (8 KB)
```

#### `strapishift verify`

```
Usage: strapishift verify [options]

Options:
  --v3-schema <file>  Path to v3 schema.json or api/ directory
  --v5-schema <file>  Path to v5 schema files or api/ directory
  --v5-url <url>      URL of running Strapi v5 instance
  --v5-token <token>  API token for v5 instance
  --format <formats>  Output formats (default: "json,md")
  --output-dir <dir>  Output directory
```

#### `strapishift` (no arguments — interactive wizard)

```
$ strapishift

  ╔═══════════════════════════════════════╗
  ║  StrapiShift v1.0.0                   ║
  ║  Strapi v3 → v5 Migration Platform    ║
  ╚═══════════════════════════════════════╝

  ? What would you like to do?
    ❯ Analyze a v3 schema
      Verify v3/v5 parity
      Scan a live v3 instance (Phase 2)
      Generate v5 schemas (Phase 3)
      Generate migration scripts (Phase 4)

  ? How would you like to provide your v3 schema?
    ❯ Path to schema.json file
      Path to api/ directory
      Paste JSON

  ? Path to schema file: ./src/api/

  ? Output formats:
    ◉ JSON (LLM-friendly)
    ◉ HTML (detailed dashboard)
    ◉ Markdown (checklist)
    ◉ CSV (spreadsheet)

  ? Output directory: ./strapishift-report

  Analyzing...
```

---

## 9. Test Plan

### 9.1 Test Infrastructure

- **Framework:** Vitest
- **Fixtures:** `packages/core/test/fixtures/` containing real-world v3 schemas
  - `researchhub-schema.json` — the actual ResearchHub v3 schema
  - `minimal-schema.json` — single content type, basic fields
  - `complex-schema.json` — many-to-many relations, components, dynamic zones, i18n
  - `mongodb-schema.json` — schema from a MongoDB-backed instance
  - `sqlite-schema.json` — schema from a SQLite-backed v3 instance
- **Snapshot testing:** Reporter outputs are snapshot-tested to catch unintended format changes

### 9.2 Core Unit Tests

#### Parser Tests (`packages/core/test/parser/`)

| Test File | What It Tests |
|-----------|--------------|
| `schema-parser.test.ts` | Single schema JSON → ParsedSchema. Validates all fields parsed, metadata correct. |
| `directory-parser.test.ts` | Multi-file api/ directory → ParsedSchema. All content types and components found. |
| `relation-parser.test.ts` | v3 relation attributes → correct cardinality inference. Covers all 6 relation patterns. |
| `component-parser.test.ts` | Component and dynamic zone parsing. Repeatable flag, component list. |
| `edge-cases.test.ts` | Empty schemas, missing fields, malformed JSON (graceful errors, not crashes). |

#### Rule Tests (`packages/core/test/rules/`)

Each rule has its own test file. Pattern: provide a crafted v3 schema fragment, assert the exact findings produced.

| Test File | Rules Tested | Key Assertions |
|-----------|-------------|----------------|
| `database-rules.test.ts` | `db-field-naming`, `db-mongodb-nested`, `db-objectid-refs`, `db-mixed-type-fields` | `_id` field flagged; JSON fields on MongoDB flagged; clean schema produces no findings |
| `api-rules.test.ts` | `api-response-envelope`, `api-filter-syntax`, `api-populate-syntax`, `api-pagination-format`, `api-graphql-changes` | Every content type gets response envelope warning; relation fields get populate warning |
| `media-rules.test.ts` | `media-base64-candidate`, `media-reference-format`, `media-provider-config` | Every richtext field flagged as Base64 candidate (blocker); media fields flagged for reference format change |
| `relation-rules.test.ts` | `rel-cardinality-syntax`, `rel-polymorphic`, `rel-circular` | Each v3 relation type produces correct v5 mapping note; circular refs detected |
| `auth-rules.test.ts` | `auth-user-model` | Content types referencing `user` model flagged; auth route changes noted |
| `plugin-rules.test.ts` | `plugin-compatibility` | Known plugins flagged with correct v5 status |
| `graphql-rules.test.ts` | `graphql-schema-changes` | Projects with GraphQL flagged for schema regeneration |

#### Reporter Tests (`packages/core/test/reporters/`)

| Test File | What It Tests |
|-----------|--------------|
| `json-reporter.test.ts` | Output is valid JSON; contains `tool`, `version`, `summary`, `contentTypes` fields; finding count matches; parseable by `JSON.parse()` |
| `html-reporter.test.ts` | Output is valid HTML; contains all content type names; contains all severity badges; self-contained (no external resource references) |
| `markdown-reporter.test.ts` | Output contains `- [ ]` checklist items for every finding; blockers listed before warnings; phase sections present |
| `csv-reporter.test.ts` | Output has correct header row; row count matches finding count; all columns present; parseable by CSV parser |

#### Parity Checker Tests (`packages/core/test/parity/`)

| Test File | What It Tests |
|-----------|--------------|
| `content-type-presence.test.ts` | Missing content types detected; extra v5 content types flagged as info |
| `field-presence.test.ts` | Missing fields detected; known renames handled (published_at → publishedAt) |
| `field-type-compat.test.ts` | Compatible types pass; incompatible types flagged; expected type changes (from rule engine) accepted |
| `relation-integrity.test.ts` | Broken relation targets detected; cardinality mismatches flagged |
| `component-integrity.test.ts` | Missing components detected; incomplete components (missing fields) flagged |
| `parity-reporter.test.ts` | Parity report JSON is valid; parity score calculation correct; all four formats generated |

#### Scoring Tests (`packages/core/test/scoring/`)

| Test File | What It Tests |
|-----------|--------------|
| `scorer.test.ts` | Content type with no findings → `clean`; with warning → `warning`; with blocker → `blocker`; overall readiness score calculation; effort estimation |

### 9.3 Integration Tests

| Test | What It Tests |
|------|--------------|
| `researchhub-analysis.test.ts` | Full analysis of actual ResearchHub v3 schema. Base64 candidate flagged. Relation changes detected. All 50 manual checklist items have corresponding findings. |
| `minimal-roundtrip.test.ts` | Parse minimal schema → analyze → produce all four report formats → verify reports are non-empty and consistent |
| `complex-schema.test.ts` | Parse complex schema with every field type, relation type, and feature → verify no crashes, all fields analyzed |
| `parity-roundtrip.test.ts` | Parse v3 schema → generate mock v5 schema with known differences → run parity checker → verify all differences detected |

### 9.4 CLI Tests

| Test | What It Tests |
|------|--------------|
| `analyze-valid.test.ts` | `strapishift analyze fixtures/minimal-schema.json` → exit 0, report files exist |
| `analyze-invalid.test.ts` | `strapishift analyze bad-input.txt` → exit 1, error message contains "Invalid" |
| `analyze-blockers.test.ts` | `strapishift analyze fixtures/researchhub-schema.json` → exit 2 (blockers found) |
| `analyze-formats.test.ts` | `--format json` → only JSON file; `--format md,csv` → only MD and CSV files |
| `analyze-quiet.test.ts` | `--quiet` → no terminal output, only file output |
| `verify-schemas.test.ts` | `strapishift verify --v3-schema ... --v5-schema ...` → parity report produced |
| `wizard.test.ts` | `strapishift` with no args → prompts appear (test with mock stdin) |

### 9.5 Web Tests

| Test | What It Tests |
|------|--------------|
| `SchemaInput.test.ts` | Accepts valid JSON paste → enables Analyze button. Rejects invalid JSON → shows error. File upload works for .json and .zip. |
| `ReportDashboard.test.ts` | Renders correct number of content type cards. Traffic-light colors match severity. Filter controls work. |
| `ContentTypeCard.test.ts` | Expands on click. Shows correct finding count. Severity badge color correct. |
| `FindingRow.test.ts` | Displays title, severity, field name. Expands to show description and action. |
| `ExportMenu.test.ts` | Each format triggers a download. Downloaded files are non-empty. |

### 9.6 Acceptance Criteria

All of the following must be true for Phase 1 to be considered complete:

- [ ] All unit tests pass (`pnpm test` from monorepo root)
- [ ] All integration tests pass
- [ ] All CLI tests pass
- [ ] All web tests pass
- [ ] The ResearchHub v3 schema produces a report that covers all known migration issues from the original 50-item manual checklist
- [ ] A developer can analyze a real Strapi v3 schema via the web UI in under 5 seconds
- [ ] A developer can analyze a real Strapi v3 schema via the CLI in under 2 seconds
- [ ] All four report formats are generated and valid
- [ ] The parity checker correctly identifies all structural differences between a v3 schema and a v5 schema with known intentional differences
- [ ] The CLI exits with code 2 when blockers are found (useful for CI gating)
- [ ] The web app deploys to Netlify successfully as a static site
- [ ] The CLI installs and runs via `npx strapishift` or global install

---

## 10. File Structure (Phase 1 Complete)

```
strapishift/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── parser/
│   │   │   │   ├── schema-parser.ts
│   │   │   │   ├── directory-parser.ts
│   │   │   │   ├── relation-parser.ts
│   │   │   │   ├── component-parser.ts
│   │   │   │   └── types.ts
│   │   │   ├── rules/
│   │   │   │   ├── index.ts                 (rule registry)
│   │   │   │   ├── database-rules.ts
│   │   │   │   ├── api-rules.ts
│   │   │   │   ├── media-rules.ts
│   │   │   │   ├── relation-rules.ts
│   │   │   │   ├── auth-rules.ts
│   │   │   │   ├── plugin-rules.ts
│   │   │   │   └── graphql-rules.ts
│   │   │   ├── parity/
│   │   │   │   ├── parity-checker.ts
│   │   │   │   ├── checks/
│   │   │   │   │   ├── content-type-presence.ts
│   │   │   │   │   ├── field-presence.ts
│   │   │   │   │   ├── field-type-compat.ts
│   │   │   │   │   ├── relation-integrity.ts
│   │   │   │   │   └── component-integrity.ts
│   │   │   │   └── types.ts
│   │   │   ├── reporter/
│   │   │   │   ├── types.ts
│   │   │   │   ├── json-reporter.ts
│   │   │   │   ├── html-reporter.ts
│   │   │   │   ├── markdown-reporter.ts
│   │   │   │   ├── csv-reporter.ts
│   │   │   │   └── parity-reporter.ts
│   │   │   ├── scorer.ts
│   │   │   └── index.ts                     (main entry: analyze + verify)
│   │   ├── test/
│   │   │   ├── fixtures/
│   │   │   │   ├── researchhub-schema.json
│   │   │   │   ├── minimal-schema.json
│   │   │   │   ├── complex-schema.json
│   │   │   │   ├── mongodb-schema.json
│   │   │   │   └── sqlite-schema.json
│   │   │   ├── parser/
│   │   │   ├── rules/
│   │   │   ├── parity/
│   │   │   ├── reporters/
│   │   │   ├── scoring/
│   │   │   └── integration/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── web/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   │   ├── index.vue
│   │   │   │   ├── report.vue
│   │   │   │   └── about.vue
│   │   │   ├── components/
│   │   │   │   ├── SchemaInput.vue
│   │   │   │   ├── ReportDashboard.vue
│   │   │   │   ├── ContentTypeCard.vue
│   │   │   │   ├── FindingRow.vue
│   │   │   │   ├── ExportMenu.vue
│   │   │   │   └── ParityCheck.vue
│   │   │   ├── composables/
│   │   │   │   ├── useAnalysis.ts
│   │   │   │   └── useExport.ts
│   │   │   └── app.config.ts
│   │   ├── nuxt.config.ts
│   │   ├── package.json
│   │   └── vitest.config.ts
│   └── cli/
│       ├── src/
│       │   ├── index.ts
│       │   ├── commands/
│       │   │   ├── analyze.ts
│       │   │   ├── verify.ts
│       │   │   └── wizard.ts
│       │   ├── output/
│       │   │   ├── terminal-reporter.ts
│       │   │   └── file-writer.ts
│       │   └── utils/
│       │       └── glob-loader.ts
│       ├── test/
│       ├── package.json
│       └── vitest.config.ts
├── docs/
│   ├── 00-master-design.md
│   ├── 01-phase1-schema-analysis.md    (this document)
│   └── ...
├── pnpm-workspace.yaml
├── package.json
├── .npmrc
└── vitest.workspace.ts
```

---

## 11. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft — full Phase 1 specification with rule engine, parity checker, reporters, test plan | Chris |
