import { describe, it, expect } from 'vitest';
import { evaluateNgRules, hasViolation } from './ngRules';
import { specJson } from '../data/spec';
import { initialSpecData } from '../types';

const base = initialSpecData;

describe('evaluateNgRules', () => {
  it('flags knit body fabric + PU 10mm piping', () => {
    const violations = evaluateNgRules(
      { ...base, bodyFabric: 'boa', piping: 'pu_10' },
      specJson,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].parameterKey).toBe('piping');
    expect(violations[0].message).toContain('ポリエステルテープ8mm');
  });

  it('flags knit body fabric + PU 15mm piping', () => {
    const violations = evaluateNgRules(
      { ...base, bodyFabric: 'acrylic', piping: 'pu_15' },
      specJson,
    );
    expect(violations.some((v) => v.parameterKey === 'piping')).toBe(true);
  });

  it('does not flag PU body fabric + PU 10mm piping', () => {
    const violations = evaluateNgRules(
      { ...base, bodyFabric: 'pu_smooth', piping: 'pu_10' },
      specJson,
    );
    expect(violations).toEqual([]);
  });

  it('flags white body + gold hardware', () => {
    const violations = evaluateNgRules(
      { ...base, bodyColor: 'white', hardwareFinish: 'gold' },
      specJson,
    );
    expect(violations.some((v) => v.parameterKey === 'hardware_finish')).toBe(true);
  });

  it('flags white body + black_nickel hardware', () => {
    const violations = evaluateNgRules(
      { ...base, bodyColor: 'white', hardwareFinish: 'black_nickel' },
      specJson,
    );
    expect(violations.some((v) => v.parameterKey === 'hardware_finish')).toBe(true);
  });

  it('does not flag black body + gold hardware', () => {
    const violations = evaluateNgRules(
      { ...base, bodyColor: 'black', hardwareFinish: 'gold' },
      specJson,
    );
    expect(violations).toEqual([]);
  });

  it('skips rules whose match is omitted (e.g. magnet_only documentation rule)', () => {
    // The closure.magnet_only rule has no `match` field, so it should never fire.
    const closureViolations = evaluateNgRules(
      { ...base, closure: 'wire_spring' },
      specJson,
    ).filter((v) => v.parameterKey === 'closure');
    expect(closureViolations).toEqual([]);
  });

  it('hasViolation reports per-parameter status', () => {
    const data = { ...base, bodyColor: 'white', hardwareFinish: 'gold' };
    expect(hasViolation(data, specJson, 'hardware_finish')).toBe(true);
    expect(hasViolation(data, specJson, 'piping')).toBe(false);
  });
});
