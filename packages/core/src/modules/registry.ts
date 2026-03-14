import type { StrapiShiftModule } from './types.js';

const moduleRegistry = new Map<string, StrapiShiftModule>();

/**
 * Register a StrapiShift module.
 * Validates: no duplicate names, all dependencies registered.
 */
export function registerModule(mod: StrapiShiftModule): void {
  if (moduleRegistry.has(mod.name)) {
    throw new Error(`Module "${mod.name}" is already registered.`);
  }

  const missingDeps = mod.dependencies?.filter((d) => !moduleRegistry.has(d)) ?? [];
  if (missingDeps.length > 0) {
    throw new Error(
      `Module "${mod.name}" has unregistered dependencies: ${missingDeps.join(', ')}`,
    );
  }

  moduleRegistry.set(mod.name, mod);
}

/**
 * Get all registered modules.
 */
export function getRegisteredModules(): StrapiShiftModule[] {
  return Array.from(moduleRegistry.values());
}

/**
 * Get a specific registered module by name.
 */
export function getModule(name: string): StrapiShiftModule | undefined {
  return moduleRegistry.get(name);
}

/**
 * Clear all registered modules (for testing).
 */
export function clearModules(): void {
  moduleRegistry.clear();
}
