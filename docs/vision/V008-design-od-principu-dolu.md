# V008: Design od principů dolů, guardrails, obrazová vrstva a analytické decky

> Status: proposed
> Type: vision
> Date: 2026-10-21
> Supersedes: nic, doplňuje V005 (brandový systém, příklady) a V006 (pohybový jazyk)

## Problém

Decky jsou korektní, ale podobné. Důvody jsou v kódu vidět:

- Hlavní stylová páka je šest moodů s pevnou dvojicí písem. Dvě značky se stejným moodem se liší jen barvou.
- Golden examples jsou celé decky a instrukce říká „drž strukturu a rytmus příkladu“. Model je klonuje.
- Principy designu (`lib/domain/principles/design.ts`) jsou znalost, kterou model přečte jednou. Vynucuje se jen jejich část (kontrast, délky textu, rytmus layoutů, pohyb). Bílé místo, dominance jednoho prvku a počet různých velikostí písma se neměří.
- Obrazy jsou blok `image` ve čtyřech layoutech a plnoformátový `image-full` s pevným přechodem. Chybí pozadí slidu, jednotné zacházení s fotkami, řízená čitelnost textu nad obrazem a vizuály odvozené z brandu, takže deck bez fotek působí prázdně, ne záměrně.
- Charty jsou ručně psané SVG a HTML: čtyři druhy, bez os, bez záporných hodnot, 8 kategorií a 3 série. Finanční a analytický deck je neunese.

## Zásada

**Volnost v konceptu, měřená přesnost v provedení.** Navazuje na pravidlo z `CLAUDE.md`: pravidla vkusu jsou principy, ne výčty, a hlídá se měřitelně to, na čem záleží, s odůvodněním z vnímání. Model smí všechno, co umí. Rozhodovat o nápadu (koncept, reference, příběh) je jeho. Čísla, rozestupy, kontrast, součty a zarovnání mu počítá a kontroluje engine.

Žádné zúžení „pro jistotu“. Každé nové pravidlo musí mít princip, ze kterého plyne, a způsob, jakým se měří.

## Čtyři vrstvy vynucení

| Vrstva | Co dělá | Kde běží |
|---|---|---|
| 1 Schéma | špatný stav nejde zapsat (`strictObject`, zóny, limity počtu) | doména, `applyOps` |
| 2 Tokeny a odvození | model volí záměr, engine odvodí čísla (stupnice, paleta, mřížka, rozestupy, popisky grafů) | doména, engine |
| 3 Lint a měření | porušení se hlásí s důvodem a závažností | engine staticky, měření v prohlížeči (lokálně v Chromiu, hostovaně v MCP App) |
| 4 Kritika | to, co jde jen posoudit okem: hierarchie, zaostření, soulad s konceptem | model s PNG a rubrikou (`review_deck`) |

Vrstva 3 v hostovaném režimu nemá na serveru prohlížeč. Měření, která potřebují vykreslení, proto běží v MCP App u uživatele, stejně jako dnes měření přetečení. Staticky na serveru jde vše, co plyne z dat.

## Audit principů

Každý princip dostane vrstvu, ve které je vynucený. Co je jen ve vrstvě 4 nebo nikde, je mezera. Stav podle kódu k 2026-10-21 (design principy):

