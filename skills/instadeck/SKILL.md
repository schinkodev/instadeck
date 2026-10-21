---
name: instadeck
description: Build branded, animated pitch decks with the InstaDeck MCP server. Use when the user wants a pitch deck, investor deck, sales deck or any presentation for a company, especially with their logo, colors or fonts.
---

# InstaDeck

You decide the story, content, structure and design. InstaDeck renders, validates and exports. You never write HTML: you compose slides from layouts and blocks and design the motion language of the deck through the InstaDeck tools, and InstaDeck produces one HTML file that presents with animations, plus a PDF.

## Workflow

1. Brief: company, topic, audience, goal and content language. Ask the user only for what you cannot infer.
2. Brand: add the logo and brand files with add_asset and read candidate colors with extract_brand_colors. Pick the primary color and a mood, call suggest_brand_system, then create_brand_kit with its brand_kit plus the name and logos. Read the findings it returns. Skip when the user has no brand.
3. Story: read the example closest to the brief with get_example. Pick and order pitch beats for this audience (section pitch). Write each slide intent as one sentence before choosing layouts.
4. Design: use the design and motion from suggest_brand_system, or choose colors, fonts, type scale and density yourself (sections design, fonts). Design the motion language for the audience: intensity, rationale, entrance, transition and, when the presets do not fit, your own vocabulary (section motion). Explain the choice to the user in two or three sentences.
5. Build: call create_deck once with the brief, brand kit, design, motion and all slides. Keep the structure, rhythm and text lengths of the example, replace all of its content.
6. Review: read findings and look at the previews. Fix every error and the warnings that matter with apply_ops, passing expected_revision.
7. Hand over: give the user the presentation file to open (arrow keys or click to advance, G all slides, P presenter view, F fullscreen, N speaker notes) and offer export_deck as PDF or PowerPoint.

## Story

- Every content slide headline is the takeaway as a full sentence, the slide body proves it.
- One idea per slide. When a slide needs two headlines, it is two slides.
- Lead with the strongest proof. Traction beats promises, numbers beat adjectives.
- Alternate visual rhythm: do not use the same layout on consecutive slides.
- Use the accent tone for at most two moments, typically the hook or the ask.
- Close with a callback to the opening hook.
- 10 to 13 slides for a first meeting.

## Layouts

- `title`: Opening slide: company name or deck title, one line promise, logo.
- `title-image`: Opening slide with a strong product or brand visual on the right half.
- `statement`: One big sentence: the hook, the insight, the vision. Nothing else competes.
- `section`: Chapter divider for longer decks. Use sparingly, a pitch deck rarely needs it.
- `headline-stat`: One hero number proves the headline: market size, growth, savings.
- `stats`: Two to four numbers in a row: traction, unit economics, market.
- `points`: Headline with a short list or paragraph. The workhorse, but prefer more visual layouts when possible.
- `text-image`: Argument on the left, visual proof on the right: product, screenshot, photo.
- `image-text`: Mirror of text-image, visual first. Alternate with text-image for rhythm.
- `image-full`: Full bleed photo or product shot with a short headline. Emotional moments, the vision.
- `chart`: The chart is the slide. Headline states what the data shows.
- `chart-insight`: Insight next to the chart: a hero number or two points that explain it.
- `cards`: Two to four parallel ideas: product pillars, features, use cases, revenue streams.
- `comparison`: Us versus them, before versus after, old way versus new way.
- `timeline`: Roadmap, milestones, or how we got here.
- `team`: The people and why they win.
- `quote`: A customer or expert voice, large, with attribution.
- `logos`: Social proof: who uses, backs or writes about us.
- `table`: Structured detail: pricing tiers, use of funds, competitive features.
- `closing`: The ask and the way to reach you. Callback to the opening hook.

Zones and accepted blocks: `get_design_guide` or the resource `instadeck://layouts`.

## Motion

Design a motion language per deck, like a type scale. Section `motion` of `get_design_guide` has the format, `motion_principles` the reasons.

- `still`: Nothing moves. Content appears with a quiet fade or a cut. Board updates, reports, legal, minimalist professional decks where the content is the event.
- `subtle`: Short moves that guide the eye and settle fast. Investors, enterprise buyers and most business decks.
- `expressive`: Bigger moves, depth, slides that travel, elements that fly between slides. Product launches, vision, keynotes.
- `kinetic`: Energetic and springy, motion is part of the brand. Consumer apps, events, creative work. Still one focal motion at a time.
- Presets: entrances `none`, `fade`, `rise`, `reveal`, `wipe`, `focus`, transitions `cut`, `fade`, `slide`, `lift`, `morph`. Or write your own in `motion.vocabulary` as Web Animations keyframes, with `shared: true` transitions that glide the headline, logo or image to the next slide.
- One entrance and one transition carry the deck, exceptions mark about one moment per 5 slides.
- At most 4 click steps per slide. Numbers, charts and timelines animate on their own.
- The local server measures the motion in a browser and reports motion that does not match the declared intensity.

## Files

- Local logo or font: `add_asset` with an absolute `path`.
- The deck file to present is `file.path` in every create or edit result. Open it in a browser: arrows or click to advance, F fullscreen, N speaker notes.
- `export_deck` with `format: "pdf"` and an absolute `path` puts a PDF where the user wants it.
