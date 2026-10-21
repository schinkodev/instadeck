# V003: Open source, lokální MCP, žádný hosting

> Status: superseded (V004: hostovaný konektor jako výchozí, lokální server jako pro varianta. Open source, npm, rozšíření a landing platí)
> Type: vision
> Date: 2026-10-20
> Supersedes: V002-mcp-first.md (vrstvy, tools a principy z V002 platí dál, mění se distribuce a ukládání)

## Problém

V002 počítala s pozdějším hostováním (HTTP MCP, AWS). InstaDeck ale potřebuje Chromium (měření přetečení, náhledy pro model, PDF) a výstupem jsou soubory, které uživatel chce mít u sebe. Hostování by znamenalo kontejner s Chromiem, přenos výstupů a stav u nás. Lokální MCP to celé nepotřebuje.

## Design

- **Open source pod MIT**, repo `schinkodev/instadeck`, balíček `instadeck` na npm. Doména `instadeck.app` pro landing page.
- **Lokální MCP server na stroji uživatele** (stdio), stejný vzor jako Playwright MCP:
  - Claude Code: `claude mcp add instadeck -- npx -y instadeck`
  - Claude Desktop: rozšíření `instadeck.mcpb` (MCP Bundle, Node je součástí Claude Desktop), při instalaci si uživatel vybere složku pro decky
- **Pro nás nulové provozní náklady.** Žádný server, žádný stav u nás, veškerou práci s obsahem dělá model uživatele. Platí se jen doména.
- **Chromium uživatele.** `puppeteer-core` s nainstalovaným Chrome, Edge nebo Chromiem (nebo cestou v `INSTADECK_CHROME`). Žádné stahování 150 MB prohlížeče při instalaci.
- **Výstupy jsou soubory, které uživatel vidí:**

```
~/InstaDeck/                       INSTADECK_HOME, v Claude Desktop vybraná složka
  northwind-seed-pitch/            jedna složka = jeden deck, ID decku = název složky
    deck.html                      prezentace s animacemi, jde i vytisknout do PDF
    deck.pdf                       po export_deck
    deck.json                      zdroj pravdy (slidy, design, pohyb)
    .revisions/<n>.json            historie
  .assets/  .brand-kits/           sdílené mezi decky
```

- **PDF i bez serveru:** prezentace má tiskové CSS, tisk z prohlížeče (Cmd+P, Uložit jako PDF) dá stejné PDF jako `export_deck`.
- **Landing page** statická na `instadeck.app` (GitHub Pages): živý ukázkový deck přímo na stránce, instalace jedním řádkem, tlačítko pro Claude Desktop.
- **Později, podle zájmu:** `share_deck` jako jediná hostovaná část (nahrání hotového HTML do hostovaného úložiště, malá bezstavová služba bez Chromia). Desktop appka, která instaluje a propaguje stejný MCP.

### Pravidla převzatá ze stavebaku

- Všechno, co klient dělá, jde přes MCP tools a resources. Desktop appka nebo landing volají stejné tools jako model.
- Funkce, kterou model nezná z popisu toolu, `instructions` nebo resources, v praxi neexistuje.
- Co server nemá, se neslibuje. Plánované věci jsou v `server/capabilities.ts` jako `planned`.

## Implementation

1. **Balíček:** esbuild bundle `dist/instadeck.js` s `bin`, `files`, licence MIT, `puppeteer-core` a hledání prohlížeče, složky decků podle názvu, tisk do PDF v prezentaci.
2. **Claude Desktop:** `manifest.json` (MCPB 0.3), `npm run bundle` vyrobí `instadeck.mcpb`.
3. **Landing page:** `site/`, generovaná skriptem včetně ukázkového decku, workflow pro GitHub Pages (spuštění a DNS jen na pokyn).
4. **Publikace na pokyn:** zveřejnění repa, `npm publish`, GitHub Release s `.mcpb`, DNS `instadeck.app` na GitHub Pages.

## Acceptance Criteria

- [x] `npm pack` dá balíček, který po instalaci do prázdné složky spustí MCP server přes `npx instadeck`
- [x] Server najde nainstalovaný Chrome, bez prohlížeče skončí srozumitelnou chybou s návodem
- [x] Deck je složka s `deck.html`, `deck.json` a historií, ID decku je název složky
- [x] Tisk prezentace z prohlížeče dá jednu stránku na slide se všemi kroky odkrytými (test v Chromiu, Safari ručně)
- [x] `instadeck.mcpb` projde validací `mcpb` a obsahuje výběr složky pro decky
- [x] Landing page funguje lokálně se živým ukázkovým deckem, bez slova „AI“ a bez em dashe
- [x] Nic se nepublikuje ani nenasazuje bez pokynu

## Stav 2026-10-20

Hotovo a ověřeno lokálně: balíček (`npm run build`, `scripts/smoke-pack.mjs` v CI), rozšíření (`npm run bundle`, rozbalený bundle spuštěný jako v Claude Desktop vytvoří deck i PDF), landing (`npm run site`, desktop i mobil bez vodorovného posunu), autoplay ukázkového decku (`?autoplay=4200`).

Tisk z prohlížeče ověřuje test v Chromiu (stránka na slide, odkryté kroky). Safari ověřit ručně.

Publikace čeká na pokyn:
1. Zveřejnit repo `schinkodev/instadeck` (teď soukromé).
2. První `npm publish` ručně z účtu vlastníka, potom na npmjs.com nastavit `release.yml` jako trusted publisher. Další verze vydá tag `vX.Y.Z`.
3. GitHub Pages: zapnout (zdroj GitHub Actions), spustit workflow `Landing page`, v DNS `instadeck.app` nastavit záznamy na GitHub Pages (A na 185.199.108.153 až .111.153, případně AAAA) a zapnout HTTPS.

