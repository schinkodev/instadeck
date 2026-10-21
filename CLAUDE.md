# InstaDeck

Brandované pitch decky jako open source MCP server (MIT, npm `instadeck`, `instadeck.app`). Uživatel ve svém Claude popíše firmu a téma a přidá brand assety, výsledkem je animovaná prezentace a PDF. **MCP first**: žádné vlastní UI ani harness.

Jedno jádro, dvě cesty: **hostovaný konektor** `https://instadeck.app/mcp` (výchozí, bez instalace, prezentace jako MCP App přímo v chatu claude.ai a Desktopu, odkaz `/d/<id>`) a **lokální server** `npx -y instadeck` (pro varianta: soubory ve složce, náhledy a měření v Chromiu).

## Specifikace

- [docs/vision/V006-pohybovy-jazyk.md](docs/vision/V006-pohybovy-jazyk.md): pohybový jazyk decku navrhuje model (intenzita, vlastní keyframes, sdílené přechody), hlídají ho měřené principy místo výčtů
- [docs/vision/V005-priklady-brand-a-hranice-zdarma.md](docs/vision/V005-priklady-brand-a-hranice-zdarma.md): golden examples, brandový systém, hranice zdarma a prémie (doplňuje V004)
- [docs/vision/V004-konektor-a-lokalni-server.md](docs/vision/V004-konektor-a-lokalni-server.md): aktuální směr (hostovaný konektor s MCP App jako výchozí, lokální server jako pro varianta)
- [docs/vision/V003-open-source-lokalne.md](docs/vision/V003-open-source-lokalne.md): open source, npm, rozšíření, landing (výchozí cesta překonaná V004)
- [docs/vision/V002-mcp-first.md](docs/vision/V002-mcp-first.md): vrstvy, tools a principy (distribuce překonaná V003)

## Vrstvy (závislosti jen dolů, hlídá ESLint)

```
lib/domain   bloky, layouty, tokeny, brand kit, pohybový jazyk a presety, principy designu, storytellingu a pohybu, golden examples (examples.json)
lib/engine   deterministické: HTML prezentace, validace, měření přetečení a pohybu, PDF, PNG, barvy z loga
lib/state    úložiště decků s revizemi, applyOps (jediná cesta zápisu), assety
lib/tools    tools v MCP tvaru a service
server/      MCP server: stdio (lokálně), HTTP (konektor, Lambda), MCP App
skills/      skill pro Claude Code
site/        statická landing page (instadeck.app)
```

## Pravidla

- **Model rozhoduje o obsahu, struktuře, designu a pohybu. Engine renderuje, měří, validuje a exportuje.** Model nepíše HTML. Skládá slidy z bloků a layoutů a navrhuje pohybový jazyk decku jako data (presety nebo vlastní keyframes, V006).
- **Prezentace, ne video.** Animace běží v prohlížeči (CSS a Web Animations), kroky posouvá řečník.
- **Jediná cesta zápisu** je `applyOps` v `lib/state`.
- **Doménová znalost** patří do `lib/domain`. Popisy tools, resources a skill se z ní generují, nenesou ji natvrdo.
- **Tools drží MCP tvar**: ID v argumentech, žádný stav v procesu, `structuredContent` a textová kopie, `isError` při selhání.
- **Server je obecný MCP podle standardu.** Výstupy musí dávat smysl v jakémkoli klientovi (text, PNG, cesta nebo odkaz).
- **Sebepopis** podle vzoru stavebak.cz: registr schopností `server/capabilities.ts` (`done | partial | planned`), z něj instructions a resource. Nový tool = záznam v registru, jinak test selže.
- **Žádné fallbacky ani heuristiky „pro jistotu“.** Opravuj příčinu.
- **Pravidla vkusu jsou principy, ne výčty.** Model smí všechno, co umí. Hlídá se to, na čem záleží (koherence, čitelnost, pohyb jen když něco nese), měřitelně a s odůvodněním z vnímání. Zúžení „pro jistotu“ nepřidávat.
- **Golden examples** jsou data v `lib/domain/examples.json`, bez assetů a se smyšleným obsahem. Každý musí projít `create_deck` bez chyb a varování. Přidávají se jen přes `npm run example`.
- **Testy přes vitest** u domain, engine, state a tools, bez volání modelu. Po každé fázi typecheck, lint, testy a commit na větev. Do `main` se nepushuje, změny jdou přes pull request (viz Pracovní postup).
- **Všechno jde přes MCP tools a resources.** Žádné vedlejší kanály jen pro náš klient (vzor stavebak). Co model nezná z popisu toolu, instructions nebo resources, neexistuje. Co server nemá, se neslibuje (`planned` v registru).
- **Nic nepublikovat ani nenasazovat bez pokynu:** zveřejnění repa, `npm publish`, GitHub Release, GitHub Pages, DNS, AWS zdroje. Předem říct, co přesně vznikne.
- **Claude spouští server a testy sám**, uživatele nežádá, aby něco spouštěl.

