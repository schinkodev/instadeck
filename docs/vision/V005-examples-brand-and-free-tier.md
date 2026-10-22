# V005: Examples, the brand system and the line between free and premium

> Status: current
> Type: vision
> Date: 2026-10-20
> Supersedes: nothing, extends V004

## Problem

The first real deck (Linear) was average. The cause is not the engine but what the model gets: a list of options instead of an example of a good choice, and a brand kit without a legibility guarantee. The hosted connector also rests on the user paying for the intelligence (their Claude) while we hold only the form, so the value is in the knowledge we give the model and in the output.

## Design

- **Golden examples** as data in the domain (`lib/domain/examples.json`), exposed by the tool `get_example` and the resources `instadeck://examples`. Each example is a deck in the shape `create_deck` takes, plus the reasons it works. A test builds every example with a real `create_deck` and requires zero errors and zero warnings. Examples carry no assets and their content is made up (`EXAMPLE_NOTE` tells the model).
- **The brand system:** `suggest_brand_system` turns a primary color and a mood (calm, confident, energetic, premium, technical, friendly) deterministically into a palette with verified contrast, a font pair, a scale, a radius and a tempo, and lists every change it made to a color. `create_brand_kit` returns `findings` from `checkBrandKit`. The model decides about the brand, the engine guards legibility. `designFromBrand` guarantees the contrast of secondary text.
- **Promoting an example:** `npm run example` turns a deck that worked well (a file, or a hosted one through MCP `get_deck`) into an example. It refuses assets and any warning and requires `--content-is-public`.
- **The hosted viewer is the product.** The link `/d/<id>` is not a fallback but the place where a deck is shared. Hosting costs pennies, the user pays for the model.

## Free and premium (everything free for now)

Free: the hosted connector, all examples and the brand system, a link for 30 days, the local server. Premium only if there is interest and only with identity (connector OAuth): permanent decks, no branding, a custom domain or password, statistics, premium templates and team brand kits. Until then no payments and no flag in the code, only this intent. The code stays MIT, the value is in hosting and curated content.

## Open

- The `points` layout has small type and a lot of empty space (found while checking the examples).
- The gap between heading and body in cards, comparison and timeline (vertical centering). Resolved in V008: figures sit in the optical center.
- Viewer: a link preview (OG image) without Chromium on Lambda, a "Made with InstaDeck" mark.
- Examples in more languages and for more purposes (partner pitch, internal update).
