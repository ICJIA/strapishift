import { describe, it, expect, beforeEach } from 'vitest';
import { registerModule, getRegisteredModules, getModule, clearModules } from '../../src/modules/registry.js';

describe('Module Registry', () => {
  beforeEach(() => {
    clearModules();
  });

  it('registers a module', () => {
    registerModule({
      name: '@strapishift/scanner',
      phase: 2,
      description: 'Live instance scanning',
    });

    expect(getRegisteredModules()).toHaveLength(1);
    expect(getModule('@strapishift/scanner')).toBeDefined();
  });

  it('rejects duplicate module names', () => {
    registerModule({
      name: '@strapishift/scanner',
      phase: 2,
      description: 'Scanner',
    });

    expect(() =>
      registerModule({
        name: '@strapishift/scanner',
        phase: 2,
        description: 'Scanner duplicate',
      }),
    ).toThrow('already registered');
  });

  it('rejects modules with missing dependencies', () => {
    expect(() =>
      registerModule({
        name: '@strapishift/migrator',
        phase: 4,
        description: 'Migrator',
        dependencies: ['@strapishift/nonexistent'],
      }),
    ).toThrow('unregistered dependencies');
  });

  it('accepts modules with satisfied dependencies', () => {
    registerModule({
      name: '@strapishift/scanner',
      phase: 2,
      description: 'Scanner',
    });

    expect(() =>
      registerModule({
        name: '@strapishift/enhanced-scanner',
        phase: 2,
        description: 'Enhanced scanner',
        dependencies: ['@strapishift/scanner'],
      }),
    ).not.toThrow();
  });

  it('returns undefined for unknown modules', () => {
    expect(getModule('@strapishift/nonexistent')).toBeUndefined();
  });

  it('clears all modules', () => {
    registerModule({ name: 'test', phase: 2, description: 'Test' });
    expect(getRegisteredModules()).toHaveLength(1);
    clearModules();
    expect(getRegisteredModules()).toHaveLength(0);
  });
});
