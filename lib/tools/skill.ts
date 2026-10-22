/**
 * Skill pro Claude Code (skills/instadeck/SKILL.md), generovaný z domény a workflow.
 * npm run skill ho přepíše, test hlídá, že je aktuální.
 */
import { ENTRANCES, INTENSITY, LAYOUTS, MOTION_LIMITS, NARRATIVE_FRAMES, NARRATIVE_GUIDANCE, PITCH_GUIDANCE, TRANSITIONS } from "@/lib/domain";
import { workflow } from "./guide";

export function skillMarkdown(): string {
  return `---
name: instadeck
description: Build branded, animated pitch decks with the InstaDeck MCP server. Use when the user wants a pitch deck, investor deck, sales deck or any presentation for a company, especially with their logo, colors or fonts.
---

# InstaDeck

You decide the story, content, structure and design. InstaDeck renders, validates and exports. You never write HTML: you compose slides from layouts and blocks and design the motion language of the deck through the InstaDeck tools, and InstaDeck produces one HTML file that presents with animations, plus a PDF.

## Workflow

${workflow("local").join("\n")}

## Story

${PITCH_GUIDANCE.rules.map((r) => `- ${r}`).join("\n")}
- ${PITCH_GUIDANCE.slides.sweetSpot}.
- ${NARRATIVE_GUIDANCE.choose}
- ${NARRATIVE_GUIDANCE.elicit}
- ${NARRATIVE_GUIDANCE.close}

Narrative frames (\`brief.frame\`):

${NARRATIVE_FRAMES.map((f) => `- \`${f.id}\` (${f.author}): ${f.fits}`).join("\n")}

## Layouts

${LAYOUTS.map((l) => `- \`${l.id}\`: ${l.purpose}`).join("\n")}

Zones and accepted blocks: \`get_design_guide\` or the resource \`instadeck://layouts\`.

## Motion

Design a motion language per deck, like a type scale. Section \`motion\` of \`get_design_guide\` has the format, \`motion_principles\` the reasons.

${Object.entries(INTENSITY).map(([k, v]) => `- \`${k}\`: ${v.purpose}`).join("\n")}
- Presets: entrances ${Object.keys(ENTRANCES).map((e) => `\`${e}\``).join(", ")}, transitions ${Object.keys(TRANSITIONS).map((t) => `\`${t}\``).join(", ")}. Or write your own in \`motion.vocabulary\` as Web Animations keyframes, with \`shared: true\` transitions that glide the headline, logo or image to the next slide.
- One entrance and one transition carry the deck, exceptions mark about one moment per ${MOTION_LIMITS.slidesPerException} slides.
- At most ${MOTION_LIMITS.stepsPerSlide} click steps per slide. Numbers, charts and timelines animate on their own.
- The local server measures the motion in a browser and reports motion that does not match the declared intensity.

## Files

- Local logo or font: \`add_asset\` with an absolute \`path\`.
- The deck file to present is \`file.path\` in every create or edit result. Open it in a browser: arrows or click to advance, F fullscreen, N speaker notes.
- \`export_deck\` with \`format: "pdf"\` and an absolute \`path\` puts a PDF where the user wants it.
`;
}
