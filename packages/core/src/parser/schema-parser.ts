import type {
  V3Schema,
  V3FieldDefinition,
  V3ContentTypeBuilderResponse,
  ParsedSchema,
  ParsedContentType,
  ParsedComponent,
  ParsedField,
  DatabaseEngine,
  SourceFormat,
} from './types.js';
import { parseRelationField, isRelation, isMedia } from './relation-parser.js';
import { parseComponentField, isComponent, isDynamicZone } from './component-parser.js';

/**
 * Generate a v5-style UID from a content type name.
 * article → api::article.article
 */
export function generateUid(name: string, plugin?: string): string {
  if (plugin) {
    return `plugin::${plugin}.${name}`;
  }
  return `api::${name}.${name}`;
}

/**
 * Infer the database engine from a v3 schema's connection setting or patterns.
 */
export function inferDatabaseEngine(schema: V3Schema): DatabaseEngine {
  const connection = schema.connection;
  if (!connection) return 'unknown';
  if (connection === 'mongo' || connection === 'mongoose') return 'mongodb';
  if (connection.includes('sqlite')) return 'sqlite';
  if (connection.includes('postgres') || connection.includes('pg')) return 'postgres';
  if (connection.includes('mysql')) return 'mysql';
  return 'unknown';
}

/**
 * Determine field type from a v3 field definition.
 */
function getFieldType(field: V3FieldDefinition): string {
  if (isMedia(field)) return 'media';
  if (isRelation(field)) return 'relation';
  if (isComponent(field)) return 'component';
  if (isDynamicZone(field)) return 'dynamiczone';
  return field.type || 'string';
}

/**
 * Parse a single v3 field definition into a ParsedField.
 */
export function parseField(name: string, field: V3FieldDefinition): ParsedField {
  const relationProps = parseRelationField(name, field);
  const componentProps = parseComponentField(name, field);

  return {
    name,
    type: relationProps.type ?? componentProps.type ?? getFieldType(field),
    required: field.required ?? false,
    unique: field.unique ?? false,
    private: field.private ?? false,
    isRelation: relationProps.isRelation ?? false,
    isMedia: relationProps.isMedia ?? false,
    isComponent: componentProps.isComponent ?? false,
    isDynamicZone: componentProps.isDynamicZone ?? false,
    ...(relationProps.isRelation && {
      relationTarget: relationProps.relationTarget,
      relationCardinality: relationProps.relationCardinality,
      relationInverse: relationProps.relationInverse,
      relationDominant: relationProps.relationDominant,
    }),
    ...(relationProps.isMedia && {
      mediaMultiple: relationProps.mediaMultiple,
    }),
    ...(componentProps.isComponent && {
      componentUid: componentProps.componentUid,
      componentRepeatable: componentProps.componentRepeatable,
    }),
    ...(componentProps.isDynamicZone && {
      dynamicZoneComponents: componentProps.dynamicZoneComponents,
    }),
    raw: field,
  };
}

/**
 * Parse a single v3 content type schema.
 */
export function parseContentType(
  name: string,
  schema: V3Schema,
): ParsedContentType {
  const fields = Object.entries(schema.attributes).map(([fieldName, fieldDef]) =>
    parseField(fieldName, fieldDef),
  );

  const hasPublishedAt = 'published_at' in schema.attributes || 'publishedAt' in schema.attributes;
  const hasTimestamps =
    schema.options?.timestamps !== false &&
    schema.options?.timestamps !== undefined;

  return {
    name,
    uid: generateUid(name),
    kind: schema.kind || 'collectionType',
    collectionName: schema.collectionName || `${name}s`,
    description: schema.info?.description || '',
    fields,
    hasTimestamps: hasTimestamps || 'created_at' in schema.attributes || 'createdAt' in schema.attributes,
    hasDraftPublish: hasPublishedAt,
  };
}

/**
 * Parse a single v3 schema JSON object.
 * This is the main entry point for parsing a single schema.json file.
 */
export function parseSingleSchema(
  schemaInput: V3Schema | Record<string, V3Schema>,
): ParsedSchema {
  const contentTypes: ParsedContentType[] = [];
  const dbEngine: DatabaseEngine[] = [];

  // Handle both single schema (with attributes at top level)
  // and multiple schemas keyed by name
  if ('attributes' in schemaInput) {
    // Single schema — infer name from info.name or collectionName
    const schema = schemaInput as V3Schema;
    const name =
      (schema.info?.name as string) ||
      schema.collectionName?.replace(/s$/, '') ||
      'unknown';
    contentTypes.push(parseContentType(name, schema));
    dbEngine.push(inferDatabaseEngine(schema));
  } else {
    // Multiple schemas keyed by name
    for (const [name, schema] of Object.entries(schemaInput)) {
      if (schema && typeof schema === 'object' && 'attributes' in schema) {
        contentTypes.push(parseContentType(name, schema as V3Schema));
        dbEngine.push(inferDatabaseEngine(schema as V3Schema));
      }
    }
  }

  // Determine overall database engine (most common, or first found)
  const engineCounts = dbEngine.reduce(
    (acc, e) => {
      if (e !== 'unknown') acc[e] = (acc[e] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const detectedEngine =
    (Object.entries(engineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as DatabaseEngine) || 'unknown';

  return {
    contentTypes,
    components: [],
    metadata: {
      sourceFormat: 'single-schema',
      strapiVersion: '3.x',
      databaseEngine: detectedEngine,
      totalContentTypes: contentTypes.length,
      totalComponents: 0,
    },
  };
}

/**
 * Parse a Content Type Builder API response.
 */
export function parseContentTypeBuilderResponse(
  response: V3ContentTypeBuilderResponse,
): ParsedSchema {
  const contentTypes: ParsedContentType[] = [];

  for (const item of response.data) {
    const name = item.uid.split('.').pop() || item.uid;
    contentTypes.push(parseContentType(name, item.schema));
  }

  return {
    contentTypes,
    components: [],
    metadata: {
      sourceFormat: 'content-type-builder',
      strapiVersion: '3.x',
      databaseEngine: 'unknown',
      totalContentTypes: contentTypes.length,
      totalComponents: 0,
    },
  };
}
