import type { V3FieldDefinition, ParsedField } from './types.js';

/**
 * Determine if a v3 field definition is a component.
 */
export function isComponent(field: V3FieldDefinition): boolean {
  return field.type === 'component' && !!field.component;
}

/**
 * Determine if a v3 field definition is a dynamic zone.
 */
export function isDynamicZone(field: V3FieldDefinition): boolean {
  return field.type === 'dynamiczone' && Array.isArray(field.components);
}

/**
 * Parse a v3 component field into ParsedField component-specific properties.
 */
export function parseComponentField(
  name: string,
  field: V3FieldDefinition,
): Partial<ParsedField> {
  if (isDynamicZone(field)) {
    return {
      isComponent: false,
      isDynamicZone: true,
      dynamicZoneComponents: field.components ?? [],
      type: 'dynamiczone',
    };
  }

  if (isComponent(field)) {
    return {
      isComponent: true,
      isDynamicZone: false,
      componentUid: field.component,
      componentRepeatable: field.repeatable ?? false,
      type: 'component',
    };
  }

  return { isComponent: false, isDynamicZone: false };
}
