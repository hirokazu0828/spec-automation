import { Font } from '@react-pdf/renderer';

/**
 * Registers Noto Sans JP (Regular + Bold) once for the entire PDF subsystem.
 *
 * The WOFF files live under `/public/fonts/` (copied from
 * `@fontsource/noto-sans-jp` during `npm install` via `scripts/download-fonts.ts`).
 * If the postinstall failed, the registration call below silently no-ops at
 * render time and @react-pdf/renderer falls back to its built-in Helvetica
 * (Latin only) — visually obvious so we know to re-run `npm run download:fonts`.
 *
 * Idempotent: importing this module multiple times only registers once thanks
 * to a module-level guard.
 */
let registered = false;

export const FONT_FAMILY = 'NotoSansJP';

export function ensureFontsRegistered(): void {
  if (registered) return;
  registered = true;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: '/fonts/NotoSansJP-Regular.woff', fontWeight: 'normal' },
      { src: '/fonts/NotoSansJP-Bold.woff', fontWeight: 'bold' },
    ],
  });
  // Disable react-pdf's hyphenation, which mangles Japanese.
  Font.registerHyphenationCallback((word) => [word]);
}
