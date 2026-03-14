# STRAPISHIFT — Doc 08: Differentiation

**Version 1.0.0 | March 14, 2026 | Status: Draft**

---

## 1. Competitive Landscape

### 1.1 Existing Tools

There is no existing tool that does what StrapiShift does. The current landscape:

| Tool/Resource | What It Does | What It Doesn't Do |
|--------------|-------------|-------------------|
| **Strapi v5 Migration Guide** (docs.strapi.io) | Documents breaking changes, provides manual migration steps | No automated analysis, no schema parsing, no per-field audit, no script generation |
| **strapi-migration-scripts** (community) | Assorted community scripts for specific migration tasks | No comprehensive analysis, no rule engine, no report generation, fragmented and unmaintained |
| **Manual migration** | Developer reads docs, audits schemas by hand, writes scripts | Time-consuming, error-prone, no standardized output, knowledge lost after migration |

### 1.2 The Gap

No tool currently:

- Parses a v3 schema and produces a structured, per-field migration report
- Detects Base64-encoded images in rich text fields (a widespread, undocumented problem)
- Generates v5 schemas from v3 definitions
- Produces API-to-API migration scripts tailored to a specific instance
- Verifies parity between a v3 source and v5 target

StrapiShift fills the entire gap.

---

## 2. Unique Value Propositions

### 2.1 Domain Knowledge from Real Migration

StrapiShift encodes knowledge from the ICJIA ResearchHub Strapi v3 → v5 migration — a real-world migration that produced a 50-item checklist. This isn't theoretical; it's battle-tested knowledge.

The Base64 image problem is the prime example: the Strapi documentation does not mention that v3 commonly stored images as Base64 strings in rich text fields. Developers discover this during migration when things break. StrapiShift detects it before migration begins.

### 2.2 Parity Verification

No other tool verifies that a completed migration is correct. StrapiShift's parity checker compares v3 source against v5 target at both schema and data levels. This is valuable even for developers who migrate manually — it's the "did I miss anything?" safety net.

The parity checker's HTML fix checklist is designed to be handed to a contractor: here are the exact items that need fixing, with severity levels and specific actions.

### 2.3 LLM-Friendly Output

The JSON report format is designed specifically to be fed to an LLM for automated migration code generation. No other migration tool produces output optimized for LLM consumption.

### 2.4 Dual Interface

Both web UI and CLI, consuming the same analysis engine. Developers get their preferred workflow; project managers get a visual dashboard.

### 2.5 API-to-API Migration Strategy

Using Strapi's own REST API for data migration (rather than direct database manipulation) is safer, more portable, and self-validating. StrapiShift is the first tool to implement this approach systematically.

---

## 3. Target Market Positioning

### 3.1 Primary: Government Agencies

State and local government agencies adopted Strapi v3 heavily in the 2019–2022 period. These agencies typically have small dev teams (often one developer), limited migration expertise, and compliance deadlines. StrapiShift speaks directly to this audience.

### 3.2 Secondary: Strapi Community

The Strapi Discord and forum have recurring migration questions. A free, open-source tool that automates the most painful parts of migration will get traction organically.

### 3.3 Tertiary: Contract Developers

Developers who manage multiple Strapi instances for clients can use StrapiShift to standardize and accelerate their migration workflow.

---

## 4. Revision History

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2026-03-14 | 1.0.0 | Initial draft | Chris |
