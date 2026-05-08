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
 * Default English angle phrase that the image-generation prompt appends so
 * gpt-image-1 understands which view the line-art represents. Used as a
 * fallback when a catalog entry omits `anglePromptPhrases` for a given angle.
 *
 * Layer 3b moved per-template overrides into `catalog.json`
 * (`templates[].anglePromptPhrases`) so a future category (e.g. a head cover
 * with a `top` angle) can ship its own English phrasing without polluting the
 * putter wording. `getAnglePromptPhrase` resolves catalog → fallback in that
 * order.
 */
export const ANGLE_PROMPT_PHRASES: Record<TemplateAngle, string> = {
  front: 'front view',
  side_toe: 'toe-side view',
  back: 'back view (opening side)',
  side_heel: 'heel-side view',
};

/**
 * Resolves the English angle phrase for a template, preferring the
 * per-template override in `catalog.json` and falling back to the global
 * `ANGLE_PROMPT_PHRASES` when the template doesn't customise the angle.
 *
 * Accepts an unknown templateId / undefined so callers don't need to guard.
 */
export function getAnglePromptPhrase(
  templateId: string | undefined,
  angle: TemplateAngle,
): string {
  if (templateId) {
    const template = getTemplateById(templateId);
    const override = template?.anglePromptPhrases?.[angle];
    if (override) return override;
  }
  return ANGLE_PROMPT_PHRASES[angle];
}

/**
 * Layer 3b: brand-position prompt phrases. Keys mirror the master
 * `parameters.position.options[].value` (`luxury` / `standard` / `casual`),
 * which Step1 already constrains via radio buttons (see `Step1.tsx:195-228`).
 *
 * Translation rules — none of these phrases reference price tier or use the
 * literal words "luxury" / "premium": such words push gpt-image-1 to invent
 * extra brand marks. We translate the position into material feel, color
 * palette, and ornament density instead.
 */
export const POSITION_PROMPT_PHRASES: Record<'luxury' | 'standard' | 'casual', string> = {
  luxury:
    'Refined matte surface with subtle tonal contrast, restrained small logo placement, precise fine stitching, and a quiet harmonious color palette suggesting careful craftsmanship.',
  standard:
    'Balanced everyday textile finish with a clearly visible mid-sized brand logo, moderate stitching density, and a versatile two-tone color palette appealing to a broad audience.',
  casual:
    'Energetic sporty surface treatment with bright vivid color blocking, playful contrasting accents, a bold graphic accent, and a relaxed lightweight athletic feel.',
};

/**
 * Returns the position-specific prompt phrase, or null when the position is
 * empty / unknown so `buildImagePrompt` can skip the line cleanly.
 */
export function getPositionPromptPhrase(position: string | undefined): string | null {
  if (!position) return null;
  if (position in POSITION_PROMPT_PHRASES) {
    return POSITION_PROMPT_PHRASES[position as keyof typeof POSITION_PROMPT_PHRASES];
  }
  return null;
}

/**
 * Negative-style guard tacked onto the end of the positive prompt because
 * gpt-image-1's edit/generation endpoints don't accept a `negative_prompt`
 * field. Listed here (rather than inline in `buildImagePrompt`) so the
 * wording can be tuned without touching the prompt assembly logic.
 */
export const NEGATIVE_PROMPT_PHRASE =
  'Avoid text artifacts, plastic glare, or visible seams that break the silhouette.';
