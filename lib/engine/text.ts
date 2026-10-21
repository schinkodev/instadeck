/** Escapování a inline zvýraznění ==slovo==. */

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Text s ==zvýrazněním== do HTML. Neuzavřené == se vypíše doslova. */
export function inline(s: string): string {
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