| Princip | Dnes | Mezera a krok |
|---|---|---|
| Omezená paleta písem (Tschichold) | 1 schéma: `fonts.heading`, `fonts.body` | žádná |
| Modulární škála (Bringhurst) | 2 tokeny: `typeScales`, `base` | žádná |
| Smysluplný kontrast velikostí (Williams) | 2 tokeny, částečně | změřit poměr nadpis k tělu na slidu (min. 1,5) |
| Poměr data a inkoustu (Tufte) | nic | pravidlo pro nové charty: osy, mřížka a popisky jen pokud nesou informaci |
| Zarovnání vlevo (Tschichold) | 2 renderer | žádná |
| Délka řádku 45 až 75 (Bringhurst) | 2 `.text` max-width 36em | změřit i odrážky a karty |
| 60/30/10 | 3 jen `tone-accent` max 2 | změřit podíl plochy akcentu na slidu |
| Sedm kontrastů (Itten) | 4 | rubrika kritiky |
| Simultánní kontrast (Albers) | 3 `contrast` pro fg, muted, accent na bg a fg na kartě | chybí **muted na surface**, přitom `card-text` je muted na kartě. Doplnit |
| Omezená aktivní paleta (Vignelli) | 1 šest slotů | žádná |
| Poctivý výraz, signální barva (Rams, Swiss) | 2 renderer, `==zvýraznění==` jen v textu | lint: max 2 slova zvýrazněná na slidu, akcent mimo čísla a zvýraznění |
| Mřížka (Müller-Brockmann) | 2 layouty | změřit počet různých levých hran a horních hran zón na slidu |
| Blízkost (Gestalt) | 2 tokeny rozestupů | změřit, že mezera mezi skupinami je větší než uvnitř |
| Aktivní bílé místo | nic | změřit podíl plochy obsahu na slidu (cílově 50 až 60 %), nad 70 % varování |
| Figure-ground | 3 kontrast | změřit odlišitelnost `surface` od `bg` (jemné, ale jasné) |
| Společná oblast (Palmer) | 2 karty | žádná |
| Jeden dominantní prvek (Williams) | nic | změřit poměr největšího prvku k druhému, `statement`/`headline-stat` mají vyhrát jasně |
| Opakování (Williams) | 2 renderer | žádná |
| Méně, ale lépe (Rams) | 1 limity počtu, 3 délky textu | doplnit limit odrážek a počtu bloků |
| Gutenbergův diagram | 4 | rubrika kritiky |
| Sémantická konzistence (Vignelli) | 2 tokeny | žádná |
| Nejmenší účinný rozdíl (Tufte) | 2 `surface` = 8 % míchání | žádná |
| Forma sleduje funkci | nic | **kritické s příchodem pozadí**: definovat, kdy je pozadí funkční (viz obrazová vrstva) |
| Kognitivní zátěž (Miller, Cowan) | 1 stats max 4 | doplnit odrážky a karty |
| Poměr signálu a šumu (Reynolds) | 2 renderer | žádná |

Storytellingové principy (Minto, Duarte, Alley, Kahneman) se auditují stejnou tabulkou v první fázi. Již teď je jasné, že „nadpis je závěr, ne štítek“ stojí jen v textu guide. Lint: nadpis, který je jedním ze štítků (Problém, Řešení, Tým, Trh…), bez slovesa nebo čísla, je varování.

Výstup auditu je `docs/principles-audit.md` generovaný z dat (každý princip v doméně nese pole `enforced: 1 | 2 | 3 | 4` a `measuredBy?`), takže se nerozejde s kódem. Test selže, pokud princip nemá vrstvu.

## Principy z dějin designu, které chybí, a jejich měření

| Princip | Zdroj | Jak se vynutí |
|---|---|---|
| Pevná mřížka a základní řádek | Müller-Brockmann | zóny se zarovnají na 12 sloupců, lint na počet levých hran |
| Vizuální proměnné | Bertin | význam nese jedna proměnná (poloha, délka, barva), ne tři najednou, v chartech |
| Pořadí percepčních úloh | Cleveland a McGill | poloha a délka před úhlem a plochou: donut max 4 segmenty a jen podíl na celku |
| Lie factor | Tufte | poměr vizuální změny k změně dat musí být 1: osa od nuly u sloupců je chyba (dnes už je) |
| Small multiples, sparklines | Tufte | nové druhy grafů |
| Kontrast zacházení | Itten, Albers | barevné pravidlo ve škole (viz koncept a školy) |
| Asymetrie a prázdno | Tschichold, Hara | škola „ma“, měřený podíl prázdna |
| Test tří sekund, STAR moment | Duarte | rubrika kritiky: jeden slide je záměrně nezapomenutelný |
| Assertion-evidence | Alley | nadpis je věta, tělo ji dokládá vizuálem, ne odrážkami |
| Princip koherence, redundance | Mayer | žádná dekorace bez významu, text na slidu neopakuje, co řečník řekne |
| Peak-end | Kahneman | vrchol a konec decku jsou navržené, ne náhodné |
| Důsledná mezinárodní notace | IBCS (Hichert) | skutečnost plná, plán obrys, výhled šrafa, odchylky ve vlastním grafu |

## Koncept a školy

Model dnes volí mood (šest). Navrhuji druhou osu a krok před layouty.

**Koncept decku** (povinné pole v `brief` nebo `design`): jedna věta nápadu, pojmenované reference („editorial jako Bloomberg Businessweek“), anti-reference (čím deck není), jeden opakující se grafický prvek (signature). Schéma funguje jako prompt: pole, které model musí vyplnit, ho přinutí rozhodnout. Koncept se ukládá do decku a čte ho každá další úprava (`apply_ops`), takže editace drží smysl.

