# V006: Pohybový jazyk decku, principy místo výčtů

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: pravidlo „model volí motion presety podle názvu“ (V002, CLAUDE.md), doplňuje V005

## Problém

Foundation modely umí v HTML a CSS pohyb, který působí jako práce motion designera: vrstvené vstupy, přelety prvků mezi slidy, vlastní křivky. My jsme jim dali menu o šesti vstupech a pěti přechodech s pevnými parametry a pravidla psaná jako výčty (`distinctEntrances: 2`). Strop byl nízko a pravidla přitom nic podstatného nezaručovala.

Cílem InstaDecku je vytěžit prompt space modelu: model smí všechno, co umí, my dodáme jasný cíl, měření a golden examples, které ho dostanou do nejlepší oblasti. To, že jsme wrapper, nevadí (Hyperframes je taky wrapper).

## Design

**Pohybový jazyk navrhuje model pro každý deck**, tak jako typovou škálu:

- `intensity`: `still | subtle | expressive | kinetic`. Nulový pohyb (`still`) je plnohodnotná volba pro minimalistické profesionální decky, ne absence designu.
- `rationale`: proč tento jazyk sedí publiku. Ověřit to nejde, ale formulace sama zvedá kvalitu.
- `vocabulary`: vlastní pojmenované vstupy a přechody jako keyframes Web Animations (opacity, transform, filter, clip-path), s trváním a křivkou (pojmenovanou, `cubic-bezier()` nebo `linear()`). Konec animace je vždy klidový stav slidu, takže koncový stav, tisk a PDF platí dál.
- Přechod může mít `shared`: stejné prvky (nadpis, logo, obrázek) na sousedních slidech přeletí z místa na místo (magic move).
- Slide může přepsat vstup celého slidu nebo jednotlivých zón. Výjimky jsou pro klíčové momenty.
- Presety (`rise`, `fade`, `slide`, `morph`...) jsou zapsané ve stejném formátu. Model je vidí celé a může z nich vyjít.

**Hlídáme výsledek, ne vstup.** Pravidla stojí na tom, jak funguje vnímání (`lib/domain/principles/motion.ts`), a měří se:

- staticky (bez prohlížeče): čas do čitelnosti slidu, trvání pod prahem vnímání nebo nad prahem čekání, koherence (výjimky jsou vzácné), `still` bez hero pohybů, sdílený přechod bez sdílených prvků, neznámé názvy,
- v prohlížeči (vzorkování animace na sondě): energie pohybu (dráha, měřítko, rozmazání, rotace) proti deklarované intenzitě, překmit (bounce) mimo `kinetic`, vstup, který do klidu zrychluje místo zpomalení.

Měření v prohlížeči běží lokálně v Chromiu a hostovaně v MCP App u uživatele, stejně jako měření přetečení textu. Na serveru žádný prohlížeč. Odkaz otevřený mimo chat nikdo neměří, to je v pořádku.

**Golden examples pokrývají prostor stylů**, ne jen pitch beaty: od `still` (board update) po `kinetic` (spotřebitelský launch s vlastním slovníkem a sdílenými přechody). Každý vysvětluje, proč pohyb je nebo chybí.

## Bezpečnost

Model nepíše HTML ani JS. Keyframes jsou data s whitelistem vlastností a hodnotami bez `url(`, předávají se jako JSON do Web Animations. Odkaz `/d/<id>` na `instadeck.app` tak nemůže nést cizí skript.

## Otevřené

- Blok `scene`: volné SVG nebo canvas v sandboxovaném iframe na oddělené doméně pro jeden výjimečný vizuál. Zatím ne, nejdřív zjistit, kolik z toho pokryjí keyframes.
- Stejný přístup (měřené invarianty místo výčtů) pro layout: mřížka, bílé místo, zarovnání.
- Export do MP4 z deklarativní timeline v lokální variantě.
