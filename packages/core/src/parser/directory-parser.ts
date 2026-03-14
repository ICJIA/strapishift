import type { V3Schema, ParsedSchema, ParsedComponent, ParsedField } from './types.js';
import { parseContentType, parseField, inferDatabaseEngine } from './schema-parser.js';

/**
 * Parse a directory-style input: an object keyed by content type name,
 * each containing a v3 schema. Optionally includes components.
 *
 * This simulates reading the api directory content-type schema.json files
 * and component json files from a Strapi v3 project.
 */
export function parseDirectory(
  schemas: Record<string, V3Schema>,
  components?: Record<string, V3Schema>,
): ParsedSchema {
  const contentTypes = Object.entries(schemas).map(([name, schema]) =>
    parseContentType(name, schema),
  );

  const parsedComponents: ParsedComponent[] = [];
  if (components) {
    for (const [uid, schema] of Object.entries(components)) {
      // Component uid format: "sections.hero"
      const parts = uid.split('.');
      const category = parts[0] || uid;
      const displayName = parts[1] || uid;
      const fields: ParsedField[] = Object.entries(schema.attributes || {}).map(
        ([name, def]) => parseField(name, def),
      );
      parsedComponents.push({
        name: uid,
        category,
        displayName,
        fields,
      });
    }
  }

  // Determine database engine
  const engines = Object.values(schemas).map(inferDatabaseEngine);
  const engineCounts = engines.reduce(
    (acc, e) => {
      if (e !== 'unknown') acc[e] = (acc[e] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const detectedEngine =
    (Object.entries(engineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as ParsedSchema['metadata']['databaseEngine']) ||
    'unknown';

  return {
    contentTypes,
    components: parsedComponents,
    metadata: {
      sourceFormat: 'directory',
      strapiVersion: '3.x',
      databaseEngine: detectedEngine,
      totalContentTypes: contentTypes.length,
      totalComponents: parsedComponents.length,
    },
  };
}
