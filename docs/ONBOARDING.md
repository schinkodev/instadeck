# Onboarding: jak se podílet na InstaDecku

Pro kolegy, kteří se učí vibecoding. Claude Code ti pomůže se vším, co je tady popsané. Stačí mu říct, co chceš.

## Jak to funguje

- Do `main` pushuje jen vlastník repa. Ty pracuješ ve **forku** (vlastní kopie repa) a změny posíláš jako **pull request** (PR). Vlastník ho zkontroluje a sloučí.
- Každý PR musí projít **CI** (typecheck, lint, testy a kontrola secrets). Červené CI znamená, že se ještě nemerguje.
- Nasazení na instadeck.app, publikace na npm a tagy `v*` dělá jen vlastník.

## První nastavení

1. Na GitHubu otevři repo a klikni na **Fork**.
2. Naklonuj svůj fork a nainstaluj závislosti:

   ```bash
   git clone git@github.com:<tvoje-jmeno>/instadeck.git
   cd instadeck
   npm install
   ```

3. Zapni ochranu před commitem klíčů a hesel (jednou):

   ```bash
   brew install gitleaks
   git config core.hooksPath .githooks
   ```

4. Spusť Claude Code ve složce repa. Přečte `CLAUDE.md` a bude se řídit pravidly projektu.

## Každá změna

1. Řekni Claude, co chceš udělat. Pro novou práci vždy nová větev (`git switch -c nazev-zmeny`).
2. Před PR ať Claude spustí `npm run typecheck`, `npm run lint` a `npm test`. Všechno musí být zelené.
3. Pushni větev do svého forku a otevři PR do `main` původního repa. Vyplň šablonu.
4. Pokud CI nebo review něco vrátí, oprav to ve stejné větvi, PR se aktualizuje.

## Co nedělat

- Nepushuj do původního repa a nespouštěj workflow Deploy ani Release.
- Do repa nepatří klíče, hesla, `.env` ani osobní data. Pokud se to stane, hned řekni vlastníkovi.
- Nic nenasazuj a nepublikuj (AWS, npm, GitHub Pages, DNS). Pokyn k tomu dává jen vlastník.
- Do textů nepiš em dash (dlouhou pomlčku). Hlídá to test.

## Když nevíš

Zeptej se Claude, nebo napiš vlastníkovi. Ptát se je v pořádku.