**Školy** jako lens vedle moodu. Mood je osobnost značky, škola je formální jazyk. Škola je záznam v doméně: typografie, logika palety, mřížka, hustota, zacházení s obrazy, charakter pohybu, čemu se vyhnout a jedna věta „jak o tom přemýšlet“. Počáteční sada: Swiss/International, editorial, japonské „ma“, produktová keynote, technický tmavý produkt, brutalismus, Bauhaus/konstruktivismus, Rams/Braun, datová editorial (Economist, FT), IBCS pro finance. Školy nepřidávají nová zúžení: jsou to **doporučení se zdůvodněním**, model je smí kombinovat.

**Recepty slidů místo celých vzorových decků.** 40 až 60 pojmenovaných kompozic („problém: jedno velké číslo a jedna lidská věta“) s dvojicí špatně a dobře. Model je skládá podle beatu. `get_example` zůstává pro rytmus celku, ale instrukce přestane říkat „klonuj“ a začne „vyber recepty“.

## Příběh: narativní rámce a doptávání

Deck potřebuje hlavu a patu a model nemá domýšlet důkazy. Eval ukázal obojí: decky bez jasného konce a zástupné texty na slidech („Add real bio“, „replace with sourced figure“). Zástupné poznámky učily samy golden examples.

- **Narativní rámce jako data** (`lib/domain/narrative.ts`): klasická řeč (Cicero), SCQA (Minto), And But Therefore (Olson), motivovaná sekvence (Monroe), story spine (Adams, Pixar), what is a what could be (Duarte), claim, grounds, warrant, rebuttal (Toulmin). Rámec je pořadí fází, fáze říká svou práci a beaty, které jí slouží, a rámec říká, jak selhává.
- **Beat říká, na co se zeptat** (`askUser`) a zda stojí na důkazu (`needsEvidence`). Nové beaty `risks` a `decision` pro boardy a interní decky.
- **Doptávání:** než model staví, porovná beaty s briefem a na chybějící důkaz se zeptá uživatele, nejvýš pěti otázkami s navrženou odpovědí. Čísla, jména ani citace si nedomýšlí a zástupný text na slide nepíše. Beat bez důkazu vynechá.
- **Validace** jen toho, co deck deklaruje (`brief.frame`, `slide.beat`): otevírá hook, končí ask nebo decision, pořadí podle fází rámce, beat s potřebou důkazu má důkazový blok. Lint `placeholder` hlídá poznámky pro autora na slidu.
- **Později:** MCP `elicitation` (formulář přímo uživateli) tam, kde ho klient podporuje, jako nadstavba otázky v chatu. Eval s řídkým briefem, který měří, zda se model zeptá.

## Obrazová vrstva: assety, obrázky, pozadí

Postup od principů dolů.

**Principy.**

- Picture superiority a dual coding (Paivio, Mayer): obraz se pamatuje lépe než text, pokud nese význam. Dekorace ne (princip koherence).
- Figure-ground (Gestalt): text nad obrazem musí být okamžitě čitelný. Čitelnost je měřená, ne odhadnutá.
- Repetition a Vignelli: obrazy v decku se zachází jednotně (ořez, zaoblení, barevné zacházení). Jedna fotka s filtrem a druhá bez je chyba, ne styl.
- Tufte a „forma sleduje funkci“: pozadí nese buď význam (kapitola, nálada, hloubka), nebo je klidná plocha. Texturu bez významu odmítáme.
- Albers: barva obrazu a pozadí se posuzuje vedle sebe. Duotone v barvě značky sjednotí nesourodé fotky.
- Zlatý řez a třetiny: ohnisko obrazu (`focus`, už existuje) patří do silného bodu kompozice, text do protilehlé strany.

**Model dat.**

