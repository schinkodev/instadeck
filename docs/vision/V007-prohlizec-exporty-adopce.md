# V007: Prohlížeč, exporty a cesta k uživatelům

> Status: current
> Type: vision
> Date: 2026-10-21
> Supersedes: nic, doplňuje V004 až V006

## Problém

Hostovaný konektor běží a decky jsou dobré, ale lidé dál dělají prezentace ve svém PowerPointu, Google Slides nebo v artifactu. Bariéry: deck na odkazu je holá prezentace bez přehledu a bez stahování, firmy potřebují PPTX a PDF, úpravy přes chat jsou nepřesné, lokální varianta neumí to, co hostovaná, a repo ani npm balíček nejsou veřejné.

## Zásada

Každé zlepšení patří do jádra (player, `deck.json`, engine), aby ho dostaly všechny cesty najednou: soubor `deck.html` lokálně, odkaz `/d/<id>` i přehrávač v chatu (MCP App). Žádné vlastní UI mimo prezentaci, ovládání je součást playeru.

## Fáze

1. **Prohlížeč v2** (player): ovládací lišta, která se ukáže jen při pohybu myši (předchozí, další, pozice, přehled, poznámky, řečník, celá obrazovka, stáhnout). Přehled jako mřížka živých miniatur (G), režim řečníka ve druhém okně s poznámkami, dalším slidem a časomírou (P). Stáhnout: PDF tiskem z prohlížeče (vektorové, text jde označit) a HTML offline.
2. **Exporty**: PPTX a PDF bez prohlížeče na serveru (viz Rozhodnutí fáze 2).
3. **Stejný zážitek v obou cestách**: MCP App dostane části decku přímo z toolu, takže deck hraje v chatu i lokálně. Výběr slidu v chatu pošle modelu, který slide upravit. Sdílení lokálního decku odkazem jen na výslovný pokyn (`sharing` z planned na done).
4. **Zveřejnění** po fázích 1 a 2: veřejné repo, `npm publish`, GitHub Release, README s ukázkou živého decku. Jen na pokyn, předem popsat, co vznikne.
5. **Růst**: import starého decku (PPTX, PDF), galerie živých příkladů na landing page, OG obrázky a embed, měřené invarianty pro layout, později blok `scene`, MP4 lokálně, samostatný přehrávač jako balíček.

## Rozhodnutí fáze 1

- Ovládání staví player sám (lišta, přehled, okno řečníka), stránky ho jen zapínají volbami `controls`. V chatu bez okna řečníka a bez stahování (sandbox klienta), místo toho tlačítko Open, které otevře odkaz.
- HTML ke stažení je stejný soubor, který stránka načetla (fetch vlastní adresy). Ze souboru na disku se nenabízí, ten už HTML je.
- Tisk ukazuje jen slidy v koncovém stavu, ovládání a přehled se netisknou.

## Rozhodnutí fáze 2: prohlížeč uživatele je layout engine

Hostovaný konektor je jedna malá bezstavová služba bez prohlížeče, a tak to zůstane. Rozložení slidů (mřížky s řádky `auto`, zalomení textu) umí přesně jen prohlížeč, odhad bez něj by byla heuristika.

- **Snímek** (`snapshotInstaDeck` v measure.js): prohlížeč, který deck vykreslil, odečte z vypočtených stylů polohu, velikost a styl každého prvku (text s běhy, plochy, linky, obrázky, místa grafů a tabulek). Lokálně Chromium, hostovaně prohlížeč diváka na odkazu.
- **Skladač** (`lib/engine/pptx.ts`, pptxgenjs, čisté JS): ze snímku a z decku složí PPTX. Text editovatelný, co bylo na jednom řádku, zůstane na jednom řádku, grafy nativní z dat decku, tabulky nativní, poznámky řečníka. Animace ne, písma odkazem (Google Fonts).
- **Hostovaně** bezstavový `POST /d/<id>/deck.pptx` se snímkem a revizí. Snímek ke starší revizi vrátí 409. Balíček hostované části vzrostl z 559 na 707 kB.
- **PDF** tiskem v prohlížeči (vektorové, text jde označit, přesné). Na serveru žádné Chromium.
- **Odloženo:** kdyby bylo potřeba serverové renderování (OG obrázky, PDF jako soubor přímo z chatu, MP4), patří do samostatné funkce volané na vyžádání (kontejner s Chromiem), mimo hlavní cestu konektoru. Nový AWS zdroj, jen na pokyn.

## Rozhodnutí fáze 3: stejný přehrávač v chatu pro obě cesty

- Aplikace v chatu si deck načte toolem `get_deck_view` s viditelností jen pro aplikaci (MCP Apps `visibility: ["app"]`), ne přes HTTP endpoint `/d/<id>/view.json` (zrušen). Je to čisté MCP bez vedlejšího kanálu a funguje stejně s hostovaným konektorem (assety jako URL) i s lokálním serverem v Claude Desktopu (assety jako data URI).
- Úprava slidu z chatu: tlačítko v liště otevře krátký formulář, text jde do chatu zprávou (`ui/message`) s ID decku a slidu. Model slide upraví přes `apply_ops`. Jen když hostitel zprávy podporuje.
- Lokálně tlačítko Open v chatu chybí: soubor `file://` z chatu otevřít nejde. Sdílení lokálního decku odkazem zůstává planned.
