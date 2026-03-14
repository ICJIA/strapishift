# StrapiShift

**Strapi v3 → v5 Migration Platform**

StrapiShift is an open-source migration analysis and verification platform for Strapi v3 → v5 migrations. It automates schema analysis, identifies every breaking change, and produces structured migration reports — encoding hard-won domain knowledge from real-world migrations into a rule engine that saves developers weeks of manual auditing.

---

## The Problem

Migrating from Strapi v3 to Strapi v5 is a significant undertaking with no automated tooling. Developers must manually navigate breaking changes across database engines, API response formats, relation storage, media handling, plugin ecosystems, and authentication models.

Common pain points:

- **Base64 images in rich text** — Strapi v3 commonly stored uploaded images as Base64 data URIs directly in rich text fields. This undocumented pattern silently breaks during migration.
- **MongoDB → SQL paradigm shift** — nested documents, arrays, and polymorphic references must be restructured.
- **API response changes** — the `data.attributes` envelope, populate behavior, filter syntax, and pagination format all changed between v3 and v5.
- **Relation storage format changes** — cardinality syntax, junction tables, and population behavior are completely different.
- **Plugin ecosystem gaps** — many v3 plugins have no v5 equivalent.

## The Solution

StrapiShift provides automated schema analysis and parity verification through both a web dashboard and a CLI tool.

### Core Product (v1.0)

| Capability | Description |
|-----------|-------------|
| **Schema Analysis** | Parse v3 schemas, run a 7-category rule engine, produce migration reports in 4 formats |
| **Parity Verification** | Compare v3 source against v5 target, produce an actionable fix checklist |
| **Four Output Formats** | JSON (LLM-friendly), HTML (interactive + printable), Markdown (GitHub-friendly), CSV (spreadsheet-friendly) |
| **Dual Interface** | Web dashboard (Nuxt 4) + CLI tool — same analysis engine, your preferred workflow |

### Optional Modules (post-v1.0)

| Module | Phase | Description |
|--------|-------|-------------|
| `@strapishift/scanner` | 2 | Connect to a running v3 instance, detect Base64 images, count affected records |
| `@strapishift/generator` | 3 | Generate complete v5 content type schemas from analysis |
| `@strapishift/migrator` | 4–5 | Generate and execute API-to-API migration scripts with progress tracking |

---

## Architecture

### Monorepo Structure

```
strapishift/
├── packages/
│   ├── core/         @strapishift/core      Analysis engine + rule system + parity checker
│   ├── web/          @strapishift/web       Nuxt 4.4.2 + Nuxt UI 4.5.1
│   └── cli/          @strapishift/cli       Terminal interface (citty)
├── docs/                                    13-document design suite
├── strapishift.config.ts                    Single source of truth
├── pnpm-workspace.yaml
└── package.json
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Nuxt 4.4.2 + Nuxt UI 4.5.1 |
| CLI | citty (UnJS) |
| Package Manager | pnpm |
| Language | TypeScript (strict) |
| Testing | Vitest |
| Deploy | Netlify (Phase 1) |

### Key Architectural Decisions

- **API-to-API migration** — future migration modules read from the v3 REST API and write to the v5 REST API, letting Strapi v5 handle all database internals.
- **Pure TypeScript core** — zero runtime dependencies, runs identically in browser and Node.
- **Module architecture** — core product ships standalone; phases 2-5 are optional modules that register via a clean extension API.

---

## Rule Engine

The analysis engine runs 14 rules across 7 categories against every content type:

| Category | Rules | What It Detects |
|----------|-------|----------------|
| **Database** | 3 | Field naming changes, MongoDB nested documents, ObjectId references |
| **API** | 4 | Response envelope, filter/sort/pagination syntax, populate behavior |
| **Media** | 2 | Base64 image candidates in rich text, media reference format changes |
| **Relations** | 3 | Cardinality syntax, polymorphic patterns, circular references |
| **Auth** | 1 | Users & Permissions plugin API changes |
| **Plugins** | 1 | Plugin compatibility gaps |
| **GraphQL** | 1 | Schema regeneration requirements |

### Severity Levels

| Level | Meaning |
|-------|---------|
| **info** | Informational — no action required |
| **warning** | Breaking change requiring developer action |
| **blocker** | Migration cannot proceed without resolving |

---

## Five-Phase Pipeline

### Phase 1 — Schema Analysis & Parity Verification (MVP)

Parse v3 schemas, run the rule engine, produce migration reports. Verify completed migrations against the v3 source with an exportable fix checklist.

**Working deliverable:** A user pastes a v3 schema in the web UI or runs `strapishift analyze schema.json` from the terminal and receives a complete, actionable migration report.

### Phase 2 — Live Instance Scanning (Module)

Connect to a running v3 instance, sample content records, detect Base64-encoded images in rich text fields, catalog the media library.

### Phase 3 — v5 Schema Generation (Module)

Generate complete, bootable Strapi v5 content type schemas from the analysis. Drop the output into a fresh v5 project and run `strapi develop`.

### Phase 4 — Migration Script Generation (Module)

Generate custom, human-readable API-to-API migration scripts. Dependency-ordered content type migrators, media migration, Base64 extraction, ID mapping, progress tracking, dry-run mode.

### Phase 5 — Migration Runner (Module)

Managed execution with live progress tracking, error queuing, retry capability, and automated post-migration verification.

---

## Design

- **Visual style:** nuxt.com-inspired — dark default, high contrast, clean typography
- **Color mode:** Dark mode default with light/dark toggle
- **Accessibility:** WCAG AA 2.1 compliant
- **Responsive:** Mobile-first, fully functional on all devices
- **Print:** HTML reports include `@media print` stylesheet for paper output

---

## Documentation Suite

The `/docs` directory contains 13 design documents:

| Doc | Title |
|-----|-------|
| 00 | Master Design Document |
| 01 | Phase 1: Schema Analysis & Parity Verification |
| 02 | Phase 2: Live Instance Scanning |
| 03 | Phase 3: v5 Schema Generation |
| 04 | Phase 4: Migration Script Generation |
| 05 | Phase 5: Migration Runner |
| 06 | Security |
| 07 | LLM Build Prompts |
| 08 | Differentiation |
| 09 | Monorepo & Website |
| 10 | Revision & Gap Analysis |
| 11 | Architecture Decision Records |
| 12 | Use Cases |

---

## Origin

StrapiShift encodes knowledge from the ICJIA ResearchHub Strapi v3 → v5 migration — a real-world migration that produced a 50-item checklist of breaking changes, gotchas, and undocumented issues. This project automates what was previously tribal knowledge.

## License

MIT

## Author

Chris Schweda — [ICJIA](https://github.com/ICJIA)
