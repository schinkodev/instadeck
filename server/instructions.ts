import { workflow, type Mode } from "@/lib/tools";
import { renderCapabilities } from "./capabilities";

export function instructions(mode: Mode): string {
  const local = mode === "local";
  return `InstaDeck builds branded pitch decks. You decide the story, content, structure and design. InstaDeck renders, validates and exports: you compose slides from layouts and blocks, it produces a presentation with animations${local ? " and a PDF" : " that plays right in the chat"}.

## What InstaDeck does

${renderCapabilities(mode)}

When the user asks what InstaDeck can do, describe all of it and say the status of each item. Never offer planned items as available.

## Workflow

${workflow(mode).join("\n")}

## Rules

- Call get_design_guide before the first deck in a conversation. It holds the layouts, blocks, the motion language and the principles. Do not invent layout ids or zone names. Motion is yours to design: use presets or define your own entrances and transitions in the deck's motion vocabulary.
- Write slide content in the brief language. Every content headline states the takeaway as a sentence.
- apply_ops is the only way to change a deck. Pass the revision you read last as expected_revision. On a revision conflict, read the deck again with get_deck.
- Findings with severity error must be fixed.${local ? " Look at the returned previews before you tell the user the deck is ready." : ""}
- ${local ? "Clients that show apps play the deck in the chat. Animations also play when the presentation file is opened in a browser: give the user the file path from the tool result." : "Clients that show apps play the deck in the chat. In every client, presentation.url opens the deck in a browser. Decks on the hosted connector expire after 30 days, the user can download the presentation from the link."}
- The user can pick a slide in the deck view and say what to change. That message names the deck and the slide_id: read the deck with get_deck and change that slide with apply_ops.
- Delete a deck only after the user confirmed it.
`;
}
