import { describe, it, expect } from 'vitest';
import { runRules } from '../../src/rules/index.js';
import { parseSingleSchema } from '../../src/parser/schema-parser.js';
import articleSchema from '../fixtures/v3-article-schema.json';
import multiSchema from '../fixtures/v3-multi-schema.json';

describe('Rule Engine', () => {
  const singleParsed = parseSingleSchema(articleSchema as any);
  const multiParsed = parseSingleSchema(multiSchema as any);

  describe('database rules', () => {
    it('flags published_at field rename', () => {
      const findings = runRules(singleParsed);
      const dbNaming = findings.filter((f) => f.ruleId === 'db-field-naming');
      expect(dbNaming.some((f) => f.field === 'published_at')).toBe(true);
    });

    it('flags MongoDB nested JSON fields', () => {
      const findings = runRules(singleParsed);
      const mongoNested = findings.filter((f) => f.ruleId === 'db-mongodb-nested');
      expect(mongoNested.some((f) => f.field === 'metadata')).toBe(true);
    });

    it('flags ObjectId references on MongoDB', () => {
      const findings = runRules(singleParsed);
      const objectIdRefs = findings.filter((f) => f.ruleId === 'db-objectid-refs');
      expect(objectIdRefs.length).toBeGreaterThan(0);
    });

    it('does not flag MongoDB rules for non-MongoDB schemas', () => {
      // Create a schema with no MongoDB connection
      const sqlSchema = parseSingleSchema({
        kind: 'collectionType' as const,
        collectionName: 'pages',
        info: { name: 'Page' },
        attributes: {
          title: { type: 'string' },
          content: { type: 'json' },
        },
        connection: 'sqlite',
      } as any);
      const findings = runRules(sqlSchema);
      const mongoRules = findings.filter(
        (f) => f.ruleId === 'db-mongodb-nested' || f.ruleId === 'db-objectid-refs',
      );
      expect(mongoRules.length).toBe(0);
    });
  });

  describe('API rules', () => {
    it('flags response envelope change for all content types', () => {
      const findings = runRules(singleParsed);
      const envelope = findings.filter((f) => f.ruleId === 'api-response-envelope');
      expect(envelope.length).toBe(singleParsed.contentTypes.length);
    });

    it('flags filter syntax change', () => {
      const findings = runRules(singleParsed);
      const filters = findings.filter((f) => f.ruleId === 'api-filter-syntax');
      expect(filters.length).toBeGreaterThan(0);
    });

    it('flags populate syntax for content types with relations', () => {
      const findings = runRules(singleParsed);
      const populate = findings.filter((f) => f.ruleId === 'api-populate-syntax');
      expect(populate.length).toBeGreaterThan(0);
    });

    it('flags pagination format for collection types', () => {
      const findings = runRules(singleParsed);
      const pagination = findings.filter((f) => f.ruleId === 'api-pagination-format');
      expect(pagination.length).toBeGreaterThan(0);
    });
  });

  describe('media rules', () => {
    it('flags richtext fields as Base64 candidates (blocker)', () => {
      const findings = runRules(singleParsed);
      const base64 = findings.filter((f) => f.ruleId === 'media-base64-candidate');
      expect(base64.length).toBeGreaterThan(0);
      expect(base64[0].severity).toBe('blocker');
      expect(base64[0].field).toBe('body');
    });

    it('flags media reference format changes', () => {
      const findings = runRules(singleParsed);
      const mediaRef = findings.filter((f) => f.ruleId === 'media-reference-format');
      expect(mediaRef.length).toBeGreaterThan(0);
    });
  });

  describe('relation rules', () => {
    it('flags relation cardinality syntax changes', () => {
      const findings = runRules(singleParsed);
      const relSyntax = findings.filter((f) => f.ruleId === 'rel-cardinality-syntax');
      expect(relSyntax.length).toBeGreaterThan(0);
    });

    it('detects circular relations', () => {
      const findings = runRules(multiParsed);
      const circular = findings.filter((f) => f.ruleId === 'rel-circular');
      // article ↔ author and article ↔ category are circular
      expect(circular.length).toBeGreaterThan(0);
    });
  });

  describe('auth rules', () => {
    it('flags relations to user model', () => {
      const findings = runRules(singleParsed);
      const auth = findings.filter((f) => f.ruleId === 'auth-user-model');
      expect(auth.length).toBeGreaterThan(0);
      expect(auth[0].field).toBe('author');
    });
  });

  describe('rule category filtering', () => {
    it('can disable specific rule categories', () => {
      const allFindings = runRules(singleParsed);
      const withoutDb = runRules(singleParsed, { database: false });
      expect(withoutDb.length).toBeLessThan(allFindings.length);
      expect(withoutDb.filter((f) => f.ruleId.startsWith('db-')).length).toBe(0);
    });
  });
});
