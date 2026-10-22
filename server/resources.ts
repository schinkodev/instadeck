import { ResourceTemplate, type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EXAMPLES, EXAMPLE_NOTE, exampleSummary, findExample } from "@/lib/domain";
import { designGuide, type GuideSection, type Mode, type Service } from "@/lib/tools";
import { capabilitiesFor } from "./capabilities";

const json = (uri: string, data: unknown) => ({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }] });

/** Statické resources: URI → sekce průvodce. */
export const GUIDE_RESOURCES: Record<string, { name: string; description: string; section: GuideSection }> = {
  "instadeck://guide": { name: "workflow", description: "Step by step workflow for building a deck", section: "workflow" },
  "instadeck://layouts": { name: "layouts", description: "Slide layouts with their zones and accepted blocks", section: "layouts" },
  "instadeck://blocks": { name: "blocks", description: "Block types, highlighting, text limits and click reveals", section: "blocks" },
  "instadeck://motion": { name: "motion", description: "Motion language: intensity, presets, your own keyframe vocabulary, shared transitions, tempos and what is measured", section: "motion" },
  "instadeck://fonts": { name: "fonts", description: "Curated Google Fonts with weights and character", section: "fonts" },
  "instadeck://pitch": { name: "pitch", description: "Story beats, narrative frames and how to ask the user for missing proof", section: "pitch" },
  "instadeck://schools": { name: "schools", description: "Design schools and how to write the concept of a deck", section: "schools" },
  "instadeck://principles/design": { name: "design-principles", description: "Design principles behind the system", section: "design_principles" },
  "instadeck://principles/storytelling": { name: "storytelling-principles", description: "Storytelling principles for structuring the deck", section: "storytelling_principles" },
  "instadeck://principles/motion": { name: "motion-principles", description: "Why and when things move: perception research behind the motion rules", section: "motion_principles" },
};

export function registerResources(mcp: McpServer, service: Service, mode: Mode): void {
  for (const [uri, r] of Object.entries(GUIDE_RESOURCES)) {
    mcp.registerResource(r.name, uri, { description: r.description, mimeType: "application/json" }, async () => json(uri, designGuide([r.section], mode)[r.section]));
  }
  mcp.registerResource("examples", "instadeck://examples", { description: "Proven example decks: purpose, audience and layouts", mimeType: "application/json" }, async () =>
    json("instadeck://examples", { examples: EXAMPLES.map(exampleSummary), note: EXAMPLE_NOTE }),
  );
  mcp.registerResource(
    "example",
    new ResourceTemplate("instadeck://examples/{id}", { list: async () => ({ resources: EXAMPLES.map((e) => ({ uri: `instadeck://examples/${e.id}`, name: e.title, mimeType: "application/json" })) }) }),
    { description: "A full example deck in the shape create_deck takes, with why it works", mimeType: "application/json" },
    async (uri, vars) => {
      const example = findExample(String(vars.id));
      if (!example) throw new Error(`Unknown example ${String(vars.id)}. Known: ${EXAMPLES.map((e) => e.id).join(", ")}`);
      return json(uri.href, { example, note: EXAMPLE_NOTE });
    },
  );
  mcp.registerResource("capabilities", "instadeck://capabilities", { description: "What InstaDeck can do and the status of each capability", mimeType: "application/json" }, async () =>
    json("instadeck://capabilities", capabilitiesFor(mode)),
  );
  mcp.registerResource(
    "deck",
    // Hostovaný konektor decky nevypisuje: ID decku je capability, cizí decky nikdo neuvidí.
    new ResourceTemplate("instadeck://deck/{deck_id}", {
      list:
        mode === "local"
          ? async () => ({
              resources: (await service.store.listDecks()).map((d) => ({ uri: `instadeck://deck/${d.id}`, name: d.title, mimeType: "application/json" })),
            })
          : undefined,
    }),
    { description: "Current state of a deck", mimeType: "application/json" },
    async (uri, vars) => json(uri.href, await service.store.getDeck(String(vars.deck_id))),
  );
}
