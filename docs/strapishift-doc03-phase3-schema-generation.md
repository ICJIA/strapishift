# STRAPISHIFT — Doc 03: Phase 3 — v5 Schema Generation

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Phase 3 Overview

Phase 3 takes the analysis from Phase 1 (or the enhanced analysis from Phase 2) and produces complete, bootable Strapi v5 content type schemas. The developer creates a fresh Strapi v5 project, drops the generated schemas into `src/api/`, runs `strapi develop`, and Strapi v5 boots with the correct content type structure.

After generation, the Phase 1 parity checker runs automatically to verify the generated schemas match the v3 source.

### Working Deliverable

A developer runs `strapishift generate --input report.json --output ./v5-schemas/` and receives a complete `src/api/` directory structure. They can verify correctness with `strapishift verify --v3-schema ... --v5-schema ./v5-schemas/` before deploying.

### Package

`@strapishift/generator` — depends on `@strapishift/core` for parsed schema types, field type mappings, and parity verification.

---

## 2. Field Type Mapping

### 2.1 Direct Mappings

These v3 field types map directly to v5 with no transformation:

| v3 Type | v5 Type | Notes |
|---------|---------|-------|
| `string` | `string` | No change |
| `text` | `text` | No change |
| `richtext` | `richtext` | No change (but content may need Base64 extraction) |
| `email` | `email` | No change |
| `integer` | `integer` | No change |
| `biginteger` | `biginteger` | No change |
| `float` | `float` | No change |
| `decimal` | `decimal` | No change |
| `date` | `date` | No change |
| `time` | `time` | No change |
| `datetime` | `datetime` | No change |
| `boolean` | `boolean` | No change |
| `enumeration` | `enumeration` | No change |
| `json` | `json` | No change (but query behavior differs on SQL) |
| `uid` | `uid` | `targetField` syntax unchanged |
| `password` | `password` | No change |

### 2.2 Relation Mapping

Relations require complete syntax transformation:

| v3 Definition | v5 Definition |
|--------------|--------------|
| `{ "model": "user" }` | `{ "type": "relation", "relation": "manyToOne", "target": "api::user.user" }` |
| `{ "model": "user", "via": "articles" }` | `{ "type": "relation", "relation": "manyToOne", "target": "api::user.user", "inversedBy": "articles" }` |
| `{ "collection": "category" }` | `{ "type": "relation", "relation": "oneToMany", "target": "api::category.category" }` |
| `{ "collection": "category", "via": "articles", "dominant": true }` | `{ "type": "relation", "relation": "manyToMany", "target": "api::category.category", "inversedBy": "articles" }` |
| `{ "model": "file", "plugin": "upload" }` | `{ "type": "media", "multiple": false, "allowedTypes": ["images", "files", "videos", "audios"] }` |
| `{ "collection": "file", "plugin": "upload" }` | `{ "type": "media", "multiple": true, "allowedTypes": ["images", "files", "videos", "audios"] }` |

### 2.3 Component Mapping

| v3 | v5 |
|----|-----|
| `{ "type": "component", "component": "sections.hero" }` | `{ "type": "component", "component": "sections.hero", "repeatable": false }` |
| `{ "type": "component", "component": "sections.hero", "repeatable": true }` | `{ "type": "component", "component": "sections.hero", "repeatable": true }` |

### 2.4 Dynamic Zone Mapping

| v3 | v5 |
|----|-----|
| `{ "type": "dynamiczone", "components": ["sections.hero", "sections.cta"] }` | `{ "type": "dynamiczone", "components": ["sections.hero", "sections.cta"] }` |

Dynamic zones are largely unchanged in structure, but the component reference format may need updating if component UIDs changed.

### 2.5 UID Generation

Strapi v5 uses UIDs for content types and components:

| v3 | v5 UID |
|----|--------|
| Content type `article` | `api::article.article` |
| Content type `article` (plugin) | `plugin::plugin-name.article` |
| Component `sections.hero` | `sections.hero` (unchanged) |

---

## 3. Schema File Generation

### 3.1 Output Structure

For each content type, the generator produces the v5 directory structure:

```
src/api/
├── article/
│   ├── content-types/
│   │   └── article/
│   │       └── schema.json
│   ├── controllers/
│   │   └── article.ts          (stub)
│   ├── routes/
│   │   └── article.ts          (stub)
│   └── services/
│       └── article.ts          (stub)
├── author/
│   ├── content-types/
│   │   └── author/
│   │       └── schema.json
│   ├── controllers/
│   │   └── author.ts
│   ├── routes/
│   │   └── author.ts
│   └── services/
│       └── author.ts
└── ...
```

Components:

```
src/components/
├── sections/
│   ├── hero.json
│   └── cta.json
└── shared/
    └── seo.json
```

### 3.2 Generated Schema Format