- Asset má **roli**: `logo`, `photo`, `screenshot`, `illustration`, `texture`, `icon`. Role řídí, jak se s ním zachází (screenshot se neořezává, logo nedostane duotone, photo ano).
- Deck dostane `imagery` (jednotné zacházení): `treatment` (`none | grayscale | duotone | tint`), `radius`, `overlay`. Tím je repetice zajištěná schématem.
- Slide dostane volitelné `background`: `none` (výchozí, klidná plocha), `field` (barevná plocha z tokenů, aktuální `tone`), `image` (asset s ohniskem a overlay) a `brand` (vizuál vygenerovaný z brandu: velká číslice, výřez znaku loga, geometrická kompozice z paprsků a poloh akcentu). Jde o funkci, ne fallback: deck bez fotek musí vypadat jako záměrně typografický.
- `overlay` není pevný přechod. Engine spočítá nejmenší krytí, při kterém text nad obrazem dosáhne kontrastu 4,5:1 (u velkého písma 3:1), z jasu obrazu pod textem.

**Měření.**

- Staticky: každý obraz musí mít `alt`, role a odpovídající layout (pozadí `image` jen pod layouty, které ho unesou). Rozlišení: obraz s menší šířkou než zobrazená při slide 1920 px je varování.
- V prohlížeči: vzorek jasu pod textovými zónami (canvas) → skutečný kontrast textu nad obrazem; výsledek jde zpět jako nález, stejně jako přetečení.

**Zdroje obrazů a hranice.** Hostovaný `add_asset` bere `url` a malé `data_base64`. Server žádné obrazy negeneruje, nevyhledává ani nestahuje ze stocků. Model používá to, co dodá uživatel. Dokud není obraz, slide se řeší typograficky nebo brandovým vizuálem. Licenci obrazu odpovídá uživatel.

**Exporty.** Pozadí `field` a `image` se do PPTX přenesou jako pozadí slidu. Treatment (duotone, tint) v PPTX nejde jako CSS filtr: buď se zpracuje při nahrání (odvozený asset), nebo se do PPTX vloží vykreslený snímek. Rozhodnutí je mezi otevřenými otázkami.

## Pohyb: filmová a animační gramatika

V006 je dobrý základ (Tversky, Heer a Robertson, Thomas a Johnston). Doplnit do `motion.ts`, pokud tam nejsou:

- **Význam přechodu podle vztahu slidů.** Cut: kontrast. Prolnutí: plynutí času. Match cut (`morph`): kontinuita prvku. Wipe: nová kapitola. Přechod volí vztah mezi dvěma slidy. Stejný nadpis → `morph`, nová kapitola → wipe, zdůraznění → lift.
- Choreografie ve vlnách podle hierarchie (nadpis, hlavní prvek, doprovod), ne naráz.
- Slow in/out podle váhy prvku, vstup zpomaluje, odchod zrychluje (už se měří).
- Doherty: nic nečeká na první reakci déle než ~400 ms (částečně kryje `readableMs`).
- Pohyb v datech (grow, draw, sweep) odpovídá tomu, co se mění: sloupce rostou od základny, linka se kreslí zleva doprava, waterfall se staví po krocích.

## Analytické a finanční decky

**Co dnes chybí.** Druhy: waterfall/bridge, stacked, kombinace sloupců a linky, záporné hodnoty, small multiples, scatter, heatmapa (kohorty), tabulka se sparklines, football field. Značení: osy a mřížka jen když nesou informaci, referenční čáry, anotace, přímé popisky místo legendy, jednotky v hlavičce, roky s A/E/F, záporná čísla v závorkách, povinný zdroj a datum.

**Integrita čísel** je hlavní guardrail. Model dodá data a záměr, engine odvodí čísla a popisky.

- `dataset` v decku: pojmenované řady (rok, hodnota, jednotka, typ A/E/F). Grafy i statistiky ho odkazují, takže číslo na slidu 4 se nemůže lišit od slidu 9.
- Odvozená pole: `derive: cagr | share | delta | margin`, počítá engine. Model je jen vybere.
- Kontroly: bridge musí sedět (start plus kroky = konec), podíly v donutu dávají 100, součty řádků tabulky sedí, nesmyslná jednotka (procenta a miliony v jedné ose) je chyba, procenta v popisku se shodují s daty.
- Přesnost: formátování čísel podle lokality (`formatNumber` už je), tisíce, desetinná čárka, měna, `tabular-nums`.

**IBCS jako škola.** Skutečnost plná, plán obrys, výhled šrafa, odchylky ve vlastním grafu, jednotná osa napříč srovnávanými grafy.

