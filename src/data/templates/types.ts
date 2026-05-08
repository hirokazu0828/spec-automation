/**
 * Template catalog type definitions (Layer 3a).
 *
 * `catalog.json` is the source of truth for product templates: line-art
 * silhouettes (one PNG per angle), part code labels, default dimensions, and
 * the sample numbers from the SampleBook that exemplify each template.
 *
 * Keep these types narrow on purpose — `category` / `subType` / `id` are
 * deliberately raw `string` rather than literal unions so adding a new
 * template only touches `catalog.json` (no TypeScript change required).
 */
export type TemplateAngle = 'front' | 'side_toe' | 'back' | 'side_heel';
export type TemplatePartCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type TemplatePart = {
  code: TemplatePartCode;
  name: string;
  description: string;
};

export type TemplateLineArtStatus = 'complete' | 'pending_lineart';
export type TemplateLogoTreatment = 'placeholder' | 'preserved' | 'removed';

/**
 * Map of angle → public path of the line-art PNG. Partial because templates
 * with `lineArtStatus: 'pending_lineart'` ship empty `{}` until Phase B fills
 * them in.
 */
export type TemplateBaseImages = Partial<Record<TemplateAngle, string>>;

export type TemplateDimensions = {
  length: number;
  width: number;
  depth: number;
  unit: 'mm';
  noted?: string;
};

export type TemplateRecommendedDefaults = {
  bodyFabric?: string;
  lining?: string;
  closure?: string;
};

export type TemplateMetadata = {
  source: string | null;
  createdBy: string;
  createdAt: string | null;
  lineArtStatus: TemplateLineArtStatus;
  logoTreatment?: TemplateLogoTreatment;
  notes?: string;
};

/**
 * Layer 3b: per-angle English phrase the image-generation prompt appends to
 * tell gpt-image-1 which view the line-art represents. Optional because
 * `helpers.getAnglePromptPhrase` falls back to the global `ANGLE_PROMPT_PHRASES`
 * default when a template doesn't override the phrase. Kept on the catalog
 * entry (rather than a single global map) so a future category — e.g. a head
 * cover with a `top` angle — can ship its own English phrasing without
 * polluting the putter wording.
 */
export type TemplateAnglePromptPhrases = Partial<Record<TemplateAngle, string>>;

export type TemplateEntry = {
  id: string;
  category: string;
  subType: string;
  displayName: string;
  displayNameEn?: string;
  aliases: string[];
  /**
   * Layer 3b: noun phrase that names the silhouette in image-generation
   * prompts. Substituted into "Apply realistic surface design to <X>
   * silhouette ...". Distinct from `displayNameEn` (UI heading) so the
   * UI label and the prompt-tuned wording can evolve independently.
   * Optional — `buildImagePrompt` falls back to a generic phrase.
   */
  promptShapeDescription?: string;
  /** See `TemplateAnglePromptPhrases`. */
  anglePromptPhrases?: TemplateAnglePromptPhrases;
  baseImages: TemplateBaseImages;
  defaultDimensions: TemplateDimensions;
  parts: TemplatePart[];
  recommendedDefaults?: TemplateRecommendedDefaults;
  sampleReferences: string[];
  metadata: TemplateMetadata;
};

export type TemplateCatalog = {
  version: string;
  templates: TemplateEntry[];
};

/**
 * Ordered list of all known angles. UI components iterate this so adding a
 * new angle only requires extending `TemplateAngle` and the corresponding
 * label maps below.
 */
export const ALL_ANGLES: ReadonlyArray<TemplateAngle> = [
  'front',
  'side_toe',
  'back',
  'side_heel',
];
