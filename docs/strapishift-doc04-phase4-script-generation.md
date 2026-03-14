# STRAPISHIFT — Doc 04: Phase 4 — Migration Script Generation

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Phase 4 Overview

Phase 4 generates custom, human-readable Node.js migration scripts tailored to a specific Strapi v3 instance. The scripts use the API-to-API approach: read from the v3 REST API, transform content, write to the v5 REST API. The developer reviews the scripts, adjusts anything instance-specific, and runs them.

### Working Deliverable

A developer runs `strapishift migrate --input report.json --v3-url ... --v5-url ... --output ./migration/` and receives a complete, runnable migration script package. The package includes dependency-ordered content type migrators, media migration, Base64 extraction, ID mapping, progress tracking, and a dry-run mode.

### Package

`@strapishift/migrator` — depends on `@strapishift/core` for analysis types and transformation rules.

---

## 2. Dependency Graph

### 2.1 Problem

Content types reference each other through relations. If Article has an `author` relation to Author, Author records must exist in v5 before Article records can reference them. The migrator must determine the correct creation order.

### 2.2 Algorithm

1. Build a directed graph: for each content type, edges point to its relation targets.
2. Topological sort: produces an ordered list where dependencies come before dependents.
3. Circular reference handling: if A → B → A, break the cycle by:
   - Create all A records without the relation to B
   - Create all B records with the relation to A
   - Update A records to populate the relation to B (second pass)

### 2.3 Output

The generated scripts are numbered by execution order:

```
content-types/
├── 01-category.ts       (no dependencies)
├── 02-author.ts         (no dependencies)
├── 03-tag.ts            (no dependencies)
├── 04-article.ts        (depends on category, author, tag)
├── 05-page.ts           (depends on article)
└── 99-circular-fixup.ts (second-pass relation updates for circular refs)
```

---

## 3. Content Transformer

### 3.1 Per-Record Transformation

Each content type migrator includes a `transform` function that converts a v3 API response record into a v5 API request payload.

```typescript
function transformArticle(v3Record: any, idMap: IdMap): V5Payload {
  return {
    data: {
      title: v3Record.title,
      body: v3Record.body,                              // may need Base64 extraction
      slug: v3Record.slug,
      author: idMap.resolve('author', v3Record.author),  // v3 ID → v5 ID
      categories: v3Record.categories.map(
        c => idMap.resolve('category', c.id || c._id || c)
      ),
      // published_at handled by v5 draftAndPublish
    }
  };
}
```

### 3.2 ID Resolution

The ID mapper maintains a persistent JSON file mapping v3 IDs to v5 IDs:

```json
{
  "author": { "5f8a...": 1, "5f8b...": 2 },
  "category": { "5f8c...": 1, "5f8d...": 2, "5f8e...": 3 },
  "article": { "5f8f...": 1, "5f90...": 2 }
}
```

For MongoDB-backed v3 instances, v3 IDs are ObjectId strings. For SQL-backed v3 instances, v3 IDs are integers. The mapper handles both.

### 3.3 Relation Handling

| Relation Type | v3 API Response | v5 API Payload |
|--------------|----------------|----------------|
| manyToOne | `{ "author": { "_id": "abc" } }` or `{ "author": "abc" }` | `{ "author": 42 }` (v5 ID from mapping) |
| oneToMany | Populated array of objects | Array of v5 IDs |
| manyToMany | Populated array of objects | Array of v5 IDs |
| media (single) | `{ "cover": { "url": "/uploads/img.jpg" } }` | `{ "cover": 17 }` (v5 media ID from media migration) |
| media (multiple) | Array of media objects | Array of v5 media IDs |

---

## 4. Media Migration

### 4.1 Strategy

1. Download each media file from the v3 instance (using the URL from the media library entry)
2. Upload to the v5 instance via `POST /api/upload`
3. Record the v3 media ID → v5 media ID mapping
4. Content type migrators use this mapping to set media relations

### 4.2 Download

```
GET {v3Url}{file.url}
→ Save to temp directory with original filename
```

For files stored on external providers (S3, Cloudinary), the scanner (Phase 2) will have identified the provider. The media migrator downloads from the provider URL directly.

### 4.3 Upload

```
POST {v5Url}/api/upload
Content-Type: multipart/form-data

files: <binary file data>
fileInfo: { "name": "original-name.jpg", "alternativeText": "...", "caption": "..." }
```

