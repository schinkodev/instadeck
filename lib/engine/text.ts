/** Escapování a inline zvýraznění ==slovo==. */

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const NBSP = "\u00a0";
/** Jazyky, kde jednopísmenná předložka nebo spojka nesmí zůstat na konci řádku (česká a slovenská sazba). */
const ONE_LETTER = new Set(["cs", "sk"]);

/**
 * Sazba podle jazyka: nezlomitelné mezery tam, kde by zalomení rozdělilo jeden údaj.
 *   skupiny tisíců (14 000), číslo a jednotka nebo měna (87 Kč, 45 %, 7 800 USD), měna a číslo (EUR 690M),
 *   v češtině a slovenštině jednopísmenné předložky a spojky (v Praze, k ceně, a tak).
 */
export function typeset(s: string, lang: string): string {
  let t = s
    .replace(/(\d) (?=\d{3}(?!\d))/g, `$1${NBSP}`)
    .replace(/(\d) (?=(?:%|‰|[A-Z]{3}\b|Kč|Sk|mil\.|mld\.|tis\.|[€$£]))/g, `$1${NBSP}`)
    .replace(/(\b[A-Z]{3}|[€$£]) (?=\d)/g, `$1${NBSP}`);
  if (ONE_LETTER.has(lang.slice(0, 2).toLowerCase())) t = t.replace(/(^|[\s(„"])([ksvzouaiKSVZOUAI]) /g, `$1$2${NBSP}`);
  return t;
}

/** Text s ==zvýrazněním== do HTML, se sazbou podle jazyka decku. Neuzavřené == se vypíše doslova. */
export function inline(raw: string, lang = ""): string {
  const s = lang ? typeset(raw, lang) : raw;
  return s
    .split(/(==[^=]+==)/g)
    .map((part) => (/^==[^=]+==$/.test(part) ? `<em class="hl">${esc(part.slice(2, -2))}</em>` : esc(part)))
    .join("");
}

/** Čistý text bez značek zvýraznění (pro délky a alt texty). */
export function plain(s: string): string {
  return s.replace(/==([^=]+)==/g, "$1");
}

export function formatNumber(value: number, decimals: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
