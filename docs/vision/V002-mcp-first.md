# V002: MCP first, prezentace jako samostatné HTML

> Status: superseded (V003-open-source-lokalne.md: vrstvy, tools a principy platí, mění se distribuce a ukládání)
> Type: vision
> Date: 2026-10-18
> Supersedes: V001-architektura.md

## Problém

V001 počítala s vlastním UI (dashboard, chat, viewer), vlastním harnessem, kredity a MP4 přes Remotion. To je hodně práce, která neprodává hlavní hodnotu. Ta hodnota je doménová znalost tvorby špičkových brandovaných pitch decků. Uživatel ji chce použít v harnessu, který už má (Claude Code, Claude Desktop, claude.ai).

## Design

```
lib/domain   znalost: bloky, layouty, tokeny, brand kit, motion presety, principy, pitch příběh
lib/engine   deterministické: kompilace decku do samostatného HTML, validace, PDF, PNG, brand barvy
lib/state    lokální úložiště decků s revizemi, applyOps (jediná cesta zápisu), assety
lib/tools    tools v MCP tvaru (definice nezávislá na transportu) a service
server/      MCP server: stdio (lokálně), později Streamable HTTP (hostovaně)
skills/      skill pro Claude Code: formát, postup, vkus
```

Závislosti jen dolů, hlídá ESLint.

### Principy

1. **Model rozhoduje o obsahu, struktuře a designu. Engine renderuje, validuje a exportuje.** Model skládá slidy z bloků a layoutů a volí tokeny a motion presety podle názvu. HTML generuje engine. Proto je každý deck brandově konzistentní, validovatelný a animovaný bez práce modelu.
2. **Výstup je jeden samostatný HTML soubor.** Prezentace s animacemi (vstupy slidů, postupné odkrývání na kliknutí, animovaná čísla a grafy, přechody), ovládání klávesami, celá obrazovka, poznámky řečníka. Funguje offline, kromě webových fontů. Statická varianta téhož souboru (všechny kroky odkryté, bez animací) je podklad pro PDF a PNG.
3. **Prezentace, ne video.** Čas se neposouvá sám, kroky posouvá řečník. Animace běží v prohlížeči přes CSS a Web Animations. Bez Remotionu a bez renderu videa.
4. **MCP je hlavní rozhraní.** Server je obecný MCP podle standardu, nepředpokládá našeho klienta. Výstupy mají textovou podobu, PNG náhledy a cestu k HTML souboru (lokálně), později odkaz (hostovaně).
5. **Žádné vlastní UI ani harness.** Hostovaná část později bude jen statické sdílení HTML a HTTP MCP.

### Inspirace HyperFrames

HyperFrames (HeyGen, Apache 2.0) dělá z HTML video pro agenty. Přebíráme: HTML jako výstupní formát, timing v `data-` atributech, deterministický výstup, skill pro agenty a neinteraktivní ovládání. Nepřebíráme: agent píše HTML sám. U nás HTML píše engine, protože hodnota je v doméně.

### Datový model (zkráceně)

- `Deck`: id, title, brief (company, topic, audience, goal, language), design (parametry tokenů), brandKitId, slides, revision
- `Slide`: id (stabilní), layout, intent (co slide sděluje), blocks podle zón layoutu, motion (entrance, transition, stagger, kroky), notes
- `Block`: diskriminovaná unie (heading, text, bullets, stat, stats, chart, image, logo, quote, timeline, team, comparison, cards, table, cta), každý s limity obsahu
- `Op`: add_slide, update_slide, remove_slide, move_slide, set_design, apply_brand, set_title
- `BrandKit`: logo assety, barvy, fonty (Google Fonts nebo nahraný soubor), tón

### MCP tools

| Tool | Co dělá |
|---|---|
| `get_design_guide` | Katalog bloků, layoutů, motion presetů a principy pro daný brief |
| `create_brand_kit`, `get_brand_kit`, `list_brand_kits` | Brand kit z assetů a hodnot od modelu |
| `add_asset` | Přidá logo, font nebo obrázek ze souboru (lokální cesta) nebo base64 |
| `extract_brand_colors` | Deterministická paleta z loga (SVG i rastr) |
| `create_deck` | Založí deck z briefu, volitelně rovnou se slidy |
| `get_deck`, `list_decks` | Čtení |
| `apply_ops` | Jediný zápis, `expected_revision`, vrací nálezy validace a cestu k HTML |
| `validate_deck` | Validace: schéma, kontrast, limity obsahu, rozpočet pohybu, overflow (měřený v prohlížeči) |
| `render_preview` | PNG vybraných slidů |
| `export_deck` | `html` nebo `pdf`, vrací cestu |
| `get_history`, `revert_deck` | Revize |
| `delete_deck` | Smaže deck, `destructiveHint`, vyžaduje `confirm: true` |

Resources: `instadeck://guide`, `instadeck://blocks`, `instadeck://layouts`, `instadeck://motion`, `instadeck://principles/design`, `instadeck://principles/storytelling`, `instadeck://pitch`, `instadeck://capabilities`, `instadeck://deck/{id}`. Prompt: `create_pitch_deck`. Instructions a capabilities podle vzoru stavebak.cz (registr `done | partial | planned`, test hlídá shodu).

### Úložiště

Lokálně `INSTADECK_HOME` (výchozí `~/.instadeck`): `decks/<id>.json` s historií revizí, `brand-kits/`, `assets/`, `out/<id>/deck.html`. Hostované úložiště až ve fázi 6.

## Implementation

Fáze, po každé typecheck, lint, testy, commit a push:

1. ~~Kostra~~ hotovo, Next.js odstraněn (čistý TypeScript balíček, `tsx`, vitest, ESLint, CI).
2. ~~**domain**~~ hotovo: schémata, katalog bloků, 20 a více layoutů, tokeny s odvozením, motion presety, brand kit pravidla, principy designu a storytellingu (převzaté ze slyde-saas), pitch příběh.
3. ~~**engine**~~ hotovo: kompilace do HTML s runtime prezentace, statický režim, validace (čisté pravidla i měření v prohlížeči), PDF a PNG přes Chromium, extrakce barev.
4. ~~**state**~~ hotovo: `JsonFileStore`, `applyOps` s revizemi a atomicitou, historie a revert, assety.
5. ~~**MCP (stdio)**~~ hotovo, čeká na ruční ověření v Claude Code a Desktop: tools, resources, prompt, instructions, capabilities, skill. Ověření v Claude Code a Claude Desktop.
6. Později, jen se souhlasem: hostovaný HTTP MCP s API klíči, sdílené odkazy (statický hosting HTML), placení za hosting.

## Acceptance Criteria

- [x] Z jednoho volání `create_deck` se slidy vznikne samostatné `deck.html`, které se otevře v prohlížeči a přehraje s animacemi
- [x] PDF má vybratelný text a odpovídá statickému HTML
- [x] Validace najde přetečení textu, nízký kontrast a překročený rozpočet pohybu (testy)
- [x] `apply_ops` s nesouhlasnou revizí selže a nic nezapíše
- [x] Testy kontraktu MCP: každý tool v registru schopností, `isError` při selhání, `destructiveHint` u mazání
- [ ] Ruční ověření v Claude Code: z popisu firmy a loga vznikne deck
- [x] Žádný test nevolá model, v textech pro uživatele není „AI“ ani em dash