### 4.4 Batch Processing

Media files are processed in configurable batches (default: 10 concurrent uploads) to avoid overwhelming either instance.

---

## 5. Base64 Extraction

### 5.1 Strategy

For each record where Phase 2 detected Base64 images in rich text fields:

1. Parse the rich text HTML content
2. Find all `<img src="data:image/...">` tags
3. Decode the Base64 data to binary
4. Upload each image to v5 media library via `POST /api/upload`
5. Replace the `<img>` tag's `src` with the v5 media URL
6. Return the cleaned content for the v5 record

### 5.2 Implementation

```typescript
async function extractBase64Images(
  htmlContent: string,
  v5Url: string,
  v5Token: string
): Promise<{ cleanedContent: string; uploadedMedia: MediaMapping[] }> {
  const images = findBase64Images(htmlContent);
  const uploadedMedia: MediaMapping[] = [];
  let cleanedContent = htmlContent;

  for (const image of images) {
    const buffer = Buffer.from(image.base64Data, 'base64');
    const filename = `extracted-${Date.now()}-${uploadedMedia.length}.${image.extension}`;
    const uploaded = await uploadToV5(v5Url, v5Token, buffer, filename, image.mimeType);
    cleanedContent = cleanedContent.replace(image.fullMatch, `<img src="${uploaded.url}" />`);
    uploadedMedia.push({ originalBase64Length: image.base64Data.length, v5MediaId: uploaded.id, v5Url: uploaded.url });
  }

  return { cleanedContent, uploadedMedia };
}
```

---

## 6. Generated Script Package

### 6.1 Structure

```
migration/
├── package.json                    dependencies: node-fetch, form-data, commander
├── tsconfig.json
├── migrate.ts                      main orchestrator
├── config.ts                       source/target URLs, tokens, options
├── content-types/
│   ├── 01-category.ts
│   ├── 02-author.ts
│   ├── 03-article.ts
│   └── 99-circular-fixup.ts
├── media/
│   ├── media-migrator.ts           download from v3, upload to v5
│   └── base64-extractor.ts         extract Base64, upload, replace
├── utils/
│   ├── id-map.ts                   v3 ID → v5 ID persistence
│   ├── progress.ts                 resume tracking (JSON file)
│   ├── api-client.ts               v3/v5 API wrappers with error handling
│   └── logger.ts                   structured logging
├── dry-run.ts                      validate without writing
├── verify.ts                       post-migration parity check
└── README.md                       execution instructions
```

### 6.2 Configuration

```typescript
// config.ts (generated — NEVER hardcode tokens)
// Tokens MUST be provided via environment variables.
export const config = {
  v3: {
    url: process.env.STRAPISHIFT_V3_URL || 'http://localhost:1337',
    token: process.env.STRAPISHIFT_V3_TOKEN || '',
  },
  v5: {
    url: process.env.STRAPISHIFT_V5_URL || 'http://localhost:1338',
    token: process.env.STRAPISHIFT_V5_TOKEN || '',
  },
  options: {
    batchSize: 50,
    concurrency: 3,
    dryRun: false,
    preserveTimestamps: false,  // opt-in only — requires DB credentials
    resumeFromCheckpoint: false,
    mediaDownloadDir: './migration-temp/media',
  }
};

// Validate tokens are present before running
if (!config.v3.token || !config.v5.token) {
  console.error('ERROR: Set STRAPISHIFT_V3_TOKEN and STRAPISHIFT_V5_TOKEN environment variables.');
  process.exit(1);
}
```

**Security:** Generated `config.ts` files never contain token values. Tokens are loaded exclusively from environment variables. The generated README instructs developers to set `STRAPISHIFT_V3_TOKEN` and `STRAPISHIFT_V5_TOKEN` before running.

### 6.3 Orchestrator

```typescript
// migrate.ts (generated)
import { config } from './config';
import { migrateMedia } from './media/media-migrator';
import { migrateCategories } from './content-types/01-category';
import { migrateAuthors } from './content-types/02-author';
import { migrateArticles } from './content-types/03-article';
import { fixCircularRefs } from './content-types/99-circular-fixup';
import { runVerification } from './verify';

async function main() {
  console.log('StrapiShift Migration — Starting');

  // Step 1: Migrate media library
  await migrateMedia(config);

  // Step 2: Migrate content types (dependency order)
  await migrateCategories(config);
  await migrateAuthors(config);
  await migrateArticles(config);

  // Step 3: Fix circular references
  await fixCircularRefs(config);

  // Step 4: Verify
  await runVerification(config);

  console.log('Migration complete.');
}
```

