/**
 * Character set baked into the subsetted Noto Sans JP fonts that ship with
 * the PDF renderer. Anything *not* in this set will fall back to the renderer's
 * built-in Helvetica (no Japanese support) and look broken — so when the
 * business adds new vocabulary that uses unfamiliar characters, append them
 * to BUSINESS_SPECIFIC and re-run `npm run subset-fonts`.
 *
 * Coverage:
 *   - ASCII printable      U+0020..U+007E       95 chars
 *   - Hiragana             U+3041..U+3096       86 chars
 *   - Katakana             U+30A1..U+30FF       95 chars (incl. choon "ー")
 *   - Half/Full-width punctuation that shows up on the spec sheet
 *   - Joyo Kanji 2136     (via the `joyo-kanji` npm package)
 *   - Business-specific extras (current spec sheet vocabulary)
 *
 * Total: ~2400 chars; subset WOFF ends up ~250-350KB per weight.
 */
import joyoKanji from 'joyo-kanji';

function range(start: number, end: number): string {
  let out = '';
  for (let cp = start; cp <= end; cp++) out += String.fromCodePoint(cp);
  return out;
}

const ASCII = range(0x20, 0x7e);
const HIRAGANA = range(0x3041, 0x3096);
const KATAKANA = range(0x30a1, 0x30ff);

// Punctuation / symbols actually used on the printed sheet:
//   - JIS punctuation (、。「」『』・)
//   - Fullwidth digits (０-９)
//   - Math / unit symbols (×÷±√°℃℉%)
//   - Geometric / arrow markers (○●◎△▲□■☆★※→←↑↓⇒⇐⇑⇓〜ー)
//   - Brackets / parens (（）【】〈〉《》)
//   - Currency / misc (¥￥＄＃＆＠＊／＼＿)
const SYMBOLS_FULLWIDTH =
  '！？　、。「」『』・〔〕（）【】〈〉《》〔〕［］｛｝＜＞〜ー' +
  '＠＃＄％＆＊／＼＿＋－＝：；，．' +
  '￥￡＄＃＆' +
  '×÷±√°℃℉§¶†‡№' +
  '○●◎△▲▽▼□■◇◆☆★※' +
  '→←↑↓⇒⇐⇑⇓' +
  '①②③④⑤⑥⑦⑧⑨⑩' +
  '０１２３４５６７８９';

// Business-specific extras: characters that show up in our master JSON, sample
// metadata, and existing real-world spec PDFs but might not be in the joyo
// kanji set. Drawn from src/data/spec/putter-cover.json + src/data/samples.json
// + the existing 7 reference PDFs. Append here when a new vocabulary surfaces.
const BUSINESS_SPECIFIC =
  // master labels (parameters / options / NG messages)
  '柔ら羊毛絨綿弾性裏面表面糸番裁断縫合編込補強磁石装飾繊維' +
  // colors / hardware / closure
  '橙桜紫菫薔薇珊瑚琥珀芥菖蒲茜黛瑪瑙' +
  // embroidery + thread types
  '畳銀杏鎖縫斜縞綾織梳毛' +
  // common product / brand parts that appear in samples
  '帝國貴族殿様御侍商工會社株式合資' +
  // misc safety & arrangement
  '宛先納期備考個本枚組箱袋';

const JOYO_KANJI: string = (joyoKanji as unknown as { kanji: string[] }).kanji.join('');

export const BUSINESS_CHARSET = Array.from(
  new Set(
    (
      ASCII +
      HIRAGANA +
      KATAKANA +
      SYMBOLS_FULLWIDTH +
      JOYO_KANJI +
      BUSINESS_SPECIFIC
    ).split(''),
  ),
).join('');
