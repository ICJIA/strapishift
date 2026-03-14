import { describe, it, expect } from 'vitest';
import { parseSingleSchema, parseField, generateUid } from '../../src/parser/schema-parser.js';
import articleSchema from '../fixtures/v3-article-schema.json';
import multiSchema from '../fixtures/v3-multi-schema.json';

describe('generateUid', () => {
  it('generates api:: UID for content types', () => {
    expect(generateUid('article')).toBe('api::article.article');
  });

  it('generates plugin:: UID for plugin content types', () => {
    expect(generateUid('user', 'users-permissions')).toBe('plugin::users-permissions.user');
  });
});

describe('parseField', () => {
  it('parses a string field', () => {
    const field = parseField('title', { type: 'string', required: true });
    expect(field.type).toBe('string');
    expect(field.required).toBe(true);
    expect(field.isRelation).toBe(false);
    expect(field.isMedia).toBe(false);
  });

  it('parses a richtext field', () => {
    const field = parseField('body', { type: 'richtext' });
    expect(field.type).toBe('richtext');
  });

  it('parses a manyToOne relation', () => {
    const field = parseField('author', { model: 'user', via: 'articles' });
    expect(field.isRelation).toBe(true);
    expect(field.relationTarget).toBe('user');
    expect(field.relationCardinality).toBe('manyToOne');
    expect(field.relationInverse).toBe('articles');
  });

  it('parses a manyToMany relation', () => {
    const field = parseField('categories', { collection: 'category', via: 'articles', dominant: true });
    expect(field.isRelation).toBe(true);
    expect(field.relationTarget).toBe('category');
    expect(field.relationCardinality).toBe('manyToMany');
    expect(field.relationDominant).toBe(true);
  });

  it('parses a single media field', () => {
    const field = parseField('cover', { model: 'file', via: 'related', plugin: 'upload' });
    expect(field.isMedia).toBe(true);
    expect(field.mediaMultiple).toBe(false);
    expect(field.isRelation).toBe(false);
  });

  it('parses a multiple media field', () => {
    const field = parseField('gallery', { collection: 'file', via: 'related', plugin: 'upload' });
    expect(field.isMedia).toBe(true);
    expect(field.mediaMultiple).toBe(true);
  });

  it('parses a component field', () => {
    const field = parseField('seo', { type: 'component', component: 'shared.seo' });
    expect(field.isComponent).toBe(true);
    expect(field.componentUid).toBe('shared.seo');
    expect(field.componentRepeatable).toBe(false);
  });

  it('parses a dynamic zone field', () => {
    const field = parseField('sections', { type: 'dynamiczone', components: ['sections.hero', 'sections.cta'] });
    expect(field.isDynamicZone).toBe(true);
    expect(field.dynamicZoneComponents).toEqual(['sections.hero', 'sections.cta']);
  });
});

describe('parseSingleSchema', () => {
  it('parses a single v3 schema', () => {
    const result = parseSingleSchema(articleSchema as any);
    expect(result.contentTypes).toHaveLength(1);
    expect(result.metadata.strapiVersion).toBe('3.x');
    expect(result.metadata.databaseEngine).toBe('mongodb');

    const article = result.contentTypes[0];
    expect(article.name).toBe('Article');
    expect(article.uid).toBe('api::Article.Article');
    expect(article.kind).toBe('collectionType');
    expect(article.fields.length).toBeGreaterThan(5);
  });

  it('parses multiple schemas keyed by name', () => {
    const result = parseSingleSchema(multiSchema as any);
    expect(result.contentTypes).toHaveLength(3);
    expect(result.contentTypes.map((ct) => ct.name).sort()).toEqual(['article', 'author', 'category']);
  });

  it('detects MongoDB database engine', () => {
    const result = parseSingleSchema(articleSchema as any);
    expect(result.metadata.databaseEngine).toBe('mongodb');
  });
});
