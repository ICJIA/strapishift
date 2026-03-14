// ── Strapi v3 Raw Schema Types ──

export interface V3SchemaAttributes {
  [fieldName: string]: V3FieldDefinition;
}

export interface V3FieldDefinition {
  type?: string;
  model?: string;
  collection?: string;
  via?: string;
  dominant?: boolean;
  plugin?: string;
  component?: string;
  components?: string[];
  repeatable?: boolean;
  required?: boolean;
  unique?: boolean;
  enum?: string[];
  default?: unknown;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  private?: boolean;
  configurable?: boolean;
  targetField?: string;
  [key: string]: unknown;
}

export interface V3Schema {
  kind?: 'collectionType' | 'singleType';
  collectionName?: string;
  info?: {
    name?: string;
    description?: string;
    [key: string]: unknown;
  };
  options?: {
    timestamps?: boolean | string[];
    [key: string]: unknown;
  };
  attributes: V3SchemaAttributes;
  connection?: string;
  [key: string]: unknown;
}

export interface V3ContentTypeBuilderResponse {
  data: Array<{
    uid: string;
    schema: V3Schema;
    [key: string]: unknown;
  }>;
}

// ── Parsed (Normalized) Types ──

export type Severity = 'info' | 'warning' | 'blocker';
export type Effort = 'low' | 'medium' | 'high';
export type DatabaseEngine = 'mongodb' | 'sqlite' | 'postgres' | 'mysql' | 'unknown';
export type SourceFormat = 'single-schema' | 'directory' | 'content-type-builder';

export type RelationCardinality =
  | 'manyToOne'
  | 'oneToMany'
  | 'manyToMany'
  | 'oneToOne'
  | 'morphToMany'
  | 'morphMany';

export interface ParsedField {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  private: boolean;
  // Relation-specific
  isRelation: boolean;
  relationTarget?: string;
  relationCardinality?: RelationCardinality;
  relationInverse?: string;
  relationDominant?: boolean;
  // Media-specific
  isMedia: boolean;
  mediaMultiple?: boolean;
  // Component-specific
  isComponent: boolean;
  componentUid?: string;
  componentRepeatable?: boolean;
  // Dynamic zone
  isDynamicZone: boolean;
  dynamicZoneComponents?: string[];
  // Raw definition for reference
  raw: V3FieldDefinition;
}

export interface ParsedContentType {
  name: string;
  uid: string; // v5-style: "api::article.article"
  kind: 'collectionType' | 'singleType';
  collectionName: string;
  description: string;
  fields: ParsedField[];
  hasTimestamps: boolean;
  hasDraftPublish: boolean;
}

export interface ParsedComponent {
  name: string; // e.g., "sections.hero"
  category: string; // e.g., "sections"
  displayName: string; // e.g., "hero"
  fields: ParsedField[];
}

export interface ParsedSchema {
  contentTypes: ParsedContentType[];
  components: ParsedComponent[];
  metadata: {
    sourceFormat: SourceFormat;
    strapiVersion: '3.x';
    databaseEngine: DatabaseEngine;
    totalContentTypes: number;
    totalComponents: number;
  };
}
