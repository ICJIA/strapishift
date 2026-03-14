# STRAPISHIFT — Doc 09: Monorepo & Website

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Monorepo Configuration

### 1.1 Workspace Setup

### Root Files

```
# .nvmrc
20.11.0
```

```
# .gitignore
node_modules/
dist/
.nuxt/
.output/
.tmp/
*.local
.env
.env.*
coverage/
migration-temp/
*.tgz
.DS_Store
```

```
# LICENSE — MIT
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// package.json (root)
{
  "name": "strapishift",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm --filter @strapishift/web dev",
    "dev:cli": "pnpm --filter @strapishift/cli dev",
    "build": "pnpm -r build",
    "build:core": "pnpm --filter @strapishift/core build",
    "build:web": "pnpm --filter @strapishift/web build",
    "build:cli": "pnpm --filter @strapishift/cli build",
    "test": "pnpm -r test",
    "test:core": "pnpm --filter @strapishift/core test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r clean"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```
// .npmrc
shamefully-hoist=true
strict-peer-dependencies=false
```

### 1.2 Package Configuration

Each package follows the same structure:

```json
// packages/core/package.json
{
  "name": "@strapishift/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" }
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --dts --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

### 1.3 Cross-Package Dependencies

```json
// packages/cli/package.json (excerpt)
{
  "dependencies": {
    "@strapishift/core": "workspace:*",
    "citty": "^0.1.0",
    "chalk": "^5.0.0"
  }
}
```

The `workspace:*` protocol ensures packages reference each other within the monorepo.

### 1.4 Project Configuration — Single Source of Truth

See Doc 00, Section 3.6 for the `strapishift.config.ts` specification. This file lives in the project root and is the single source of truth for all shared configuration values (source/target versions, report defaults, rule toggles, module configuration).

### 1.5 Vitest Workspace

```typescript
// vitest.workspace.ts (root)
export default [
  'packages/core',
  'packages/cli',
  'packages/web',
  'packages/scanner',
  'packages/generator',
  'packages/migrator',
];
```

### 1.6 TypeScript Configuration

