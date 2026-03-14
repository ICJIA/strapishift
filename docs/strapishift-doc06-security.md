# STRAPISHIFT — Doc 06: Security

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Overview

StrapiShift handles sensitive data: API tokens, database connection strings, and content from production Strapi instances. This document defines security requirements across all phases.

---

## 2. API Token Handling

### 2.1 Principles

- Tokens are never logged, stored in reports, or transmitted to third parties.
- Tokens are held in memory only for the duration of the operation.
- CLI tokens are accepted via `--token` flag or environment variable (`STRAPISHIFT_V3_TOKEN`, `STRAPISHIFT_V5_TOKEN`). Environment variables are preferred.
- Web UI tokens are entered in the browser and sent to the StrapiShift backend only when a server-side operation is needed (Phase 2+ scanning). For Phase 1 (client-side only), tokens never leave the browser.

### 2.2 Storage

- Tokens are never written to disk (no config files, no checkpoint files, no reports).
- The generated migration scripts (Phase 4) include a `config.ts` with placeholder values and a comment instructing the developer to use environment variables.
- The progress checkpoint file (Phase 4/5) never includes tokens.

### 2.3 Backend Proxying (Phase 2+)

When the web UI needs to connect to a v3/v5 instance:

- The browser sends the token to the StrapiShift backend via HTTPS.
- The backend uses the token to make API calls to the Strapi instance.
- The token is not persisted, cached, or logged on the backend.
- The backend does not store the token between requests — the browser re-sends it with each operation.

---

## 3. Input Validation

### 3.1 Schema Input (Phase 1)

- JSON input is parsed with `JSON.parse()` in a try/catch. Malformed JSON produces a clear error, never a crash.
- Parsed schemas are validated against expected Strapi v3 structure before processing. Unknown fields are ignored, not executed.
- File uploads (`.json`, `.zip`) are size-limited: 50MB for JSON, 200MB for zip archives.
- Zip files are extracted to a temporary directory with path traversal protection: reject entries containing `../`, absolute paths (`/`-prefixed), backslash paths, and Unicode normalization attacks. Use a robust extraction library (e.g., `archiver` or `yauzl`) rather than string matching alone. All extracted paths are resolved and verified to be within the target temp directory before writing.

### 3.2 API URL Input (Phase 2+)

- URLs are validated as well-formed HTTP/HTTPS URLs.
- The scanner only connects to the provided URL — no DNS rebinding or redirect following beyond the initial connection.
- Connection timeout: 30 seconds (configurable).
- Response size limit: 10MB per API response to prevent memory exhaustion. If a response exceeds 10MB, the request is aborted and a clear error is returned: "Response from {url}{path} exceeded 10MB limit. This may indicate an unusually large content type. Use --max-response-size to override." The scanner does not silently truncate responses.

### 3.3 CLI Input

- All CLI arguments are validated before execution.
- File paths are resolved and checked for existence before processing.
- The `--output` directory is created if it doesn't exist, but parent directories must exist.

---

## 4. Content Security

### 4.1 Schema Data

- Parsed schemas are held in memory during analysis. No schema data is transmitted externally.
- Reports are written to local disk (CLI) or offered as browser downloads (web). No data is sent to StrapiShift servers.
- The web UI is fully client-side in Phase 1 — no data leaves the browser.

### 4.2 Content Records (Phase 2+)

- Content records sampled during scanning are held in memory during analysis. They are not persisted to disk.
- Base64 image data from scanned records is counted and measured but not stored.
- The scan report includes record counts and metadata but not raw content.

### 4.3 Migration Data (Phase 4/5)

- Downloaded media files are stored in a temporary directory during migration. The developer is advised to delete this directory after migration.
- The ID mapping file contains only ID pairs (no content data).
- The progress checkpoint contains content type names and record counts, not content.

---

## 5. Network Security

### 5.1 HTTPS

- All StrapiShift web traffic is served over HTTPS (enforced by Netlify for Phase 1, Let's Encrypt via Laravel Forge for Phase 2+).
- SSL certificate validation is **enforced by default**. Connections to Strapi instances with invalid or self-signed certificates are rejected with a clear error: "SSL certificate validation failed for {url}. Use --insecure to disable (not recommended for production)." The `--insecure` flag disables validation and prints a warning to stderr on every request.

### 5.2 CORS

- Phase 1 (client-side): No CORS concerns — all processing happens in the browser.
- Phase 2+ (backend): The StrapiShift backend makes server-side requests to Strapi instances. CORS is not a factor.
- The StrapiShift web UI's own API endpoints have CORS restricted to the StrapiShift domain.

### 5.3 Rate Limiting

- The scanner rate-limits requests to Strapi instances to avoid triggering rate limits or causing performance issues on the v3 instance. Default: maximum 3 concurrent HTTP requests; 100ms minimum delay between issuing successive batches of requests. A "batch" is one set of up to `concurrency` parallel requests. If any request in a batch is still in-flight, the next batch waits until all have completed plus the 100ms delay.
- The StrapiShift web backend rate-limits incoming requests to prevent abuse.

---

## 6. Dependency Security

- All dependencies are pinned to exact versions in `pnpm-lock.yaml`.
- `pnpm audit` runs as part of CI.
- No dependencies with known critical vulnerabilities are permitted.
- Minimal dependency footprint: the core package has zero runtime dependencies. Phase-specific packages add only what's needed (e.g., `node-fetch` for API calls in the scanner).

---

## 7. Generated Script Security

The migration scripts generated in Phase 4 are designed to be auditable:

- Human-readable TypeScript with comments explaining each transformation.
- No obfuscation, minification, or dynamic code execution.
- No `eval()`, `new Function()`, or similar constructs.
- The developer is expected to review the scripts before execution.
- The `dry-run` mode allows full validation without any writes.

---

## 8. Test Plan

| Test | What It Tests |
|------|--------------|
| `token-not-logged.test.ts` | Verify tokens do not appear in any log output, report file, or checkpoint file |
| `json-bomb.test.ts` | Extremely large JSON input handled gracefully (size limit enforced) |
| `zip-traversal.test.ts` | Zip files with `../` paths rejected |
| `malformed-schema.test.ts` | Garbage input produces clear error, not crash or code execution |
| `ssl-validation.test.ts` | Self-signed certs rejected without `--insecure` flag |
| `rate-limiting.test.ts` | Scanner respects rate limits, doesn't overwhelm target |

---

## 9. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
| 2026-03-14 | 1.1.0 | Strengthened zip traversal protections; clarified SSL default behavior; specified response size limit error handling; clarified rate limiting batch semantics | Chris |
