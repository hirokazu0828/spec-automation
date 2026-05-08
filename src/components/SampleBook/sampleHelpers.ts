import type { PutterSample } from './types';

function uniqueSortedJa(values: Iterable<string | null | undefined>): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v) set.add(v);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
}

/**
 * Returns the unique closure.type values that actually appear in samples.json,
 * sorted in Japanese locale order. Used to power the SampleBook closure filter
 * dropdown without hardcoding values that may drift from the data.
 */
export function getSampleClosureTypes(samples: ReadonlyArray<PutterSample>): string[] {
  return uniqueSortedJa(samples.map((s) => s.closure?.type));
}

/**
 * Same idea as getSampleClosureTypes, but for decoration.type.
 */
export function getSampleDecorationTypes(samples: ReadonlyArray<PutterSample>): string[] {
  return uniqueSortedJa(samples.map((s) => s.decoration?.type));
}
