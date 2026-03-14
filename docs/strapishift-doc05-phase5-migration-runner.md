# STRAPISHIFT — Doc 05: Phase 5 — Migration Runner & Verification Dashboard

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Phase 5 Overview

Phase 5 wraps the Phase 4 migration scripts in a managed execution environment with live progress tracking, error handling, retry capability, and automated post-migration verification. This phase is optional — a developer comfortable with scripts can run Phase 4 output directly.

### Working Deliverable

A developer launches `strapishift run ./migration/ --verify` from the CLI or starts a migration from the web dashboard. StrapiShift executes the migration with real-time progress display, captures errors in a retryable queue, and runs the parity checker automatically when complete.

### Package

`@strapishift/migrator` (extended) + `@strapishift/web` (dashboard additions)

### Deploy

DigitalOcean / Laravel Forge (the web dashboard needs WebSocket support for real-time progress).

---

## 2. Execution Engine

### 2.1 Orchestration

The runner reads the generated migration package and executes each step in order:

1. Pre-flight checks: verify v3 and v5 instances are reachable and authenticated
2. Media migration (if not already complete per checkpoint)
3. Content type migration in dependency order
4. Circular reference fixup pass
5. Timestamp preservation pass (if enabled)
6. Post-migration verification

### 2.2 Batch Processing

Records are processed in configurable batches:

- **Batch size:** 50 records per batch (default, configurable)
- **Concurrency:** 3 parallel API calls within a batch (default, configurable)
- **Checkpoint:** Progress saved to disk after each batch completes
- **Backpressure:** If v5 API responds with 429 (rate limited), pause and retry with exponential backoff

### 2.3 Error Handling

Failed records are captured in an error queue rather than stopping the migration:

```typescript
interface FailedRecord {
  contentType: string;
  v3Id: string;
  v3Data: Record<string, any>;   // original v3 record for retry
  error: string;
  errorCode?: number;
  timestamp: string;
  retryCount: number;
  retryable: boolean;            // false for validation errors, true for timeouts/network
}
```

**Retry policy:**

| Error Type | Retryable | Strategy |
|-----------|-----------|----------|
| Network timeout | Yes | Exponential backoff, max 3 retries |
| 429 Rate limit | Yes | Wait for `Retry-After` header, then retry |
| 500 Server error | Yes | Wait 5s, retry once |
| 400 Validation error | No | Log to error queue for manual review |
| 404 Not found (relation target) | No | Log — likely a dependency ordering issue |

---

## 3. Progress Tracking

### 3.1 CLI Progress Display

```
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
```

### 3.2 Web Dashboard

The web dashboard (`/dashboard` page) provides:

- **Real-time progress** via WebSocket connection to the runner backend
- **Content type cards** with progress bars, record counts, timing
- **Error panel** with expandable error details and individual retry buttons
- **Live log** stream of migration events
- **Controls:** pause, resume, abort (with confirmation)

### 3.3 WebSocket Protocol

```typescript
// Server → Client events
{ type: 'progress', contentType: 'article', migrated: 851, total: 2100, failed: 3 }
{ type: 'error', contentType: 'article', v3Id: '5f91...', error: 'Validation error' }
{ type: 'phase-complete', phase: 'media', duration: 134000 }
{ type: 'migration-complete', summary: { total: 7362, migrated: 7359, failed: 3 } }
{ type: 'verification-start' }
{ type: 'verification-complete', parityScore: '99.96%' }

// Client → Server events
{ type: 'pause' }
{ type: 'resume' }
{ type: 'retry', contentType: 'article', v3Id: '5f91...' }
{ type: 'abort' }
```

---

## 4. Verification Suite

### 4.1 Automated Post-Migration Checks

After migration completes, the runner executes the full verification suite:

**Record count comparison:**

```
Content Type    v3 Count    v5 Count    Status
Article         2,100       2,097       ⚠️ 3 missing (see error queue)
Author          45          45          ✅ match
Category        28          28          ✅ match
```

**Field completeness:** Sample v5 records and verify non-null fields that were non-null in v3.

**Relation integrity:** For each relation, verify the target record exists in v5.

**Media availability:** Verify all media files are accessible via their v5 URLs.

**Base64 cleanup:** Verify no rich text fields in v5 still contain `data:image/` strings.

### 4.2 Verification Report

The verification report is produced in all four formats and uses the same parity report structure defined in Doc 01, extended with data-level checks:

```json
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
```

---

## 5. Test Plan

### 5.1 Unit Tests

| Test File | What It Tests |
|-----------|--------------|
| `batch-processor.test.ts` | Batch size respected. Concurrency limits enforced. Backpressure on 429. |
| `error-queue.test.ts` | Failed records captured with full context. Retry counts tracked. |
| `retry-policy.test.ts` | Correct strategy per error type. Exponential backoff timing. Max retries enforced. |
| `progress-tracker.test.ts` | State updates correct. Checkpoint persistence. Resume from checkpoint. |
| `verification-suite.test.ts` | Record count comparison. Field completeness. Relation integrity. Media check. |

### 5.2 Integration Tests

| Test | What It Tests |
|------|--------------|
| `full-run.test.ts` | Complete migration of test instance. All records migrated. Verification passes. |
| `resume-run.test.ts` | Interrupt mid-migration → resume → no duplicates, all records migrated. |
| `error-retry.test.ts` | Inject failures → errors captured → retry succeeds → records migrated. |
| `verification-discrepancy.test.ts` | Inject known discrepancies → verification correctly identifies all of them. |
| `websocket-progress.test.ts` | Web dashboard receives real-time events during migration. |

### 5.3 Acceptance Criteria

- [ ] All tests pass
- [ ] Complete v3 instance migrated to v5 with live progress tracking
- [ ] Error handling captures failures without stopping migration
- [ ] Retry mechanism recovers from transient errors
- [ ] Resume after interruption works correctly
- [ ] Post-migration verification confirms data integrity
- [ ] Web dashboard displays real-time progress via WebSocket
- [ ] Verification report produced in all four formats

---

## 6. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