Example — v3 Article schema generates:

```json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Article",
    "description": "Migrated from Strapi v3 by StrapiShift"
  },
  "options": {
    "draftAndPublish": true
  },
  "pluginOptions": {},
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "body": {
      "type": "richtext"
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    },
    "author": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::user.user",
      "inversedBy": "articles"
    },
    "categories": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::category.category",
      "inversedBy": "articles"
    },
    "cover": {
      "type": "media",
      "multiple": false,
      "allowedTypes": ["images", "files", "videos", "audios"]
    }
  }
}
```

### 3.3 Controller/Route/Service Stubs

Generated stubs use Strapi v5's factory pattern:

```typescript
// src/api/article/controllers/article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::article.article');
```

```typescript
// src/api/article/services/article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreService('api::article.article');
```

```typescript
// src/api/article/routes/article.ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::article.article');
```

### 3.4 Per-Content-Type README

Each content type directory includes a `MIGRATION-NOTES.md` documenting what changed:

```markdown
# Article — Migration Notes

## Changes from v3
- Relation `author`: syntax changed from `{ model: "user" }` to v5 relation format
- Relation `categories`: syntax changed, `dominant` removed (v5 handles this internally)
- Media `cover`: changed from upload plugin relation to `type: "media"`
- Field `published_at`: handled by v5 draftAndPublish system (renamed to `publishedAt`)

## Base64 Warning
- Field `body` (richtext): flagged as Base64 candidate. Scan content before migration.

## API Changes
- Response envelope: `data.attributes` flattened in v5
- Population: relations not populated by default — add `?populate=author,categories,cover`
```

---

## 4. Post-Generation Parity Check

After generating schemas, the generator automatically runs the parity checker:

```
strapishift generate --input report.json --output ./v5-schemas/

Generating v5 schemas...
  ✅ Article (8 fields, 3 relations)
  ✅ Author (4 fields)
  ✅ Category (3 fields)
  ...

Running parity verification...
  ✅ All 12 content types present
  ✅ All 87 fields mapped
  ✅ All 23 relations intact
  ✅ All 5 components translated

Parity: 100% — schemas generated successfully
Output: ./v5-schemas/src/api/
```

If parity is not 100%, the generator reports what's missing and why (e.g., "Field `legacy_custom` has no v5 equivalent — manual mapping required").

---

## 5. Test Plan

### 5.1 Unit Tests

| Test File | What It Tests |
|-----------|--------------|
| `field-mapper.test.ts` | Every v3 field type → correct v5 field definition. All 16 direct mappings. |
| `relation-mapper.test.ts` | All 6 v3 relation patterns → correct v5 relation definitions. UID generation for targets. |
| `component-mapper.test.ts` | Component references translated. Repeatable flag preserved. |
| `dynamic-zone-mapper.test.ts` | Dynamic zone component lists translated with correct UIDs. |
| `uid-generator.test.ts` | Content type names → correct `api::name.name` UIDs. Plugin content types → `plugin::` UIDs. |
| `schema-writer.test.ts` | Generated JSON is valid. Directory structure is correct. Stubs use factory pattern. |
| `readme-generator.test.ts` | Per-content-type README contains all relevant migration notes. |

### 5.2 Integration Tests

| Test | What It Tests |
|------|--------------|
| `researchhub-generation.test.ts` | Generate v5 schemas from ResearchHub v3 fixture. Verify all content types generated. |
| `strapi-v5-boot.test.ts` | Generate schemas → copy to Docker Strapi v5 instance → `strapi develop` boots without errors. |
| `field-roundtrip.test.ts` | For every v3 field type, generate v5 → boot v5 → verify field appears correctly in admin panel. |
| `relation-roundtrip.test.ts` | Generate v5 schemas with relations → boot v5 → verify relations navigable in admin panel. |
| `post-generation-parity.test.ts` | Generate schemas → run parity checker → verify 100% parity for all test fixtures. |

### 5.3 CLI Tests

| Test | What It Tests |
|------|--------------|
| `generate-valid.test.ts` | `strapishift generate --input report.json --output ./out/` → schemas written, exit 0 |
| `generate-parity.test.ts` | Post-generation parity check runs automatically and reports result |
| `generate-invalid-report.test.ts` | Invalid report.json → exit 1, clear validation error |
| `generate-db-engine.test.ts` | `--db-engine postgres` → any Postgres-specific adjustments applied |

### 5.4 Acceptance Criteria

- [ ] All unit and integration tests pass
- [ ] Generated schemas boot a clean Strapi v5 instance with zero errors
- [ ] All content types, fields, relations, and components appear correctly in v5 admin
- [ ] Post-generation parity checker reports 100% parity for all test fixtures
- [ ] Per-content-type README files accurately describe all changes
- [ ] Generated stubs use correct v5 factory pattern

---

## 6. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
