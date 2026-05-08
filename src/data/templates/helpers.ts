import catalogData from './catalog.json';
import { ALL_ANGLES } from './types';
import type {
  TemplateAngle,
  TemplateCatalog,
  TemplateEntry,
} from './types';

export { ALL_ANGLES };

export const catalog: TemplateCatalog = catalogData as TemplateCatalog;

/**
 * Master `head_shape.options[].value` (pin / mallet / neo_mallet) → catalog
 * `subType` (blade / semi_mallet / full_mallet). Codified here because
 * Step1's headShape uses the master vocabulary while the SampleBook + the
 * catalog use the manufacturer-leaning vocabulary.
 *
 * Drift guard: `getTemplateBySubType` resolves the catalog entry, so adding
 * a new shape only requires extending this map and the catalog.
 */
const HEAD_SHAPE_TO_SUB_TYPE: Record<string, string> = {
  pin: 'blade',
  mallet: 'semi_mallet',
  neo_mallet: 'full_mallet',
};

export function getAllTemplates(): TemplateEntry[] {
  return catalog.templates;
}

export function getTemplateById(id: string): TemplateEntry | undefined {
  return catalog.templates.find((t) => t.id === id);
}

/**
 * Looks up a template by the SampleBook / manufacturer vocabulary
 * (`blade` / `semi_mallet` / `full_mallet`). Use `getTemplateByHeadShape`
 * if you have a master `headShape` value (pin / mallet / neo_mallet).
 */
export function getTemplateBySubType(subType: string): TemplateEntry | undefined {
  return catalog.templates.find((t) => t.subType === subType);
}

/**
 * Bridge from Step1's master `headShape` value (pin / mallet / neo_mallet)
 * to the catalog entry. Returns undefined when the headShape is empty or
 * unknown so callers can fall through to a "leave blank" UX.
 */
export function getTemplateByHeadShape(headShape: string): TemplateEntry | undefined {
  if (!headShape) return undefined;
  const subType = HEAD_SHAPE_TO_SUB_TYPE[headShape];
  if (!subType) return undefined;
  return getTemplateBySubType(subType);
}

export function getTemplatesByCategory(category: string): TemplateEntry[] {
  return catalog.templates.filter((t) => t.category === category);
}

/** Templates whose line-art is finished and safe to use in the wizard. */
export function getCompleteTemplates(): TemplateEntry[] {
  return catalog.templates.filter((t) => t.metadata.lineArtStatus === 'complete');
}

export function hasAngle(template: TemplateEntry, angle: TemplateAngle): boolean {
  return Boolean(template.baseImages[angle]);
}

/**
 * Angles whose PNG path is registered for this template. Empty array for
 * pending_lineart entries; the UI surfaces a "preparing line-art" banner
 * in that case.
 */
export function getAvailableAngles(template: TemplateEntry): TemplateAngle[] {
  return ALL_ANGLES.filter((a) => hasAngle(template, a));
}

export const ANGLE_DISPLAY_NAMES: Record<TemplateAngle, string> = {
  front: '正面（表側）',
  side_toe: '側面（トウ側）',
  back: '後面（開口部）',
  side_heel: '側面（ヒール側）',
};

/**
 * English angle phrase that the image-generation prompt appends so gpt-image-1
 * understands which view the line-art represents. Keep these short and
 * unambiguous; the prompt already specifies "studio product photography".
 */
export const ANGLE_PROMPT_PHRASES: Record<TemplateAngle, string> = {
  front: 'front view',
  side_toe: 'toe-side view',
  back: 'back view (opening side)',
  side_heel: 'heel-side view',
};
