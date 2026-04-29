import putterCover from './putter-cover.json';
import type { SpecJson } from './types';

export type DomainKey = 'putter-cover';

export const domains: Record<DomainKey, SpecJson> = {
  'putter-cover': putterCover as SpecJson,
};

export const specJson: SpecJson = domains['putter-cover'];

export type { SpecJson, SpecOption, SpecParameter, AutoFillEntry } from './types';
