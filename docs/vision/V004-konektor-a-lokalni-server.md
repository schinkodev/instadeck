# V004: Hostovaný konektor jako výchozí, lokální server jako pro varianta

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: V003-open-source-lokalne.md (open source, MIT, npm, rozšíření a landing platí dál, mění se výchozí cesta)

## Problém

V003 je jen lokální: nefunguje v claude.ai, kde je většina uživatelů konektorů, a vyžaduje Node, Chrome a terminál. claude.ai přitom umí vlastní konektory na všech plánech (Free jeden), bez přihlášení, a od ledna 2026 MCP Apps: tool vrátí HTML, které Claude vykreslí přímo v konverzaci, i přes celou obrazovku.

## Design

Jeden produkt, jedno jádro (domain, engine, validace, tools), dvě cesty připojení:

| | Hostovaný konektor (výchozí) | Lokální server (pro varianta) |
|---|---|---|
| Připojení | `https://instadeck.app/mcp` v claude.ai, Claude Desktop, Claude Code (`--transport http`) | `npx -y instadeck`, rozšíření `.mcpb` |
| Instalace | žádná | Node, Chrome nebo Edge |
| Zobrazení | MCP App v chatu (claude.ai, Desktop), odkaz `instadeck.app/d/<id>` všude | soubor `deck.html` ve složce |
| Kontrola kvality | měření přetečení v prohlížeči uživatele (MCP App), statická validace | statická validace, měření a PNG náhledy v Chromiu |
| Stav | S3, neuhodnutelné ID, expirace 30 dní | složka uživatele, trvale |
| PDF | tisk z `instadeck.app/d/<id>` | `export_deck` nebo tisk |
| Sdílení | odkaz `instadeck.app/d/<id>` | později stejný odkaz (nahrání do hostované části) |

### Hostovaná část

Bezstavová služba nad objektovým úložištěm. MCP běží přes `WebStandardStreamableHTTPServerTransport` (Request a Response), stejný handler lokálně i hostovaně.

- **Bez přihlášení.** Deck, asset a brand kit mají neuhodnutelné ID (capability). Hostovaný server proto nemá `list_decks`, `list_assets`, `list_brand_kits`: nikdo neuvidí cizí data. Lokální server je má.
- **Revize bez databáze:** nová revize se zapíše podmíněně (S3 `If-None-Match: *`, lokálně `link` na existující soubor selže). Druhý souběžný zápis stejné revize skončí konfliktem.
- **Ochrana:** limity četnosti požadavků a velikosti vstupů, expirace dat.
- **Assety v hostované verzi:** `data_base64` (malé logo z claude.ai) nebo `url` (server stáhne obrázek nebo font z veřejné adresy, s limitem velikosti). Nahrání většího souboru přes presigned URL je plánované.

### MCP App

- Resource `ui://instadeck/deck.html` (MIME `text/html;profile=mcp-app`): renderer a player z enginu v jednom HTML, bez CDN.
- Tool, který vytvoří nebo změní deck, odkazuje na resource (`_meta.ui.resourceUri`). Výsledek nese JSON decku a URL assetů (`/a/<id>`), ne celé HTML (limit výsledku v claude.ai asi 150 000 znaků).
- Aplikace deck vykreslí, změří přetečení a nálezy pošle modelu (`updateModelContext`). Tlačítka: přes celou obrazovku (`requestDisplayMode`), otevřít odkaz.
- CSP: `resourceDomains` pro `instadeck.app` (assety) a Google Fonts.
- Claude Code MCP Apps nevykresluje: dostane text s odkazem. Pro plnou kvalitu v Claude Code je lokální server.

## Implementation

1. Engine přenositelný mimo Node: player jako generovaný modul, renderer vrací části (CSS, slidy, konfigurace), player jde připojit a odpojit.
2. Úložiště za rozhraním `Files` (disk, S3), podmíněný zápis revize, režim `local` a `hosted` (ID, výpis, výstupy).
3. HTTP server: `/mcp`, `/d/<id>`, `/a/<id>`, `/health`, lokálně `npm run serve`.
4. MCP App: resource, odkaz z tools, měření v prohlížeči, fullscreen.
5. Build hostovaného balíčku a landing s hlavním tlačítkem pro konektor.

## Acceptance Criteria

- [x] Stejné testy tools běží proti lokálnímu i hostovanému režimu (úložiště na disku, S3 rozhraní přes kontraktní test)
- [x] Souběžné zápisy stejné revize: právě jeden projde
- [x] Hostovaný server nemá výpisy cizích dat, ID jsou neuhodnutelná
- [x] `/d/<id>` vrátí prezentaci, `/a/<id>` asset se správným typem
- [x] MCP App vykreslí deck z výsledku toolu a pošle nálezy měření (test v headless prohlížeči s mock hostitelem)
- [x] Hostovaný balíček běží (scripts/smoke-lambda.mjs volá postavený balíček)
- [x] Lokální server dál projde `scripts/smoke-pack.mjs`

## Stav 2026-10-20

Hotovo a otestované lokálně i v CI: úložiště nad diskem a S3 (S3Mock v CI), hostovaný režim tools, HTTP handler, adaptér Lambdy a balíček (536 kB zip), MCP App (end to end s testovacím hostitelem AppBridge v Chromiu), landing s konektorem jako hlavní cestou.

Velikost MCP App 578 kB (většinou `ext-apps` a jeho závislosti), zmenšit později.
