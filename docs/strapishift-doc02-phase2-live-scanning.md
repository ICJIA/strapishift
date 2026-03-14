# STRAPISHIFT — Doc 02: Phase 2 — Live Instance Scanning & Base64 Detection

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Phase 2 Overview

Phase 2 extends StrapiShift from schema-level analysis to data-level analysis. It connects to a running Strapi v3 instance, pulls schemas programmatically, samples content records, and detects data-level migration issues that cannot be found by examining schemas alone — most critically, Base64-encoded images embedded in rich text fields.

### Working Deliverable

A developer provides their v3 API URL and token. StrapiShift connects to the live instance, pulls all content type schemas, samples records from each content type, and produces an enhanced migration report that includes:

- Exact record counts per content type
- Base64 image detection results: which content types, which fields, how many records affected
- Media library inventory with orphan detection
- Data volume estimates for migration planning

### Package

`@strapishift/scanner` — depends on `@strapishift/core` for schema normalization and reporting.

### Deploy

DigitalOcean / Laravel Forge. The scanner requires a backend (Nitro server route or Express) because it makes authenticated API calls to the v3 instance, which cannot be done client-side due to CORS.

---

## 2. Scanner Architecture

### 2.1 Connection Manager

Handles authenticated communication with the Strapi v3 REST API.

```typescript
interface ScannerConfig {
  v3Url: string;                    // e.g., "http://localhost:1337"
  v3Token: string;                  // API token or JWT
  sampleSize: number;               // records to sample per content type (default: 100)
  contentTypes?: string[];          // specific types to scan (default: all)
  timeout: number;                  // request timeout in ms (default: 30000)
  concurrency: number;              // parallel requests (default: 3)
}
```

**Authentication:** The scanner supports both Strapi v3 API tokens and JWT authentication. It validates the connection and permissions before beginning the scan by hitting `GET /` and checking for a valid response.

**Rate limiting:** The scanner throttles requests to avoid overloading the v3 instance. Default: 3 concurrent requests with 100ms delay between batches.

### 2.2 Schema Puller

Retrieves content type definitions from the live v3 instance via the Content Type Builder API.

**Endpoints used:**

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `GET /content-type-builder/content-types` | All content type schemas | Admin API — requires admin JWT, not API token |
| `GET /content-type-builder/components` | All component schemas | Admin API — requires admin JWT, not API token |
| `GET /content-manager/content-types` | Content type metadata (counts, configuration) | Admin API |

**Important:** These are Strapi admin panel API routes, not public REST API routes. They require admin authentication (JWT from `/admin/login`), not a standard API token. The scanner must authenticate as an admin user to access these endpoints. This distinction must be clearly communicated to the user — they need admin credentials, not just an API token.

**Validation needed before implementation:** These endpoint paths must be verified against a running Strapi v3 instance. The exact paths and response formats may vary by v3 minor version (3.0.x through 3.6.x).

The pulled schemas are fed into the same `@strapishift/core` parser as file-based schemas, producing identical `ParsedSchema` output.

### 2.3 Content Sampler

Retrieves actual content records for data-level analysis.

**Pagination strategy:** Strapi v3 uses `_start` and `_limit` parameters for both MongoDB-backed and SQL-backed instances. The sampler fetches in pages of 100 records (configurable), up to the configured sample size.

```
GET /articles?_start=0&_limit=100&_sort=id:ASC
GET /articles?_start=100&_limit=100&_sort=id:ASC
...
```

**Note:** While `_start`/`_limit` work universally in Strapi v3's REST API, the sort field for MongoDB instances uses `_id` while SQL instances use `id`. The sampler tries `id` first and falls back to `_id` if the response indicates the field doesn't exist.

**Record count:** Before sampling, the sampler hits `GET /articles/count` to get the total record count for each content type.

---

## 3. Base64 Image Scanner

### 3.1 The Problem

Strapi v3 commonly stored uploaded images as Base64 data URIs directly in rich text (CKEditor/TinyMCE) fields. Instead of uploading to the media library and inserting a reference, the editor embedded the full `data:image/png;base64,...` string in the HTML content.

This is a critical migration issue because:

- Base64 images inflate database size (a single image can be 1MB+ of Base64 text)
- They cannot be managed through Strapi v5's media library
- They break responsive image handling
- They do not benefit from CDN delivery
- Some SQL databases have size limits on text fields that Base64 strings may exceed

### 3.2 Detection Logic

For each content type with `richtext` fields, the scanner samples records and searches the field content for Base64 patterns:

```typescript
const BASE64_PATTERN = /data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]{100,}/g;

function detectBase64(content: string): Base64Finding[] {
  const matches = content.matchAll(BASE64_PATTERN);
  return Array.from(matches).map(match => ({
    mimeType: match[1],
    estimatedSize: Math.ceil(match[0].length * 0.75),  // Base64 → bytes
    position: match.index,
  }));
}
```

**Minimum match length:** The regex requires at least 100 Base64 characters to avoid false positives from small data URIs used for icons or placeholders.

### 3.3 Scan Results

```typescript
interface Base64ScanResult {
  contentType: string;
  field: string;
  totalRecords: number;
  sampledRecords: number;
  affectedRecords: number;
  affectedPercentage: number;
  estimatedTotalAffected: number;  // extrapolated from sample
  totalImagesFound: number;
  estimatedTotalSize: number;      // bytes
  mimeTypeDistribution: Record<string, number>;
  sampleIds: string[];             // IDs of affected records (for manual review)
}
```