**Závislost.** Moduly **d3 bez DOM**: `d3-scale`, `d3-array`, `d3-shape`, `d3-format`, `d3-time-format` (ISC). Vlastní schéma bloků, vlastní SVG nad nimi, `data-part` pro pohyb zůstane. Důvody: běží v Lambdě bez prohlížeče, malé, nejde o plnohodnotný chart engine, který by model mohl použít kdekoli (Vega-Lite je pro náš případ příliš volná, ECharts a Chart.js potřebují DOM nebo canvas a špatně se napojují na pohyb a PPTX). Slovník Vega-Lite (mark, encoding, vrstvy) poslouží jako inspirace pro názvy polí, protože ho model zná. V PPTX zůstávají nativní grafy z `pptxgenjs` (bar, line, area, scatter, stacked, combo), waterfall jako stacked s průhlednou základnou, heatmapa jako obrázek.

Před přidáním závislosti: `npm view` na aktuální verze a licence, jak žádá `CLAUDE.md`.

## Eval

Bez měření ladíme podle dojmu. Eval harness mimo CI (volá model, stojí peníze):

- 10 pevných briefů (seed, enterprise, board update, finanční analýza, produktový launch, bez brandu, s logem, česky, anglicky, s fotkami).
- Pro každou verzi guide a škol se vygenerují decky, vykreslí PNG a modelem s viděním porovnají párově (A/B) podle rubriky: zaostření, hierarchie, soulad s konceptem, rytmus, čitelnost, integrita čísel.
- Člověk rozhoduje těžké případy. Výsledek je tabulka verzí a výher, ne jedno číslo.
- Zůstává mimo `npm test`. Testy v CI dál nevolají model.

## Fáze

1. **Audit a eval.** Pole `enforced` u principů, generovaný `principles-audit.md`, test, že žádný princip nemá prázdnou vrstvu. Skript evalu a 10 briefů. Doplnit muted na surface, štítkové nadpisy a limity odrážek. Výstup: tabulka mezer a první výchozí skóre.
2. **Koncept a školy.** Pole koncept, 10 škol v doméně, recepty slidů (první dávka 20), změna instrukce `get_example`.
3. **Obrazová vrstva.** Role assetů, `imagery`, `background`, overlay spočítaný z kontrastu, měření čitelnosti v prohlížeči, brandové vizuály, export pozadí do PPTX.
4. **Analytika.** `dataset`, odvozená pole, kontroly integrity, nové druhy grafů a značení, IBCS škola, d3 moduly.
5. **Kritika.** `review_deck`: PNG, spočítané metriky (křivka hustoty, podíl slidů s vizuálem, počet velikostí písma), rubrika a role. V hostovaném režimu nejdřív zjistit, co umí MCP App poslat zpět (viz otevřené).
6. **Polish.** Odvození palety v OKLCH místo míchání v sRGB, česká typografie (nezlomitelná mezera po jednopísmenných předložkách, mezery v tisících, uvozovky, pomlčky v rozsazích), jednotná mezera pro rozsahy.

Každá fáze: větev, PR, typecheck, lint, vitest. Fáze 1 před ostatními, protože jinak se nedá říct, jestli další kroky pomáhají.

## Stav k 2026-10-22

| Krok | PR | Výsledek |
|---|---|---|
| Audit principů, tři nová pravidla | #13 | designové principy 21 z 27 pokryté, storytelling 6 z 14 |
| Eval harness | #14 | baseline 10 decků, 0 nálezů, cca 6 USD |
| Měření kompozice, figury v optickém středu, hierarchie závěru | #15 | kontrolovaný eval (stejné decky, jiný renderer) 10 : 0, polish 2,8 na 3,5 |
| Sazba podle jazyka, lint zástupných textů | #16 | testy, příčina v golden examples odstraněna |
| Narativní rámce, beaty, doptávání | #17 | testy, příklady nesou rámec a beaty |
| Koncept a školy | #18 | eval celé fáze 2 proti baseline běží |

Recepty slidů (druhá část fáze 2) zatím chybí.

## Otevřené

- Treatment fotek pro PPTX: odvozený asset při nahrání (potřebuje knihovnu pro zpracování obrazu a na ARM64 Lambdě pozor na nativní binárky) nebo vykreslený snímek.
- Co smí MCP App poslat modelu zpět: pokud jen nálezy, hostovaný model obraz nikdy neuvidí a kritika (vrstva 4) zůstane lokální.
- Kolik škol je dost. Víc než ~12 se bude míchat a rozmazávat rozdíly.
- Zda `dataset` patří i do statistik (`stats`) hned, nebo se napojí až později.
