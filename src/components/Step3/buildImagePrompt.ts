import type { SpecData, TemplateAngle } from '../../types';
import { specJson } from '../../data/spec';
import { getLabel } from '../../utils/specHelpers';
import { ANGLE_PROMPT_PHRASES } from '../../data/templates/helpers';

const SHAPE_DESC: Record<string, string> = {
  pin: 'a slim blade-style golf putter cover',
  mallet: 'a mallet-style golf putter cover',
  neo_mallet: 'a large neo-mallet golf putter cover',
};

export function buildImagePrompt(
  data: Pick<SpecData,
    'headShape' | 'bodyFabric' | 'bodyColor' | 'embroidery' | 'hardwareFinish' | 'lining' | 'closure' | 'piping'
  >,
  angle?: TemplateAngle,
): string {
  const shape = SHAPE_DESC[data.headShape] ?? 'a golf putter cover';
  const anglePhrase = angle ? ANGLE_PROMPT_PHRASES[angle] : null;

  const fabricEn = getLabel(specJson.parameters.body_fabric, data.bodyFabric, 'en');
  const colorEn = getLabel(specJson.parameters.body_color, data.bodyColor, 'en');
  const embroideryEn = getLabel(specJson.parameters.embroidery, data.embroidery, 'en');
  const hardwareEn = getLabel(specJson.parameters.hardware_finish, data.hardwareFinish, 'en');
  const closureEn = getLabel(specJson.parameters.closure, data.closure, 'en');

  const subject = anglePhrase
    ? `${shape} (${anglePhrase})`
    : shape;
  const phrases: string[] = [
    `Apply realistic surface design to ${subject} silhouette in the input image.`,
    'Strictly preserve the silhouette and outline shape of the input.',
  ];

  if (fabricEn !== '-' && fabricEn) phrases.push(`The body uses ${fabricEn} material.`);
  if (colorEn !== '-' && colorEn) phrases.push(`The dominant body color is ${colorEn}.`);
  if (embroideryEn !== '-' && embroideryEn) phrases.push(`Decoration on the front is ${embroideryEn}.`);
  if (hardwareEn !== '-' && hardwareEn) phrases.push(`Hardware finish is ${hardwareEn}.`);
  if (closureEn !== '-' && closureEn) phrases.push(`Closure type is ${closureEn}.`);

  phrases.push('Studio product photography, pure white background, soft diffused lighting, sharp focus, high resolution.');

  return phrases.join(' ');
}
