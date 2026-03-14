# STRAPISHIFT — Doc 10: Revision & Gap Analysis

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Purpose

This document tracks cross-document consistency, known gaps, and open questions that need resolution before or during implementation.

---

## 2. Cross-Document Consistency Checks

### 2.1 Package Names

| Package | Doc 00 | Doc 01 | Doc 09 | Consistent? |
|---------|--------|--------|--------|-------------|
| `@strapishift/core` | ✅ | ✅ | ✅ | Yes |
| `@strapishift/web` | ✅ | ✅ | ✅ | Yes |
| `@strapishift/cli` | ✅ | ✅ | ✅ | Yes |
| `@strapishift/scanner` | ✅ | — | ✅ | Yes |
| `@strapishift/generator` | ✅ | — | ✅ | Yes |
| `@strapishift/migrator` | ✅ | — | ✅ | Yes |

### 2.2 Version Numbers

| Dependency | Specified Version | Docs Referencing |
|-----------|------------------|-----------------|
| Nuxt | 4.4.2 | Doc 00, Doc 01, Doc 09 |
| Nuxt UI | 4.5.1 | Doc 00, Doc 01, Doc 09 |
| Vitest | ^3.0.0 | Doc 01, Doc 09 |
| TypeScript | ^5.7.0 | Doc 09 |
| citty | ^0.1.0 | Doc 01, Doc 07, Doc 09 |
| Node.js | >=20.0.0 | Doc 09 |

### 2.3 Parity Checker Scope

The parity checker was elevated to a primary Phase 1 feature (Doc 01 updated). Verify all references are consistent:

- Doc 00: Updated — Phase 1 now "Schema Analysis, Parity Verification & Migration Report" ✅
- Doc 01: Updated — parity checker is primary, /verify page is primary ✅
- Doc 03: References post-generation parity check ✅
- Doc 05: References post-migration verification ✅
- Doc 07: Phase 1 prompt includes parity checker ✅

---

## 3. Known Gaps

### 3.1 ResearchHub Schema Fixture

The test plan heavily references the "ResearchHub v3 schema" as a test fixture, but this schema has not been extracted and committed as a JSON file. This is a prerequisite for Phase 1 implementation.

**Action:** Extract the ResearchHub Strapi v3 schema.json files and commit to `packages/core/test/fixtures/`.

### 3.2 Strapi v5 Content Type Builder API

The parity checker needs to pull schemas from a live v5 instance. The exact v5 Content Type Builder API endpoints and response format need to be confirmed against a running v5 instance.

**Action:** Stand up a test Strapi v5 instance and document the Content Type Builder API response format.

### 3.3 v5 Schema JSON Format

Doc 03 specifies the generated v5 schema format, but this should be validated against what Strapi v5 actually expects. Minor format differences (key ordering, required vs. optional fields) could prevent v5 from booting.

**Action:** Create a manual v5 content type, export its schema.json, and compare against Doc 03's generated format.

### 3.4 Phase 2-5 LLM Build Prompts

~~Doc 07 includes fully specified prompts for Phase 1 (Core, CLI, Web) but only outlines for Phases 2-5.~~

**Status: RESOLVED.** Doc 07 v1.1.0 now includes fully specified prompts for all phases (2-5), including module registration patterns, security requirements, file structures, and test instructions.

### 3.5 Strapi v4 → v5 Support

Doc 00 lists this as an open question. v4 → v5 is a smaller migration but has a larger potential user base. The rule engine architecture supports adding v4 rules alongside v3 rules, but this would approximately double the rule count.

**Action:** Decide before Phase 2. If yes, add v4 rules incrementally. If no, document as a future consideration.

### 3.6 Docker Test Infrastructure

Doc 09 specifies a Docker Compose setup for integration tests, but the seed script and test data definitions are not yet specified.

**Action:** Define seed script and test data in detail during Phase 2 planning (integration tests start in Phase 2).

---

## 4. Open Questions (Carried from Doc 00)

| # | Question | Status | Decision |
|---|----------|--------|----------|
| 1 | Is `strapishift.com` available? | Open | Check domain availability |
| 2 | Is `strapishift` available on npm? | Open | Check npm registry |
| 3 | Strapi v4 → v5 support? | Open | Decide before Phase 2 |
| 4 | Timestamp preservation: auto or opt-in? | Leaning opt-in | Config flag in Phase 4 |
| 5 | MongoDB Atlas direct connection? | Open | Could enhance Phase 2 Base64 scanning |
| 6 | License: MIT? | **Resolved** | MIT license confirmed |
| 7 | Docker fixtures: Doc 01 or Doc 09? | Resolved | Doc 09 for setup, Phase 2 for seed script |

---

## 5. Version Compatibility Matrix

| Strapi Source Version | Strapi Target Version | Supported? | Notes |
|----------------------|----------------------|-----------|-------|
| 3.0.x – 3.6.x | 5.x | Phase 1 target | Primary use case |
| 4.0.x – 4.x | 5.x | Future consideration | Smaller diff, larger user base |
| 3.x | 4.x | Not planned | v4 is not the recommended target |

---

## 6. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Strapi v5 schema format undocumented or unstable | High | Medium | Validate against running v5 instance before Phase 3 |
| v3 instances with heavily customized plugins | Medium | High | Document unsupported patterns, provide manual override hooks |
| Base64 detection false positives | Low | Low | Minimum match length (100 chars), MIME type validation |
| API-to-API migration too slow for large instances | Medium | Medium | Configurable batch size/concurrency, progress tracking, resume capability |
| Strapi v5 API rate limiting during migration | Medium | Medium | Respect rate limit headers, configurable delays, backoff |

---

## 7. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
