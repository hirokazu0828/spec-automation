import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStep2Proposals } from './useStep2Proposals';
import { initialSpecData } from '../types';
import { specJson } from '../data/spec';

const validBodyFabricValues = new Set(specJson.parameters.body_fabric.options?.map((o) => o.value));
const validHardwareFinishValues = new Set(specJson.parameters.hardware_finish.options?.map((o) => o.value));

const noopCallbacks = {
  onNoBaseAutoFill: () => {},
  onRegenerated: () => {},
  onRegenerateFailed: () => {},
};

describe('useStep2Proposals — proposal values match the master JSON', () => {
  it('p3 toggles bodyFabric to a value that exists in putter-cover.json', () => {
    const data = { ...initialSpecData, headShape: 'pin', position: 'luxury' };
    const { result } = renderHook(() => useStep2Proposals(data, noopCallbacks));
    act(() => {
      result.current.generateProposals();
    });
    const proposals = result.current.proposals;
    expect(proposals).not.toBeNull();
    expect(proposals).toHaveLength(5);
    const p3 = proposals![2];
    expect(p3.bodyFabric).toBeTruthy();
    expect(validBodyFabricValues.has(p3.bodyFabric!)).toBe(true);
  });

  it('p4 toggles hardwareFinish to a value that exists in putter-cover.json', () => {
    const data = { ...initialSpecData, headShape: 'pin', position: 'luxury' };
    const { result } = renderHook(() => useStep2Proposals(data, noopCallbacks));
    act(() => {
      result.current.generateProposals();
    });
    const proposals = result.current.proposals;
    expect(proposals).not.toBeNull();
    const p4 = proposals![3];
    expect(p4.hardwareFinish).toBeTruthy();
    expect(validHardwareFinishValues.has(p4.hardwareFinish!)).toBe(true);
  });

  it('every generated proposal references only known body_fabric / hardware_finish values', () => {
    const data = { ...initialSpecData, headShape: 'mallet', position: 'standard' };
    const { result } = renderHook(() => useStep2Proposals(data, noopCallbacks));
    act(() => {
      result.current.generateProposals();
    });
    for (const p of result.current.proposals ?? []) {
      if (p.bodyFabric) expect(validBodyFabricValues.has(p.bodyFabric)).toBe(true);
      if (p.hardwareFinish) expect(validHardwareFinishValues.has(p.hardwareFinish)).toBe(true);
    }
  });
});