### 3.4 Extrapolation

If the sample size is smaller than the total record count, the scanner extrapolates:

```
Sampled: 100 of 2,100 Article records
Affected in sample: 43 (43%)
Estimated total affected: ~903 records
Estimated total Base64 image data: ~1.2 GB
```

The report clearly marks extrapolated values as estimates.

---

## 4. Media Library Inventory

### 4.1 Purpose

Catalog all media library entries in the v3 instance and identify potential issues.

### 4.2 Data Collected

| Data Point | Source | Purpose |
|-----------|--------|---------|
| Total media entries | `GET /upload/files/count` | Migration volume estimation |
| File format distribution | `GET /upload/files` (paginated) | Identify unsupported formats |
| Orphaned media | Cross-reference media IDs against content type relation fields | Cleanup before migration |
| Total storage size | Sum of file sizes from media entries | Estimate migration time/bandwidth |
| Provider distribution | File metadata | Identify files stored on different providers (local, S3, Cloudinary) |

### 4.3 Orphan Detection

A media entry is "orphaned" if no content type record references it. The scanner cross-references media IDs against all media relation fields in all content types.

This is an approximation — it only checks structured media relations, not Base64-embedded images (which reference no media library entry) or dynamic references in JSON fields.

---

## 5. Enhanced Report

Phase 2 produces an enhanced version of the Phase 1 migration report. The enhancements are additive — all Phase 1 findings are preserved, and data-level findings are appended.

### 5.1 Additional JSON Fields

```json
{
  "scanMetadata": {
    "v3Url": "http://localhost:1337",
    "scanDate": "2026-03-14T12:00:00Z",
    "sampleSize": 100,
    "scanDuration": "2m 34s"
  },
  "dataFindings": {
    "base64Scan": [
      {
        "contentType": "Article",
        "field": "body",
        "totalRecords": 2100,
        "affectedRecords": 903,
        "affectedPercentage": 43,
        "estimatedTotalSize": 1288490188,
        "severity": "blocker"
      }
    ],
    "mediaInventory": {
      "totalEntries": 4521,
      "totalSize": 2147483648,
      "orphanedEntries": 234,
      "formatDistribution": { "image/jpeg": 2100, "image/png": 1800, "application/pdf": 621 }
    },
    "recordCounts": {
      "Article": 2100,
      "Author": 45,
      "Category": 28
    }
  }
}
```

### 5.2 HTML Report Enhancements

- Data volume section: record counts per content type, total media size
- Base64 scanner results: highlighted per content type with affected record counts
- Media inventory summary with orphan count
- Effort re-estimation based on actual data volumes

---

## 6. Test Plan

### 6.1 Test Infrastructure

- **Mock v3 API:** Vitest mock server simulating Strapi v3 REST API endpoints with configurable responses
- **Docker fixture:** `docker-compose.scanner-test.yml` with a real Strapi v3 instance loaded with known test data (for integration tests)
- **Test data:** Fixtures include content records with Base64 images, various media types, orphaned media, and edge cases

### 6.2 Unit Tests

| Test File | What It Tests |
|-----------|--------------|
| `connection-manager.test.ts` | Auth validation, timeout handling, retry logic |
| `schema-puller.test.ts` | Content Type Builder endpoint parsing, component extraction |
| `content-sampler.test.ts` | Pagination logic, sample size limits, count accuracy |
| `base64-detector.test.ts` | Pattern matching: real Base64 images detected; URLs not flagged; small data URIs below threshold ignored; all MIME types recognized |
| `media-inventory.test.ts` | Count accuracy, format distribution, orphan detection logic |
| `extrapolation.test.ts` | Estimate accuracy at various sample sizes, edge cases (0 affected, 100% affected) |

### 6.3 Integration Tests

| Test | What It Tests |
|------|--------------|
| `full-scan.test.ts` | End-to-end scan against Docker Strapi v3 with known data. Verify Base64 images detected, record counts correct, media inventory accurate. |
| `auth-failures.test.ts` | Invalid token → clear error; expired JWT → clear error; no auth → clear error |
| `connection-errors.test.ts` | Unreachable URL → timeout with clear message; DNS failure → clear message |
| `large-instance.test.ts` | Scan with 10,000+ records per content type. Verify sample size respected, memory stable, no timeouts. |
| `partial-scan.test.ts` | `--content-types Article,Author` → only those types scanned, others skipped |

### 6.4 CLI Tests

| Test | What It Tests |
|------|--------------|
| `scan-valid.test.ts` | `strapishift scan --url ... --token ...` → enhanced report produced, exit 0 |
| `scan-blockers.test.ts` | Base64 images found → exit 2 |
| `scan-auth-error.test.ts` | Invalid token → exit 1, clear auth error message |
| `scan-unreachable.test.ts` | Bad URL → exit 1, clear connection error message |
| `scan-formats.test.ts` | `--format json` → only JSON; `--format html,csv` → only those formats |

### 6.5 Acceptance Criteria

- [ ] All unit and integration tests pass
- [ ] Scanner connects to a real Strapi v3 instance and produces an enhanced report
- [ ] Base64 images in rich text fields are correctly detected and counted
- [ ] Media library inventory is accurate (within 1% of manual count)
- [ ] Scan of a 10,000-record instance completes in under 5 minutes with default sample size
- [ ] Connection errors, auth failures, and timeouts produce clear, actionable error messages
- [ ] Enhanced report preserves all Phase 1 analysis findings
- [ ] All four output formats include Phase 2 enhancements

---

## 7. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
