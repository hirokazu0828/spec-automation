import type { SpecData, TemplateAngle } from '../../types';
import { specJson } from '../../data/spec';
import { getLabel } from '../../utils/specHelpers';
import {
  getAnglePromptPhrase,
  getPositionPromptPhrase,
  getTemplateById,
  getTemplateByHeadShape,
  NEGATIVE_PROMPT_PHRASE,
} from '../../data/templates/helpers';

const FALLBACK_SHAPE_DESCRIPTION = 'a golf putter cover';

/**
 * Layer 3b: prompt assembly for gpt-image-1's edit endpoint.
 *
 * Pulls shape phrasing from the template catalog (Layer 3a's
 * `promptShapeDescription`), per-template angle phrase, master JSON English
 * labels for body fabric / color / embroidery / hardware / closure / lining,
 * and a `position`-driven sentence about material feel and ornament density.
 * Closes with a "studio product photography" line and a negative-style guard
 * (gpt-image-1's API has no `negative_prompt` field, so the guard rides on
 * the positive prompt).
 *
 * Both `angle` and `position` are optional and OVERRIDE the matching field
 * on `data` when provided — this lets Step3 pass its UI-state
 * `activeAngle` (which can differ from `data.selectedAngle` during transient
 * picks) and lets tests force a specific position without rebuilding the
 * whole `data` object. When omitted, `data.selectedAngle` / `data.position`
 * are used.
 */
export function buildImagePrompt(
  data: Pick<SpecData,
    | 'headShape'
    | 'bodyFabric'
    | 'bodyColor'
    | 'embroidery'
    | 'hardwareFinish'
    | 'lining'
    | 'closure'
    | 'piping'
    | 'templateId'
    | 'position'
    | 'selectedAngle'
  >,
  angle?: TemplateAngle,
  position?: string,
): string {
  const template = data.templateId
    ? getTemplateById(data.templateId)
    : getTemplateByHeadShape(data.headShape);

  const shape = template?.promptShapeDescription ?? FALLBACK_SHAPE_DESCRIPTION;

  const activeAngle = angle ?? data.selectedAngle;
  const anglePhrase = activeAngle
    ? getAnglePromptPhrase(template?.id, activeAngle)
    : null;

  const fabricEn = getLabel(specJson.parameters.body_fabric, data.bodyFabric, 'en');
  const colorEn = getLabel(specJson.parameters.body_color, data.bodyColor, 'en');
  const embroideryEn = getLabel(specJson.parameters.embroidery, data.embroidery, 'en');
  const hardwareEn = getLabel(specJson.parameters.hardware_finish, data.hardwareFinish, 'en');
  const closureEn = getLabel(specJson.parameters.closure, data.closure, 'en');
  const liningEn = getLabel(specJson.parameters.lining, data.lining, 'en');

  const subject = anglePhrase ? `${shape} (${anglePhrase})` : shape;
  const phrases: string[] = [
    `Apply realistic surface design to ${subject} silhouette in the input image.`,
    'Strictly preserve the silhouette and outline shape of the input.',
  ];

  if (fabricEn !== '-' && fabricEn) phrases.push(`The body uses ${fabricEn} material.`);
  if (colorEn !== '-' && colorEn) phrases.push(`The dominant body color is ${colorEn}.`);
  if (embroideryEn !== '-' && embroideryEn) phrases.push(`Decoration on the front is ${embroideryEn}.`);
  if (hardwareEn !== '-' && hardwareEn) phrases.push(`Hardware finish is ${hardwareEn}.`);
  if (closureEn !== '-' && closureEn) phrases.push(`Closure type is ${closureEn}.`);
  if (liningEn !== '-' && liningEn) phrases.push(`Lining material is ${liningEn}.`);

  const positionPhrase = getPositionPromptPhrase(position ?? data.position);
  if (positionPhrase) phrases.push(positionPhrase);

  phrases.push(
    'Studio product photography, pure white background, soft diffused lighting, sharp focus, high resolution.',
  );
  phrases.push(NEGATIVE_PROMPT_PHRASE);

  return phrases.join(' ');
}
