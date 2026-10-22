/** Escaping and inline highlights ==word==. */

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const NBSP = "\u00a0";
/** Languages where a one letter preposition or conjunction must not stay at the end of a line (Czech and Slovak typesetting). */
const ONE_LETTER = new Set(["cs", "sk"]);

/**
 * Typesetting by language: non-breaking spaces where a line break would split one value.
 *   thousands groups (14 000), a number and a unit or currency (87 Kč, 45 %, 7 800 USD), a currency and a number (EUR 690M),
 *   in Czech and Slovak one letter prepositions and conjunctions (v Praze, k ceně, a tak).
 */
export function typeset(s: string, lang: string): string {
  let t = s
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NBSP}`)
    .replace(/(\d) (?=(?:%|‰|[A-Z]{3}\b|Kč|Sk|mil\.|mld\.|tis\.|[€$£]))/g, `$1${NBSP}`)
    .replace(/(\b[A-Z]{3}|[€$£]) (?=\d)/g, `$1${NBSP}`);
  if (ONE_LETTER.has(lang.slice(0, 2).toLowerCase())) t = t.replace(/(^|[\s(„"])([ksvzouaiKSVZOUAI]) /g, `$1$2${NBSP}`);
  return t;
}

/** Text with ==highlights== to HTML, typeset by the deck language. An unclosed == is printed literally. */
export function inline(raw: string, lang = ""): string {
  const s = lang ? typeset(raw, lang) : raw;
  return s
    .split(/(==[^=]+==)/g)
    .map((part) => (/^==[^=]+==$/.test(part) ? `<em class="hl">${esc(part.slice(2, -2))}</em>` : esc(part)))
    .join("");
}

/** Plain text without highlight marks (for lengths and alt texts). */
export function plain(s: string): string {
  return s.replace(/==([^=]+)==/g, "$1");
}

export function formatNumber(value: number, decimals: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
