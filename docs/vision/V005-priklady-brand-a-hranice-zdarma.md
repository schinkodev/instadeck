# V005: Příklady, brandový systém a hranice mezi zdarma a prémií

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: nic, doplňuje V004

## Problém

První skutečný deck (Linear) byl průměrný. Příčina není v enginu, ale v tom, co model dostane: seznam možností, ne příklad dobré volby, a brand kit bez záruky čitelnosti. Hostovaný konektor navíc stojí na tom, že inteligenci platí uživatel (jeho Claude) a my držíme jen formu, takže hodnota je ve znalosti, kterou modelu dáme, a ve výstupu.

## Design

- **Golden examples** jako data v doméně (`lib/domain/examples.json`), vystavené tool `get_example` a resources `instadeck://examples`. Každý příklad je deck ve tvaru `create_deck` plus důvody, proč funguje. Test sestaví každý příklad skutečným `create_deck` a vyžaduje nula chyb a nula varování. Příklady nenesou assety a obsah je smyšlený (`EXAMPLE_NOTE` to říká modelu).
- **Brandový systém:** `suggest_brand_system` z primární barvy a nálady (calm, confident, energetic, premium, technical, friendly) deterministicky vyrobí paletu s ověřeným kontrastem, dvojici písem, škálu, poloměr a tempo a vypíše každou úpravu barvy. `create_brand_kit` vrací `findings` z `checkBrandKit`. Model rozhoduje o značce, engine hlídá čitelnost. `designFromBrand` zaručuje kontrast sekundárního textu.
- **Povýšení příkladu:** `npm run example` převede povedený deck (soubor, nebo hostovaný přes MCP `get_deck`) na příklad. Odmítne assety a jakékoli varování, vyžaduje `--content-is-public`.
- **Hostovaný viewer je produkt.** Odkaz `/d/<id>` není záložní cesta, ale místo, kde se deck sdílí. Hostování stojí haléře, model platí uživatel.

## Zdarma a prémie (zatím vše zdarma)

Zdarma: hostovaný konektor, všechny příklady a brandový systém, odkaz na 30 dní, lokální server. Prémie až podle zájmu a až s identitou (OAuth konektoru): deck napořád, bez značky, vlastní doména nebo heslo, statistiky, prémiové šablony a týmové brand kity. Do té doby žádné platby a žádný příznak v kódu, jen tento záměr. Kód zůstává MIT, hodnota je v hostování a kurátorském obsahu.

## Otevřené

- Layout `points` má malé písmo a hodně prázdna (zjištěno při kontrole příkladů).
- Mezera mezi nadpisem a tělem u cards, comparison a timeline (svislé centrování).
- Viewer: náhled odkazu (OG obrázek) bez Chromia na Lambdě, značka "Made with InstaDeck".
- Příklady v dalších jazycích a pro další účely (partner pitch, interní update).
