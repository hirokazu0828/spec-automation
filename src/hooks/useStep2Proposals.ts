import { useCallback, useState } from 'react';
import type { SpecData } from '../types';
import { specJson } from '../data/spec';
import type { SpecOption } from '../data/spec';
import { evaluateNgRules } from '../utils/ngRules';

interface Callbacks {
  onNoBaseAutoFill: () => void;
  onRegenerated: () => void;
  onRegenerateFailed: () => void;
}

const ALTERNATIVE_COLORS = ['black', 'navy', 'white', 'black_navy', 'red', 'green'];

const SHIFT_POSITION: Record<string, string> = {
  luxury: 'standard',
  standard: 'luxury',
  casual: 'standard',
};

function shapeKeyOf(headShape: string): string {
  return headShape === 'neo_mallet' ? 'neo' : headShape;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getProposalWarnings(proposal: Partial<SpecData>): string[] {
  return evaluateNgRules(proposal, specJson).map((v) => v.message);
}

export function useStep2Proposals(data: SpecData, callbacks: Callbacks) {
  const [proposals, setProposals] = useState<Partial<SpecData>[] | null>(null);
  const [currentProposalIndex, setCurrentProposalIndex] = useState(0);

  const generateProposals = useCallback(() => {
    const sk = shapeKeyOf(data.headShape);
    const baseAutoFill = specJson.auto_fill[`${data.position}_${sk}`];

    if (!baseAutoFill) {
      callbacks.onNoBaseAutoFill();
      return;
    }

    const p1: Partial<SpecData> = {
      bodyFabric: baseAutoFill.body_fabric || '',
      texture: baseAutoFill.texture || '',
      lining: baseAutoFill.lining || '',
      piping: baseAutoFill.piping || '',
      closure: baseAutoFill.closure || '',
      embroidery: baseAutoFill.embroidery || '',
      hardwareFinish: baseAutoFill.hardware_finish || '',
      bodyColor: baseAutoFill.body_color || '',
    };

    const p2Color = ALTERNATIVE_COLORS.find((c) => c !== p1.bodyColor) || 'black';
    const p2 = { ...p1, bodyColor: p2Color };

    const p3 = {
      ...p1,
      bodyFabric: p1.bodyFabric === 'pu_smooth' ? 'pu_lizard' : 'pu_smooth',
      texture: '',
    };

    const p4 = {
      ...p1,
      embroidery: 'tatami_3d',
      hardwareFinish: p1.hardwareFinish === 'matte_silver' ? 'gold' : 'matte_silver',
    };

    const shiftedPos = SHIFT_POSITION[data.position] || 'standard';
    const p5Base = specJson.auto_fill[`${shiftedPos}_${sk}`];
    const p5 = p5Base
      ? {
          bodyFabric: p5Base.body_fabric || '',
          texture: p5Base.texture || '',
          lining: p5Base.lining || '',
          piping: p5Base.piping || '',
          closure: p5Base.closure || '',
          embroidery: p5Base.embroidery || '',
          hardwareFinish: p5Base.hardware_finish || '',
          bodyColor: p5Base.body_color || '',
        }
      : { ...p1, closure: 'magnet' };

    setProposals([p1, p2, p3, p4, p5]);
    setCurrentProposalIndex(0);
  }, [data.headShape, data.position, callbacks]);

  const regenerateProposals = useCallback(() => {
    const sk = shapeKeyOf(data.headShape);
    const baseAutoFill = specJson.auto_fill[`${data.position}_${sk}`] ?? {};

    const fabrics = specJson.parameters.body_fabric.options ?? [];
    const colors = specJson.parameters.body_color.options ?? [];
    const embroideries = specJson.parameters.embroidery.options ?? [];

    const newProposals: Partial<SpecData>[] = [];
    let attempts = 0;

    while (newProposals.length < 5 && attempts < 200) {
      attempts++;
      const fabric: SpecOption = pickRandom(fabrics);
      const fabricType = fabric.type ?? 'pu';

      if (data.position === 'luxury' && fabricType === 'knit') continue;

      const candidate: Partial<SpecData> = {
        bodyFabric: fabric.value,
        bodyColor: pickRandom(colors).value,
        embroidery: pickRandom(embroideries).value,
        texture: baseAutoFill.texture || '',
        lining: baseAutoFill.lining || '',
        piping: baseAutoFill.piping || '',
        closure: baseAutoFill.closure || '',
        hardwareFinish: baseAutoFill.hardware_finish || '',
      };

      if (getProposalWarnings(candidate).length > 0) continue;

      const isDuplicate = newProposals.some(
        (existing) =>
          existing.bodyFabric === candidate.bodyFabric &&
          existing.bodyColor === candidate.bodyColor &&
          existing.embroidery === candidate.embroidery,
      );
      if (isDuplicate) continue;

      newProposals.push(candidate);
    }

    if (newProposals.length > 0) {
      setProposals(newProposals);
      setCurrentProposalIndex(0);
      callbacks.onRegenerated();
    } else {
      callbacks.onRegenerateFailed();
    }
  }, [data.headShape, data.position, callbacks]);

  return {
    proposals,
    currentProposalIndex,
    setCurrentProposalIndex,
    generateProposals,
    regenerateProposals,
    getProposalWarnings,
  };
}
