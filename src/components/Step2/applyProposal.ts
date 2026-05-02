import type { SpecData, ProposalBase } from '../../types';
import { PROPOSAL_KEYS } from '../../types';
import { specJson } from '../../data/spec';
import { getLabel, getColorHex } from '../../utils/specHelpers';

export function buildFabricParts(
  source: Pick<
    SpecData,
    'bodyFabric' | 'lining' | 'piping' | 'closure' | 'embroidery' | 'bodyColor' | 'hardwareFinish' | 'colorCode'
  >,
): SpecData['fabricParts'] {
  const cCode = source.colorCode || getColorHex(source.bodyColor);
  const colorNameJp = getLabel(specJson.parameters.body_color, source.bodyColor || '');

  const parts: SpecData['fabricParts'] = [
    { id: 'A', label: 'A', usage: '本体生地・縁巻き', material: getLabel(specJson.parameters.body_fabric, source.bodyFabric || ''), partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' },
    { id: 'B', label: 'B', usage: '本体生地・切替', material: '', partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' },
    { id: 'C', label: 'C', usage: '裏地', material: getLabel(specJson.parameters.lining, source.lining || ''), partNumber: '', quantity: '', colorName: 'ホワイト', colorSwatch: '#ffffff', threadNumber: '' },
    { id: 'D', label: 'D', usage: '留め具', material: getLabel(specJson.parameters.closure, source.closure || ''), partNumber: '', quantity: '1組', colorName: getLabel(specJson.parameters.hardware_finish, source.hardwareFinish || ''), colorSwatch: '#cccccc', threadNumber: '' },
  ];

  if (source.piping && source.piping !== 'なし' && source.piping !== 'none') {
    parts.push({ id: 'E', label: 'E', usage: 'パイピング', material: getLabel(specJson.parameters.piping, source.piping || ''), partNumber: '', quantity: '', colorName: colorNameJp, colorSwatch: cCode, threadNumber: '' });
  }

  const fLabel = parts.length === 4 ? 'E' : 'F';
  parts.push({ id: 'F', label: fLabel, usage: '刺繍・装飾', material: getLabel(specJson.parameters.embroidery, source.embroidery || ''), partNumber: '', quantity: '', colorName: '', colorSwatch: '#cccccc', threadNumber: '' });

  return parts;
}

export function applyProposal(proposal: Partial<SpecData>): Partial<SpecData> {
  const cCode = getColorHex(proposal.bodyColor);
  const merged: ProposalBase = {
    bodyFabric: proposal.bodyFabric ?? '',
    texture: proposal.texture ?? '',
    lining: proposal.lining ?? '',
    piping: proposal.piping ?? '',
    closure: proposal.closure ?? '',
    embroidery: proposal.embroidery ?? '',
    bodyColor: proposal.bodyColor ?? '',
    hardwareFinish: proposal.hardwareFinish ?? '',
  };

  const fabricParts = buildFabricParts({ ...merged, colorCode: cCode });

  return {
    ...merged,
    colorCode: cCode,
    fabricParts,
    baseProposal: { ...merged },
  };
}

export function diffFromProposal(
  data: SpecData,
  baseProposal: ProposalBase | null | undefined,
): ReadonlyArray<keyof ProposalBase> {
  if (!baseProposal) return [];
  return PROPOSAL_KEYS.filter((key) => data[key] !== baseProposal[key]);
}

export { PROPOSAL_KEYS };