```json
// tsconfig.json (root — shared base)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

Each package extends this with its own `tsconfig.json`.

---

## 2. CI/CD

### 2.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

### 2.2 Release Strategy

- `main` branch: stable releases
- `dev` branch: development
- Semantic versioning across all packages (synchronized)
- Changesets for managing version bumps

---

## 3. Website

### 3.1 Design Direction

The web app follows the visual style of **nuxt.com** — dark default, high-contrast, clean typography, generous whitespace, subtle gradients and borders. The site serves dual duty: it is both the functional tool and the marketing/documentation site.

**Design system:**
- Dark mode default via Nuxt UI `colorMode`, with light/dark toggle in the header
- High-contrast text on dark backgrounds (matching nuxt.com aesthetic)
- WCAG AA 2.1 compliant — all contrast ratios meet AA thresholds in both modes
- Responsive: mobile-first, fully functional on mobile/tablet/desktop
- Nuxt UI 4.5.1 components throughout
- Tailwind CSS for custom styling consistent with Nuxt UI's design tokens
- Print stylesheet on all exported HTML reports (light mode for paper)

### 3.2 Page Structure

| Route | Purpose | Phase |
|-------|---------|-------|
| `/` | Landing page — hero, value props, quick-start schema input | 1 |
| `/features` | Feature showcase — detailed capabilities per phase | 1 |
| `/docs` | Documentation — usage guides, CLI reference, API reference, examples | 1 |
| `/docs/[slug]` | Individual doc pages (Nuxt Content or MDC-based) | 1 |
| `/analyze` | Schema analysis tool — paste/upload, analyze, view report | 1 |
| `/report` | Interactive migration report dashboard | 1 |
| `/verify` | Parity verification tool — compare v3 vs v5 | 1 |
| `/about` | About the project, author, license | 1 |
| `/scan` | Live scanner (module placeholder or active if installed) | 2 |
| `/generate` | Schema generator (module placeholder or active if installed) | 3 |
| `/migrate` | Migration config (module placeholder or active if installed) | 4 |
| `/dashboard` | Migration runner dashboard (module placeholder or active if installed) | 5 |

### 3.3 Landing Page (`/`)

Follows the nuxt.com pattern: hero → value props → how it works → CTA.

**Hero section:**
- Headline: "Migrate Strapi v3 → v5 with confidence"
- Subhead: "Automated schema analysis, parity verification, and migration script generation"
- Primary CTA: "Analyze Your Schema" (links to `/analyze`)
- Secondary CTA: "Read the Docs" (links to `/docs`)
- Background: subtle gradient or grid pattern (nuxt.com style)

**Value props (card grid, below fold):**
- "Detect Base64 images before they break your migration"
- "Verify your v5 instance matches v3 — field by field"
- "Export reports in four formats: JSON, HTML, Markdown, CSV"
- "CLI + web — your preferred workflow"

**How it works (3 steps, visual):**
1. Paste your v3 schema or upload your `api/` directory
2. Review the interactive migration report
3. Export your action plan and start migrating

**Social proof / credibility:**
- "Built from real-world migration experience at ICJIA"
- "Open source — MIT license"
- GitHub stars badge, npm downloads badge

**Footer:** GitHub link, npm link, license (MIT), built by Chris at ICJIA

### 3.4 Features Page (`/features`)

Dedicated page showcasing capabilities, organized by phase:

**Phase 1 (available now):**
- Schema analysis with 7 rule categories
- Parity verification with exportable fix checklist
- Four output formats (JSON, HTML, Markdown, CSV)
- LLM-friendly JSON reports
- CLI and web interfaces

**Future modules (coming soon):**
- Live instance scanning with Base64 detection
- Automated v5 schema generation
- API-to-API migration script generation
- Managed migration runner with progress dashboard

Each feature card includes: icon, title, description, and a link to the relevant docs page.

### 3.5 Documentation Pages (`/docs`)

Built with Nuxt Content (MDC) or equivalent. Documentation is authored in Markdown and rendered as pages.

**Doc sections:**
- Getting Started (install, first analysis, first parity check)
- CLI Reference (all commands, flags, exit codes, examples)
- Web UI Guide (page-by-page walkthrough)
- Rule Reference (all rule categories, specific rules, examples)
- Report Formats (JSON schema, HTML layout, Markdown structure, CSV columns)
- Configuration (`strapishift.config.ts` reference)
- Module Development (how to build a StrapiShift module)
- FAQ

### 3.6 SEO

Key terms to target:
- "strapi v3 to v5 migration"
- "strapi migration tool"
- "strapi v3 v5 breaking changes"
- "strapi schema migration"

Meta tags, Open Graph images, and structured data on all pages.

### 3.7 Domain

Primary: `strapishift.com`
Fallback: `strapishift.dev`

---

## 4. Docker Test Fixtures

### 4.1 Purpose

Phase 2+ integration tests require running Strapi v3 and v5 instances with known test data.

### 4.2 Docker Compose

```yaml
# docker/docker-compose.test.yml
version: '3.8'
services:
  strapi-v3:
    image: strapi/strapi:3.6.8
    environment:
      DATABASE_CLIENT: mongo
      DATABASE_HOST: mongo
      DATABASE_NAME: strapi-test
    ports: ["1337:1337"]
    depends_on: [mongo]

  mongo:
    image: mongo:4.4
    ports: ["27017:27017"]

  strapi-v5:
    image: node:20
    working_dir: /app
    command: ["npm", "run", "develop"]
    environment:
      DATABASE_CLIENT: sqlite
      DATABASE_FILENAME: .tmp/data.db
    ports: ["1338:1337"]

  seed:
    build: ./seed
    depends_on: [strapi-v3]
    # Seeds test data: articles with Base64 images, various relation types, media
```

### 4.3 Test Data

The seed script creates:
- 10 content types with various field types
- 100+ records per content type
- Intentional Base64 images in rich text fields
- Complex relations (including circular)
- Media library entries with multiple providers
- Component and dynamic zone usage

---

## 5. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
| 2026-03-14 | 1.1.0 | Added root files (.gitignore, .nvmrc, LICENSE, strapishift.config.ts); redesigned website section with nuxt.com-style design direction; added /features, /docs pages; WCAG AA 2.1 and responsive requirements; dark mode default with light/dark toggle | Chris |