## Pracovní postup

- `main` je chráněná větev. Nikdo do ní nepushuje přímo, vše jde přes **pull request** s zeleným CI (typecheck, lint, testy, kontrola secrets).
- Přispěvatel pracuje ve **forku**, na krátké větvi, a PR otevře do `main` tohoto repa. Šablona PR je v `.github/`. Podrobně `CONTRIBUTING.md` a pro kolegy `docs/ONBOARDING.md`.
- Změny v `.github/`, `lib/domain/examples.json`, `server/capabilities.ts` a `LICENSE` schvaluje vlastník (CODEOWNERS).
- **Do repa nepatří** klíče, tokeny, `.env`, čísla účtů ani názvy produkčních zdrojů. Lokálně hlídá gitleaks (`.githooks/pre-commit`), v CI taky.
- Release (tag `v*`, GitHub Release, npm) dělá jen vlastník, postup je v `docs/RELEASING.md`.

## Texty

- Identifikátory, popisy tools a texty v prezentaci (ovládání) anglicky. Obsah decku v jazyce briefu. Interní dokumentace česky.
- V textech pro uživatele **nikdy slovo „AI“**.
- **Nikdy em dash**, nikde. Čárka, tečka, svislítko nebo přeformulovat. Hlídá `tests/copy-rules.test.ts`.

## Vkus decků (vynucuje doména a validace, ne prompt)

Principy z předchůdce projektu: dvě písma, modulární škála, akcent jen na signál, kognitivní limit kolem 4 položek na slide, hodně bílého místa, žádné dekorativní prvky bez funkce. Pohyb vede pozornost (`lib/domain/principles/motion.ts`): deck deklaruje intenzitu od `still` po `kinetic` a měření hlídá, že jí pohyb odpovídá. Jeden hero pohyb na slide, jeden vstup a přechod nese deck a výjimky jsou vzácné, text po blocích, nikdy po písmenech, vstupy zpomalují do klidu, překmit jen u `kinetic`.

## Vývoj

```bash
npm test             # vitest
npm run typecheck
npm run lint
npm run mcp          # MCP server přes stdio (pro claude mcp add)
```

Připojení v Claude Code (vývoj): `claude mcp add instadeck -- npx tsx /cesta/k/instadeck/server/stdio.ts`. Po publikaci `npx -y instadeck`.
Data: `INSTADECK_HOME` (výchozí `~/InstaDeck`), každý deck je složka. Prohlížeč: nainstalovaný Chrome, Edge nebo Chromium, případně `INSTADECK_CHROME`.

## Provoz hostovaného konektoru

Infrastruktura, deploy a produkční údaje nejsou součástí tohoto repa. Spravuje je vlastník v soukromém repu. Přispěvatel se jich nedotýká a nic nenasazuje ani nepublikuje.

## Verze (ověřeno 2026-10-18)

`@modelcontextprotocol/sdk` 1.32.1, `zod` 4, `vitest` 5, `typescript` 6, Node 22. Před přidáním závislosti ověřit aktuální verzi přes `npm view`.