### 6.4 Progress and Resume

The progress tracker writes a checkpoint file after each batch:

```json
{
  "status": "in-progress",
  "startedAt": "2026-03-14T12:00:00Z",
  "contentTypes": {
    "category": { "status": "complete", "total": 28, "migrated": 28, "failed": 0 },
    "author": { "status": "complete", "total": 45, "migrated": 45, "failed": 0 },
    "article": { "status": "in-progress", "total": 2100, "migrated": 850, "failed": 3, "lastProcessedId": "5f8f..." }
  },
  "media": { "status": "complete", "total": 4521, "migrated": 4521, "failed": 0 },
  "failedRecords": [
    { "contentType": "article", "v3Id": "5f91...", "error": "Validation error: title is required", "timestamp": "..." }
  ]
}
```

If `--resume` is passed, the orchestrator reads the checkpoint and skips completed content types, resuming from `lastProcessedId`.

### 6.5 Timestamp Preservation (Opt-In)

**Default: disabled.** This is opt-in only because it requires direct database access, which violates the API-to-API principle.

If `preserveTimestamps` is enabled, after all records are created via the v5 API, the migrator generates a separate post-migration SQL script that sets `created_at` and `updated_at` to the original v3 values:

```sql
-- For SQLite/Postgres v5 targets (v5 uses snake_case in the database)
UPDATE articles SET created_at = ?, updated_at = ? WHERE id = ?;
```

**Note:** Strapi v3 on MongoDB stores timestamps as `createdAt`/`updatedAt` (camelCase). Strapi v5 on SQLite/Postgres stores them as `created_at`/`updated_at` (snake_case). The generated script handles this mapping.

**Security:** Database credentials for timestamp preservation are loaded exclusively from the `STRAPISHIFT_V5_DB_URL` environment variable, never written to config files. The generated timestamp script is a standalone file (`timestamp-patch.sql`) that the developer reviews and runs manually — it is not executed automatically by the migration runner.

This is the one exception to the API-to-API principle, and it is clearly separated from the main migration flow.

---

## 7. Test Plan

### 7.1 Unit Tests

| Test File | What It Tests |
|-----------|--------------|
| `dependency-graph.test.ts` | Topological sort produces correct order. Circular refs detected and handled. |
| `content-transformer.test.ts` | Each field type transforms correctly. Relation IDs resolved via mapper. |
| `id-mapper.test.ts` | Store/retrieve v3→v5 mappings. Persist to JSON. Handle ObjectId and integer IDs. |
| `media-migrator.test.ts` | Download/upload sequence correct. Batch processing respects limits. |
| `base64-extractor.test.ts` | HTML parsing finds all Base64 images. Replacement produces valid HTML. |
| `progress-tracker.test.ts` | Checkpoint written after each batch. Resume reads correct state. |
| `dry-run.test.ts` | All transforms execute. No writes to v5 API. Report generated. |

### 7.2 Integration Tests

| Test | What It Tests |
|------|--------------|
| `full-migration.test.ts` | Generate scripts from ResearchHub fixture → execute against Docker v3/v5 → verify all records migrated. |
| `media-migration.test.ts` | All media files downloaded from v3, uploaded to v5, mappings correct. |
| `base64-extraction.test.ts` | Base64 images in test data extracted, uploaded, replaced with URLs. |
| `relation-integrity.test.ts` | All relations intact after migration (author on article points to correct v5 author). |
| `resume-after-interrupt.test.ts` | Simulate crash mid-migration → resume → verify no duplicates, all records migrated. |
| `dry-run-integration.test.ts` | Dry run completes → v5 instance unchanged → report shows what would be migrated. |

### 7.3 Acceptance Criteria

- [ ] All tests pass
- [ ] Generated scripts successfully migrate all content from test v3 to v5 via API-to-API
- [ ] All records, relations, and media intact after migration
- [ ] Base64 images extracted and properly referenced in v5
- [ ] ID mapping file complete and accurate
- [ ] Resume after interruption works without duplicates
- [ ] Dry-run mode validates without writing
- [ ] Post-migration parity check reports 100% data parity

---

## 8. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
