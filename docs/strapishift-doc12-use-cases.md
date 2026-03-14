# STRAPISHIFT — Doc 12: Use Cases

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Personas

### Persona A: Solo Government Developer ("Chris")

- Role: Full-stack developer at a state government agency
- Context: Manages 15+ agency websites, largely solo. Strapi v3 backend for the main site. Limited time, compliance deadlines. Has already done one migration with a contractor.
- Need: Verify the contractor's migration is complete. Plan future migrations. Automate what he can.
- Uses: Parity checker (immediately), schema analysis, migration report for planning.

### Persona B: Contract Developer ("Dana")

- Role: Freelance developer hired to migrate Strapi instances
- Context: Managing 3-5 Strapi v3 → v5 migrations for different clients. Each instance is different. Needs to scope work accurately and deliver consistently.
- Need: Quickly assess migration complexity per client. Generate v5 schemas to avoid manual rewriting. Produce migration scripts that handle the repetitive parts.
- Uses: Full pipeline — analysis through script generation. Uses reports to communicate scope to clients.

### Persona C: Agency Team Lead ("Marcus")

- Role: Non-technical project manager at a government agency
- Context: Responsible for the Strapi migration project. Needs to understand scope, assign work, track progress.
- Need: A report he can read without being a developer. Exportable checklists he can track in spreadsheets.
- Uses: HTML report (visual dashboard), CSV export (for spreadsheet tracking), parity report (to verify contractor work).

### Persona D: Strapi Community Developer ("Priya")

- Role: Developer in the Strapi open-source community
- Context: Maintaining a personal project or side business on Strapi v3. Saw StrapiShift mentioned on Discord.
- Need: Quick assessment of what's involved in upgrading. Wants to know if it's a weekend project or a month-long effort.
- Uses: Web UI — paste schema, read report, export checklist.

---

## 2. Use Cases

### UC-001: Verify Contractor's Migration

**Persona:** A (Solo Government Developer)
**Phase:** 1

**Scenario:** Chris hired a contract developer to migrate the ResearchHub site from Strapi v3 to v5. The contractor performed the migration via direct database manipulation. Chris needs to verify that everything made it across correctly.

**Flow:**

1. Chris opens StrapiShift web UI and navigates to `/verify`.
2. He uploads the original v3 `schema.json` files (saved before migration).
3. He enters the v5 instance URL and API token.
4. StrapiShift pulls the v5 schemas via the Content Type Builder API.
5. The parity checker compares v3 source against v5 target.
6. Results appear: "94.2% parity — 3 failures, 5 warnings."
7. Chris expands the failures: one content type missing a field, two relations pointing to wrong targets.
8. He downloads the HTML fix checklist.
9. He emails the checklist to the contractor: "Please fix these 3 items."

**Success criteria:** Chris identifies all discrepancies in under 5 minutes and has a concrete, actionable document to send.

---

### UC-002: Scope a Migration Project

**Persona:** B (Contract Developer)
**Phase:** 1

**Scenario:** Dana is preparing a proposal for a new client's Strapi v3 → v5 migration. She needs to assess complexity and estimate hours.

**Flow:**

1. Dana asks the client for their v3 schema files (or access to the v3 instance).
2. She runs `strapishift analyze ./client-schemas/ --recursive`.
3. The report shows: 15 content types, 8 clean, 5 warnings, 2 blockers.
4. Blockers: Base64 images detected in 2 rich text fields. Estimated 800+ affected records.
5. She reviews the effort estimates: 40-60 hours total.
6. She exports the Markdown report and includes it in her project proposal.
7. The CSV export goes into her project planning spreadsheet for task assignment.

**Success criteria:** Dana produces an accurate scope estimate in under 15 minutes, backed by a detailed technical report.

---

### UC-003: Quick Personal Assessment

**Persona:** D (Strapi Community Developer)
**Phase:** 1

**Scenario:** Priya has a personal blog running on Strapi v3. She wants to know if upgrading to v5 is worth the effort.

**Flow:**

1. Priya visits the StrapiShift web UI.
2. She pastes her blog's `schema.json` (3 content types: Post, Category, Tag).
3. She clicks Analyze.
4. Results: all green. 6 warnings (all API syntax changes), 0 blockers.
5. Effort estimate: 4-8 hours.
6. She thinks "that's a weekend project" and closes the tab.

**Success criteria:** Priya gets a clear, honest assessment in under 2 minutes without signing up for anything.

---

### UC-004: Generate v5 Schemas

**Persona:** B (Contract Developer)
**Phase:** 3

**Scenario:** Dana has been approved for the migration project. She needs to create the v5 content type structure.

**Flow:**

1. Dana runs `strapishift generate --input report.json --output ./v5-project/src/api/`.
2. StrapiShift generates all content type schemas, component definitions, and controller/route/service stubs.
3. The post-generation parity check runs: "100% parity — all content types, fields, and relations mapped."
4. Dana creates a fresh Strapi v5 project, copies the generated `src/api/` directory, and runs `strapi develop`.
5. Strapi v5 boots. She verifies content types in the admin panel.
6. She reviews the per-content-type MIGRATION-NOTES.md files for any manual adjustments.

