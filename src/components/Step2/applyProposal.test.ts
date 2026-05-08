import { describe, it, expect } from 'vitest';
import { applyProposal, buildFabricParts, diffFromProposal } from './applyProposal';
import { initialSpecData } from '../../types';

describe('applyProposal', () => {
  it('produces fabricParts of length 5 when piping is "none"', () => {
    const result = applyProposal({
      bodyFabric: 'pu_smooth',
      lining: 'poly_smooth',
      piping: 'none',
      closure: 'magnet',
      embroidery: 'flat',
      bodyColor: 'black',
      hardwareFinish: 'silver_matte',
    });
    expect(result.fabricParts).toHaveLength(5);
    expect(result.fabricParts?.find((p) => p.id === 'F')?.label).toBe('E');
  });

  it('produces fabricParts of length 6 when piping is set', () => {
    const result = applyProposal({
      bodyFabric: 'pu_smooth',
      lining: 'poly_smooth',
      piping: 'poly_8',
      closure: 'magnet',
      embroidery: 'flat',
      bodyColor: 'black',
      hardwareFinish: 'silver_matte',
    });
    expect(result.fabricParts).toHaveLength(6);
    expect(result.fabricParts?.find((p) => p.id === 'F')?.label).toBe('F');
    expect(result.fabricParts?.find((p) => p.id === 'E')?.usage).toBe('パイピング');
  });

  it('saves the proposal as baseProposal and resolves colorCode', () => {
    const result = applyProposal({
      bodyFabric: 'pu_smooth',
      bodyColor: 'black',
      lining: '',
      piping: '',
      closure: '',
      embroidery: '',
      texture: '',
      hardwareFinish: '',
    });
    expect(result.baseProposal).toEqual({
      bodyFabric: 'pu_smooth',
      texture: '',
      lining: '',
      piping: '',
      closure: '',
      embroidery: '',
      bodyColor: 'black',
      hardwareFinish: '',
    });
    expect(result.colorCode).toBeTruthy();
  });
});

describe('buildFabricParts', () => {
  it('reflects the given fabric labels', () => {
    const parts = buildFabricParts({
      bodyFabric: 'pu_smooth',
      lining: 'poly_smooth',
      piping: 'none',
      closure: 'magnet',
      embroidery: 'flat',
      bodyColor: 'black',
      hardwareFinish: 'silver_matte',
      colorCode: '#000000',
    });
    expect(parts[0].material).toBe('PUスムース');
  });
});

describe('diffFromProposal', () => {
  it('returns the keys whose form value differs from the proposal', () => {
    const baseline = {
      bodyFabric: 'pu_smooth',
      texture: '',
      lining: 'poly_smooth',
      piping: 'none',
      closure: 'magnet',
      embroidery: 'flat',
      bodyColor: 'black',
      hardwareFinish: 'silver_matte',
    };
    const data = {
      ...initialSpecData,
      ...baseline,
      bodyColor: 'navy',
      hardwareFinish: 'gold',
    };
    expect(diffFromProposal(data, baseline)).toEqual(['bodyColor', 'hardwareFinish']);
  });

  it('returns [] when there is no baseline', () => {
    expect(diffFromProposal(initialSpecData, null)).toEqual([]);
  });
});
