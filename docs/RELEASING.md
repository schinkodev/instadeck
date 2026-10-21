# Vydání na npm a GitHub Release

Jen pro vlastníka. Tag `v*`, GitHub Release a `npm publish` nikdy nedělá přispěvatel ani Claude bez výslovného pokynu.

Jak to funguje: tag `v*` spustí `.github/workflows/release.yml`. Ten ověří verzi, spustí typecheck, testy a kontrolu balíčku, postaví `instadeck.mcpb` pro Claude Desktop, vytvoří GitHub Release a publikuje na npm přes **trusted publishing** (OIDC, bez tokenu v repu). Provenance (ověřitelný původ balíčku) se přidá sama, ale jen když jde o **veřejné repo** a veřejný balíček.

## 1. Předpoklady (jednou)

- Účet na [npmjs.com](https://www.npmjs.com) se zapnutým **2FA**. Ověř `npm whoami` po `npm login`.
- Jméno je volné: `npm view instadeck` musí skončit chybou 404. Pokud je jméno obsazené, balíček se musí přejmenovat dřív, než cokoli publikuješ.
- Repo `schinkodev/instadeck` je **veřejné** (kvůli provenance) a `package.json` má přesně `"repository": { "url": "git+https://github.com/schinkodev/instadeck.git" }`. Trusted publishing tu shodu kontroluje.
- Čistý `main`, zelené CI.

## 2. První verze se publikuje ručně

Dokumentace npm nepopisuje, zda jde nastavit trusted publisher pro balíček, který ještě neexistuje. Počítej proto s tím, že první verze jde ručně a trusted publishing se nastaví až po ní.

```bash
git switch main && git pull
npm ci
npm run typecheck && npm run lint && npm test
node scripts/smoke-pack.mjs      # balíček se nainstaluje do prázdné složky a spustí se přes MCP
npm pack --dry-run               # má obsahovat jen dist, skills, README.md, LICENSE, package.json
npm login
npm publish --access public      # npm si vyžádá kód z 2FA
```

Pravidla pro tuto první verzi (`0.1.0`):

- **Netaguj ji** (`v0.1.0`) a nevytvářej k ní GitHub Release. Tag by spustil `release.yml`, který by marně zkusil publikovat stejnou verzi znovu.
- Ruční publikace nemá provenance. Provenance dostanou až verze z workflow.
- Ověř: `npm view instadeck version` a `npx -y instadeck` (server se spustí a čeká na MCP klienta).

## 3. Nastavení trusted publishing (jednou, po první verzi)

Na npmjs.com: **Packages, instadeck, Settings, Trusted publishing, GitHub Actions**. Vyplň (rozlišují se velká a malá písmena):

| Pole | Hodnota |
|---|---|
| Organization or user | `schinkodev` |
| Repository | `instadeck` |
| Workflow filename | `release.yml` (jen název souboru, ne cesta) |
| Environment name | prázdné |
| Allowed actions | zaškrtni přímé `npm publish` (workflow používá právě to) |

Co je dobré vědět:
- npm konfiguraci při uložení **neověřuje**. Překlep se projeví až chybou `E404` při publikaci.
- Konfigurace musí projít první úspěšnou publikací do 2 dnů, jinak vyprší. Pak ji smaž a vytvoř znovu. Existující konfiguraci nejde upravit.
- Workflow potřebuje oprávnění `id-token: write` (je tam), npm 11.5.1 a novější a Node 22.14 a novější. `release.yml` proto npm aktualizuje, protože Node 22 nese starší.
- GitHub-hosted runnery ano, self-hosted zatím ne.

## 4. Každé další vydání

1. Na větvi `release/0.1.1` zvyš verzi: `npm version 0.1.1 --no-git-tag-version`. Stejné číslo dej do `server.json` (`version` a `packages[0].version`), ať záznam v MCP Registry nezastará. Otevři PR, nech projít CI a sluč.
2. Z čistého `main` vytvoř tag a pushni ho (smíš jen ty, hlídá to ruleset na tagy):

   ```bash
   git switch main && git pull
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. V záložce Actions sleduj běh **Release**. Po zelené:
   - GitHub Release `v0.1.1` s `instadeck.mcpb` a automatickými poznámkami,
   - nová verze na npm s provenance.
4. Ověř: `npm view instadeck version`, `npx -y instadeck@0.1.1` a odkaz na `instadeck.mcpb` v README (`releases/latest`).

Číslování: `0.x` dokud se tools mění, od `1.0.0` se řiď semver (rozbití tools znamená major).

## 5. Když to nejde

| Příznak | Obvyklá příčina |
|---|---|
| `E404` při `npm publish` ve workflow | trusted publisher neodpovídá (vlastník, repo, název workflow, velikost písmen), `repository.url` v `package.json` nesedí, nebo je npm starší než 11.5.1 |
| `Version matches the tag` selhal | verze v `package.json` není stejná jako tag |
| Verze už na npm existuje | verze se nedají přepsat, zvyš číslo a udělej nový tag |
| Release hotový, npm ne | oprav příčinu a vydej další patch verzi. Starý tag nemaž ani nepřesouvej |
| Chybí provenance | repo nebylo veřejné, nebo se publikovalo ručně |

Doporučení po prvním úspěšném běhu: v nastavení balíčku na npmjs.com zvaž zakázání publikace pomocí tokenů, aby šlo publikovat jen přes workflow (zkontroluj nabídku v UI, nevím jistě, jak se položka jmenuje).

## 6. MCP Registry (oficiální katalog MCP serverů)

Registr drží jen metadata (`server.json`), balíček musí být už na npm a jeho `package.json` musí mít `mcpName` shodné s `name` v `server.json`. Publikuje vlastník ručně po vydání na npm:

```bash
brew install mcp-publisher
mcp-publisher login github      # účet vlastníka organizace schinkodev
mcp-publisher validate
mcp-publisher publish
```

Ověř: `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.schinkodev/instadeck"`. Při každé nové verzi zvyš číslo v `server.json` a publikuj znovu.