**Success criteria:** Strapi v5 boots with correct content types. Zero manual schema writing.

---

### UC-005: Migrate Data via API-to-API

**Persona:** B (Contract Developer)
**Phase:** 4

**Scenario:** Dana has the v5 instance running with correct schemas. She needs to move all content from v3 to v5.

**Flow:**

1. Dana runs `strapishift migrate --input report.json --v3-url ... --v5-url ... --output ./migration/`.
2. StrapiShift generates a migration script package in `./migration/`.
3. She reviews the generated scripts, particularly the dependency order and the Base64 extraction logic.
4. She runs `node migration/dry-run.ts` — validation passes, no writes to v5.
5. She runs `node migration/migrate.ts`.
6. Progress displays in the terminal: media first, then content types in order.
7. 3 records fail (validation errors on optional fields). She reviews the error log, adjusts the records manually in v3, re-runs with `--resume`.
8. Post-migration verification: "99.96% parity — 3 records had manual fixes."

**Success criteria:** All data migrated. Relations intact. Media accessible. Base64 images extracted.

---

### UC-006: Track Migration Progress

**Persona:** C (Agency Team Lead)
**Phase:** 5

**Scenario:** Marcus is overseeing the migration. Dana is executing. Marcus wants to see progress without bothering Dana.

**Flow:**

1. Dana starts the migration from the web dashboard.
2. Marcus opens the same dashboard URL on his laptop.
3. He sees real-time progress: content types with progress bars, timing, error count.
4. An error appears — he can see the error detail but leaves the retry to Dana.
5. Migration completes. The verification report appears.
6. Marcus downloads the HTML verification report for the project documentation.

**Success criteria:** Marcus has real-time visibility without requiring technical expertise.

---

### UC-007: CI/CD Integration

**Persona:** B (Contract Developer)
**Phase:** 1

**Scenario:** Dana integrates StrapiShift into her CI pipeline for a client who will be making schema changes before the migration.

**Flow:**

1. Dana adds `strapishift analyze` to the CI pipeline.
2. Every time the v3 schema changes (PR merged), the pipeline runs the analysis.
3. If blockers are found (exit code 2), the pipeline fails with a clear message.
4. The JSON report is uploaded as a CI artifact for review.
5. Before migration day, Dana runs the latest report to confirm no new blockers.

**Success criteria:** Schema changes that would block migration are caught before they reach production.

---

### UC-008: LLM-Assisted Migration

**Persona:** A or B
**Phase:** 1 + external

**Scenario:** A developer wants to use an LLM to help write the frontend migration code (updating API queries from v3 to v5 syntax).

**Flow:**

1. Developer runs `strapishift analyze schema.json --format json --quiet`.
2. Opens an LLM conversation: "Given this StrapiShift migration report, generate updated API query functions for each content type."
3. Pastes the JSON report.
4. The LLM reads the structured findings (api-response-envelope, api-filter-syntax, api-populate-syntax) and generates updated query code for each content type.

**Success criteria:** The JSON report is detailed enough that an LLM generates correct v5 API queries without additional context.

---

## 3. Edge Cases

### EC-001: Empty Schema

**Input:** A valid JSON file with no content types defined.
**Expected:** Report with 0 content types, 0 findings. Clear message: "No content types found."

### EC-002: Schema with Only Single Types

**Input:** All content types are `singleType` (not collections).
**Expected:** All rules still apply. Pagination rules skipped for single types.

### EC-003: Heavily Customized Instance

**Input:** Custom plugins, custom field types, lifecycle hooks.
**Expected:** Unknown plugins flagged as "unrecognized — manual review needed." Unknown field types flagged as info. Tool does not crash on unrecognized patterns.

### EC-004: Very Large Schema

**Input:** 100+ content types, 500+ fields.
**Expected:** Analysis completes in under 10 seconds. Report is navigable (filtering and search in HTML report).

### EC-005: v3 Instance on SQLite (not MongoDB)

**Input:** Strapi v3 running on SQLite (less common but valid).
**Expected:** MongoDB-specific rules (db-mongodb-nested, db-objectid-refs) produce no findings. All other rules still apply.

### EC-006: Circular Relations

**Input:** Article → Author → Article (circular reference).
**Expected:** Detected by rel-circular rule. Flagged as info for Phase 4 dependency ordering. Does not crash the parser or rule engine.

### EC-007: Parity Check with Intentional Differences

**Input:** v5 instance has additional content types not in v3 (new features added post-migration).
**Expected:** Extra v5 content types flagged as "info — present in v5 but not in v3 (new addition?)". Not counted as failures.

---

## 4. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft — 4 personas, 8 use cases, 7 edge cases | Chris |
