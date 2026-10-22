/**
 * Deck validation without a browser. Errors mean the deck cannot render correctly
 * and the write is refused. Warnings are taste violations from the domain, the model should fix them.
 * Info are notes on the whole that only apply to a finished deck.
 */
import {
  CONTRAST,
  ENTRANCES,
  MOTION_LIMITS,
  PITCH_GUIDANCE,
  TEMPOS,
  TEXT_LIMITS,
  TRANSITIONS,
  contrastRatio,
  deriveTokens,
  findGoogleFont,
  entranceOf,
  getBeat,
  getFrame,
  getLayout,
  stagesOf,
  transitionOf,
  type Block,
  type Deck,
  type Slide,
  type Tone, MAX_DECIMALS, bridgeSteps, chartLabelsCollide } from "@/lib/domain";
import { motionUsage, sharedKeys, slideEntrance, slideTransition, zoneEntrances } from "../motion";
import { slideSteps } from "../steps";
import { plain } from "../text";

const MAX_HIGHLIGHTS = 2;

export type Severity = "error" | "warning" | "info";

export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  slideId?: string;
  zone?: string;
}

export interface AssetIndex {
  [assetId: string]: { kind: "image" | "font" };
}

type Push = (severity: Severity, rule: string, message: string, zone?: string) => void;

function imageRefs(block: Block): string[] {
  switch (block.type) {
    case "image":
    case "logo":
      return [block.assetId];
    case "logos":
      return block.items.map((i) => i.assetId);
    case "team":
      return block.people.flatMap((p) => (p.photoAssetId ? [p.photoAssetId] : []));
    default:
      return [];
  }
}

function checkData(block: Block, push: Push, zone: string) {
  if (block.type === "chart") {
    const n = block.categories.length;
    for (const s of block.series) {
      if (s.values.length !== n) push("error", "chart-shape", `Series "${s.name}" has ${s.values.length} values for ${n} categories`, zone);
      if ((block.kind === "donut" || block.kind === "stacked") && s.values.some((v) => v < 0)) push("error", "chart-negative", `Series "${s.name}" has negative values. A ${block.kind} chart shows parts of a whole, use column or waterfall for negative values`, zone);
    }
    if (block.kind === "donut" && block.series.length !== 1) push("error", "chart-donut", "A donut chart takes exactly one series", zone);
    if (block.kind === "donut" && n > 6) push("error", "chart-donut", `A donut chart takes at most 6 segments, got ${n}`, zone);
    // Cleveland and McGill: the eye compares angle and area worse than length. More segments can no longer be read.
    else if (block.kind === "donut" && n > 4) push("warning", "chart-donut", `${n} donut segments are hard to compare by angle. Use a bar chart, or group the small segments`, zone);
    if (block.kind === "waterfall") {
      const v = block.series[0]!.values;
      if (block.series.length !== 1) push("error", "chart-bridge", "A waterfall chart takes exactly one series: the start total, the changes and the end total", zone);
      else if (n < 3) push("error", "chart-bridge", "A waterfall chart needs a start total, at least one change and an end total", zone);
      else if (v.length === n) {
        // The bridge must add up: start plus changes is the end. Tolerance for rounded labels.
        const expected = bridgeSteps(v).at(-2)!.to;
        const end = v.at(-1)!;
        if (Math.abs(expected - end) > Math.max(Math.abs(end) * 0.005, 0.05)) {
          push("error", "chart-bridge", `The bridge does not add up: ${block.categories[0]} ${v[0]} plus the changes gives ${Math.round(expected * 100) / 100}, but ${block.categories.at(-1)} is ${end}. Fix a value or add the missing change`, zone);
        }
      }
    }
    const plotted = block.kind === "column" || block.kind === "stacked" || block.kind === "waterfall";
    for (const opt of ["estimate", "axis", "reference"] as const) {
      if (block[opt] !== undefined && !plotted) push("error", "chart-option", `${opt} works on column, stacked and waterfall charts, not on ${block.kind}`, zone);
    }
    if (block.estimate !== undefined && block.estimate >= n) push("error", "chart-option", `estimate ${block.estimate} is outside the ${n} categories`, zone);
    if (block.kind === "stacked" && block.highlight !== undefined) push("warning", "chart-highlight", "A stacked chart colors by series, highlight has no effect. Remove it or use a column chart", zone);
    if (block.kind === "line" && block.highlight !== undefined && block.series.length > 1) push("warning", "chart-highlight", "With highlight a line chart shows only the first series in the accent", zone);
    if (block.highlight !== undefined && block.highlight >= n) push("error", "chart-highlight", `highlight ${block.highlight} is outside the ${n} categories`, zone);
    const collide = chartLabelsCollide(block);
    if (collide !== undefined) {
      const fix = block.decimals !== undefined && block.decimals < MAX_DECIMALS ? "Raise decimals or omit it, labels then keep the precision of the values" : "The values differ only in a digit no label shows: scale the unit (bp instead of %, thousands instead of units)";
      push("warning", "chart-labels", `At ${collide} decimal places two different values read the same, or a value that is not zero reads 0. ${fix}`, zone);
    }
  }
  if (block.type === "timeline" && block.current !== undefined && block.current >= block.items.length) push("error", "timeline-current", `current ${block.current} is outside the ${block.items.length} milestones`, zone);
  if (block.type === "table") {
    block.rows.forEach((r, i) => {
      if (r.length !== block.columns.length) push("error", "table-shape", `Row ${i + 1} has ${r.length} cells for ${block.columns.length} columns`, zone);
    });
    if (block.highlightColumn !== undefined && block.highlightColumn >= block.columns.length) push("error", "table-highlight", "highlightColumn is outside the table", zone);
  }
  if (block.type === "comparison" && block.columns.filter((c) => c.highlight).length > 1) push("warning", "comparison-highlight", "Highlight one column, the one that is ours", zone);
}

function checkLength(block: Block, push: Push, zone: string) {
  const over = (text: string, max: number, what: string) => {
    const len = plain(text).length;
    if (len > max) push("warning", "text-length", `${what} has ${len} characters, aim for at most ${max}`, zone);
  };
  switch (block.type) {
    case "heading":
      return over(block.text, TEXT_LIMITS.heading[block.level], `Heading (${block.level})`);
    case "text":
      return over(block.text, TEXT_LIMITS.text[block.size], `Text (${block.size})`);
    case "bullets":
      return block.items.forEach((t, i) => over(t, TEXT_LIMITS.bullet, `Bullet ${i + 1}`));
    case "quote":
      return over(block.text, TEXT_LIMITS.quote, "Quote");
    case "cta":
      return over(block.text, TEXT_LIMITS.cta, "Call to action");
    case "cards":
      return block.items.forEach((c, i) => over(c.text, TEXT_LIMITS.cardText, `Card ${i + 1}`));
  }
}

function blockTexts(block: Block): string[] {
  switch (block.type) {
    case "heading":
    case "text":
    case "quote":
    case "cta":
      return [block.text];
    case "bullets":
      return block.items;
    case "cards":
      return block.items.flatMap((c) => [c.title, c.text]);
    default:
      return [];
  }
}

/** Block fields that are not text for the audience (identifiers and options). */
const NOT_TEXT = new Set(["type", "assetId", "photoAssetId", "kind", "fit", "level", "size", "unit"]);

function allTexts(value: unknown, key = ""): string[] {
  if (typeof value === "string") return NOT_TEXT.has(key) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((v) => allTexts(v, key));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => allTexts(v, k));
  return [];
}

/**
 * Placeholder text on a slide: a note for the author that reached the audience ("[Name]", "TBD",
 * "replace with sourced figure", "XX %"). The model must not make up numbers and names or leave them empty:
 * it asks the user, or leaves the claim out.
 */
const PLACEHOLDER = /\[[^\]]{1,60}\]|\b(?:TODO|TBD|TBC|lorem ipsum|placeholder)\b|\b(?:replace|insert|add) (?:with |your |real |the )|\bdoplnit\b|\bX{2,}\b|[$€£]X\b/i;

function checkPlaceholders(slide: Slide, push: Push) {
  for (const [zone, block] of Object.entries(slide.blocks)) {
    const hit = allTexts(block).map((t) => PLACEHOLDER.exec(t)?.[0]).find(Boolean);
    if (hit) push("warning", "placeholder", `"${hit}" looks like a placeholder left on the slide. Ask the user for the real content or remove it, never present it`, zone);
  }
}

/** Layouts whose heading carries the conclusion. Title, section, statement and closing slides do not have a conclusion heading. */
const NO_TAKEAWAY_LAYOUTS = new Set(["title", "title-image", "section", "statement", "image-full", "quote", "closing"]);
const CJK = /[\u3040-\u30ff\u3400-\u9fff]/;

/**
 * Assertion-evidence (Alley): a heading is a claim, not a label. One or two words without a number ("Team", "Our market")
 * are a topic, not a conclusion. Chinese and Japanese do not split words, the rule does not apply there.
 */
function checkHeadingLabel(slide: Slide, push: Push) {
  if (NO_TAKEAWAY_LAYOUTS.has(slide.layout)) return;
  for (const [zone, block] of Object.entries(slide.blocks)) {
    if (block.type !== "heading") continue;
    const text = plain(block.text).trim();
    if (CJK.test(text) || /\d/.test(text)) continue;
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words <= 2) push("warning", "heading-label", `Heading "${text}" is a topic label. State the takeaway as a sentence, the body proves it`, zone);
  }
}

/** Signal color (Swiss, Rams): highlighting is rare on a slide, otherwise it stops leading the eye. */
function checkHighlightCount(slide: Slide, push: Push) {
  const count = Object.values(slide.blocks).flatMap(blockTexts).reduce((n, t) => n + (t.match(/==[^=]+==/g)?.length ?? 0), 0);
  if (count > MAX_HIGHLIGHTS) push("warning", "highlight-count", `${count} highlights on one slide, at most ${MAX_HIGHLIGHTS} keep the accent a signal`);
}

/**
 * Time to legibility: blocks of the slide entrance (without a step) enter in zone order with a gap,
 * the slide is readable once the last of them stands still.
 */
function checkReadable(slide: Slide, deck: Deck, push: Push) {
  const layout = getLayout(slide.layout)!;
  const tempo = TEMPOS[deck.motion.tempo];
  const entrances = zoneEntrances(slide, deck);
  const base = entranceOf(deck.motion, slideEntrance(slide, deck));
  if (!base) return;
  const stagger = base.stagger === undefined ? tempo.stagger : base.stagger * tempo.duration;
  let end = 0;
  let i = 0;
  for (const z of layout.zones) {
    const b = slide.blocks[z.name];
    if (!b || b.step) continue;
    const e = entranceOf(deck.motion, entrances[z.name]!);
    if (e) end = Math.max(end, Math.round(i * stagger + e.duration * tempo.duration));
    i++;
  }
  if (end > MOTION_LIMITS.readableMs) push("warning", "motion-readable", `The slide is readable after ${end} ms, aim for ${MOTION_LIMITS.readableMs} ms. Shorten the entrance or move blocks to click steps`);
}

export function validateSlide(slide: Slide, deck: Deck, assets: AssetIndex): Finding[] {
  const out: Finding[] = [];
  const push: Push = (severity, rule, message, zone) => out.push({ severity, rule, message, slideId: slide.id, ...(zone ? { zone } : {}) });
  const layout = getLayout(slide.layout);
  if (!layout) {
    push("error", "layout", `Unknown layout ${slide.layout}`);
    return out;
  }
  for (const [zone, block] of Object.entries(slide.blocks)) {
    const z = layout.zones.find((x) => x.name === zone);
    if (!z) {
      push("error", "zone", `Layout ${layout.id} has no zone "${zone}". Zones: ${layout.zones.map((x) => x.name).join(", ")}`, zone);
      continue;
    }
    if (!z.accepts.includes(block.type)) push("error", "zone-type", `Zone "${zone}" of ${layout.id} accepts ${z.accepts.join(", ")}, not ${block.type}`, zone);
    for (const id of imageRefs(block)) {
      const a = assets[id];
      if (!a) push("error", "asset", `Asset ${id} does not exist. Add it with add_asset first`, zone);
      else if (a.kind !== "image") push("error", "asset", `Asset ${id} is a ${a.kind}, not an image`, zone);
    }
    checkData(block, push, zone);
    checkLength(block, push, zone);
  }
  for (const z of layout.zones) if (z.required && !slide.blocks[z.name]) push("error", "zone-required", `Layout ${layout.id} needs a block in zone "${z.name}"`, z.name);

  if (slide.tone === "accent") {
    for (const [zone, block] of Object.entries(slide.blocks)) {
      if ((block.type === "heading" || block.type === "cta") && block.text.includes("==")) push("warning", "highlight-on-accent", "The accent tone slide has an accent background, so ==highlight== is invisible. Remove the markers", zone);
    }
  }

  const steps = slideSteps(slide);
  if (steps > MOTION_LIMITS.stepsPerSlide) push("warning", "motion-steps", `${steps} click steps, at most ${MOTION_LIMITS.stepsPerSlide} keep the talk flowing`);

  // Arguments that build are told one part at a time: columns of a comparison, risk by risk. A recommendation, not a rule.
  for (const [zone, block] of Object.entries(slide.blocks)) {
    const builds = block.type === "comparison" || ((block.type === "bullets" || block.type === "cards") && slide.beat === "risks");
    if (builds && !block.build) push("info", "build-suggestion", `${block.type === "comparison" ? "A comparison lands" : "Risks land"} better one part at a time. Set build to items if the speaker walks through them`, zone);
  }

  for (const zone of Object.keys(slide.motion?.zones ?? {})) {
    if (!slide.blocks[zone]) push("error", "motion-zone", `motion.zones names "${zone}", which has no block on this slide`, zone);
  }
  checkReadable(slide, deck, push);
  checkHeadingLabel(slide, push);
  checkHighlightCount(slide, push);
  checkPlaceholders(slide, push);
  return out;
}

function checkFonts(deck: Deck, assets: AssetIndex, push: Push) {
  const { heading, body } = deck.design.fonts;
  for (const [role, f] of [["heading", heading], ["body", body]] as const) {
    if (f.source === "asset") {
      const a = assets[f.assetId];
      if (!a) push("error", "font-asset", `${role} font asset ${f.assetId} does not exist`);
      else if (a.kind !== "font") push("error", "font-asset", `${role} font asset ${f.assetId} is not a font`);
    } else if (findGoogleFont(f.family)!.category === "mono" && role === "body") {
      push("warning", "font-role", `${f.family} is a mono face, it reads poorly as body text`);
    }
  }
  const w = deck.design.type.headingWeight;
  if (heading.source === "google" && !findGoogleFont(heading.family)!.weights.includes(w)) {
    push("error", "font-weight", `${heading.family} has no weight ${w}. Available: ${findGoogleFont(heading.family)!.weights.join(", ")}`);
  }
  if (heading.source === "asset" && heading.weight !== w) push("error", "font-weight", `Heading font file has weight ${heading.weight}, design asks for ${w}`);
}

function checkContrast(deck: Deck, push: Push) {
  const tokens = deriveTokens(deck.design);
  const used = new Set<Tone>(["default", ...deck.slides.map((s) => s.tone ?? "default")]);
  for (const tone of used) {
    const p = tokens.palette[tone];
    const pair = (a: string, b: string, min: number, severity: Severity, what: string) => {
      const r = contrastRatio(a, b);
      if (r < min) push(severity, "contrast", `${tone} tone: ${what} contrast ${r.toFixed(2)}:1, needs ${min}:1`);
    };
    pair(p.fg, p.bg, CONTRAST.text, "error", "text on background");
    // Secondary text is often large (lead), under 3:1 it is always illegible, under 4.5:1 for small type.
    const muted = contrastRatio(p.muted, p.bg);
    if (muted < CONTRAST.largeText) pair(p.muted, p.bg, CONTRAST.largeText, "error", "secondary text on background");
    else pair(p.muted, p.bg, CONTRAST.text, "warning", "secondary text on background");
    pair(p.accent, p.bg, CONTRAST.largeText, "error", "accent on background");
    if (tokens.cards === "filled") {
      pair(p.fg, p.surface, CONTRAST.text, "error", "text on cards");
      // Card text is secondary (card-text), so the same thresholds apply as for muted on the background.
      const onCard = contrastRatio(p.muted, p.surface);
      if (onCard < CONTRAST.largeText) pair(p.muted, p.surface, CONTRAST.largeText, "error", "secondary text on cards");
      else pair(p.muted, p.surface, CONTRAST.text, "warning", "secondary text on cards");
    }
  }
}

function checkRhythm(deck: Deck, push: Push) {
  const slides = deck.slides;
  for (let i = 1; i < slides.length; i++) {
    if (slides[i]!.layout === slides[i - 1]!.layout) {
      push("warning", "rhythm", `Slides ${i} and ${i + 1} both use ${slides[i]!.layout}. Alternate layouts for visual rhythm`);
    }
  }
  const accent = slides.filter((s) => s.tone === "accent").length;
  if (accent > 2) push("warning", "tone-accent", `${accent} slides use the accent tone. Keep it for one or two moments`);
  const n = slides.length;
  if (n < PITCH_GUIDANCE.slides.min || n > PITCH_GUIDANCE.slides.max) push("info", "deck-length", `${n} slides. A pitch deck usually has ${PITCH_GUIDANCE.slides.min} to ${PITCH_GUIDANCE.slides.max}`);
  const ids = new Set<string>();
  for (const s of slides) {
    if (ids.has(s.id)) push("error", "slide-id", `Duplicate slide id ${s.id}`);
    ids.add(s.id);
  }
}

/** Motion language of the deck: names, durations, coherence, intensity and shared elements (V006, principles/motion.ts). */
function checkMotion(deck: Deck): Finding[] {
  const out: Finding[] = [];
  const push = (severity: Severity, rule: string, message: string, slideId?: string) => out.push({ severity, rule, message, ...(slideId && { slideId }) });
  const m = deck.motion;
  const vocab = m.vocabulary ?? {};
  for (const name of Object.keys(vocab.entrances ?? {})) if (name in ENTRANCES) push("error", "motion-name", `vocabulary.entrances.${name} has the name of a preset. Pick a name of your own`);
  for (const name of Object.keys(vocab.transitions ?? {})) if (name in TRANSITIONS) push("error", "motion-name", `vocabulary.transitions.${name} has the name of a preset. Pick a name of your own`);

  const usage = motionUsage(deck);
  const known = (kind: "entrance" | "transition", name: string) => (kind === "entrance" ? entranceOf(m, name) : transitionOf(m, name));
  const scale = TEMPOS[m.tempo].duration;
  for (const [kind, used, max] of [
    ["entrance", { [m.entrance]: [], ...usage.entrances }, MOTION_LIMITS.maxEntranceMs],
    ["transition", { [m.transition]: [], ...usage.transitions }, MOTION_LIMITS.maxTransitionMs],
  ] as const) {
    for (const [name, slideIds] of Object.entries(used)) {
      const spec = known(kind, name);
      if (!spec) {
        const all = [...Object.keys(kind === "entrance" ? ENTRANCES : TRANSITIONS), ...Object.keys((kind === "entrance" ? vocab.entrances : vocab.transitions) ?? {})];
        push("error", "motion-name", `Unknown ${kind} "${name}"${slideIds.length ? ` (slides ${slideIds.join(", ")})` : ""}. Use one of ${all.join(", ")} or define it in vocabulary.${kind}s`);
        continue;
      }
      const ms = Math.round(spec.duration * scale);
      if (ms > 0 && ms < MOTION_LIMITS.minMs) push("warning", "motion-duration", `The ${kind} "${name}" takes ${ms} ms, under ${MOTION_LIMITS.minMs} ms it reads as a jump. Use 0 for a cut or make it longer`);
      if (ms > max) push("warning", "motion-duration", `The ${kind} "${name}" takes ${ms} ms, above ${max} ms the audience waits`);
    }
  }

  // Coherence: exceptions from the deck language mark moments and must be rare.
  const exceptions = deck.slides.filter(
    (s, i) => (s.motion?.entrance && s.motion.entrance !== m.entrance) || (i > 0 && s.motion?.transition && s.motion.transition !== m.transition) || Object.keys(s.motion?.zones ?? {}).length,
  );
  const allowed = Math.max(1, Math.ceil(deck.slides.length / MOTION_LIMITS.slidesPerException));
  if (exceptions.length > allowed) {
    push("warning", "motion-consistency", `${exceptions.length} slides depart from the deck's entrance or transition (${exceptions.map((s) => s.id).join(", ")}). Keep exceptions for about ${allowed} key moment${allowed > 1 ? "s" : ""}, or make the motion the deck default`);
  }

  for (let i = 1; i < deck.slides.length; i++) {
    const s = deck.slides[i]!;
    const t = transitionOf(m, slideTransition(s, deck));
    if (!t?.shared) continue;
    const before = new Set(sharedKeys(deck.slides[i - 1]!).values());
    if (![...sharedKeys(s).values()].some((k) => before.has(k))) {
      push("warning", "motion-shared", `The transition into this slide moves shared elements, but it shares no headline, logo, image or number with the slide before. Use another transition here`, s.id);
    }
  }
  return out;
}

/** Blocks that prove a claim: a number, chart, table, quote, logos, comparison, image, timeline, team. */
const EVIDENCE = new Set(["stat", "stats", "chart", "table", "quote", "logos", "comparison", "image", "timeline", "team"]);

/**
 * Story (narrative.ts, storytelling principles): a head and a tail, order by the frame, and beats that claim without
 * evidence. Only what the deck declares itself is checked (beat on a slide, frame in the brief).
 */
function checkStory(deck: Deck): Finding[] {
  const out: Finding[] = [];
  const push = (severity: Severity, rule: string, message: string, slideId?: string) => out.push({ severity, rule, message, ...(slideId && { slideId }) });
  const beats = deck.slides.flatMap((s, i) => (s.beat ? [{ slide: s, beat: s.beat, i }] : []));
  if (!beats.length) return out;
  if (beats[0]!.beat !== "hook") push("warning", "story-open", `The story opens with the ${beats[0]!.beat} beat. Open with the hook: why should the audience listen for the next ten minutes`, beats[0]!.slide.id);
  const last = beats.at(-1)!.beat;
  if (last !== "ask" && last !== "decision") push("warning", "story-close", `The story ends with the ${last} beat. End with the ask or the decision, so the audience knows what to do`, beats.at(-1)!.slide.id);

  const frame = deck.brief.frame ? getFrame(deck.brief.frame) : undefined;
  if (frame) {
    let reached = 0;
    let reachedBy = "";
    for (const { slide, beat, i } of beats) {
      const stages = stagesOf(frame, beat);
      if (!stages.length) continue;
      const stage = stages.find((x) => x >= reached) ?? stages[0]!;
      if (stage < reached) {
        push("warning", "story-order", `Slide ${i + 1} (${slide.id}) carries ${beat}, which belongs to the ${frame.stages[stage]!.name} stage of the ${frame.name} frame, after ${reachedBy} already reached ${frame.stages[reached]!.name}. Move it, or pick a frame that fits this order`, slide.id);
      } else if (stage > reached) {
        reached = stage;
        reachedBy = beat;
      }
    }
  }

  for (const { slide, beat, i } of beats) {
    if (!getBeat(beat)?.needsEvidence) continue;
    if (!Object.values(slide.blocks).some((b) => EVIDENCE.has(b.type))) {
      push("warning", "story-evidence", `Slide ${i + 1} (${slide.id}) carries ${beat} with text only. It asserts but does not prove: show the number, chart, table or quote, or ask the user for it`, slide.id);
    }
  }
  return out;
}

export function validateDeck(deck: Deck, assets: AssetIndex): Finding[] {
  const deckFindings: Finding[] = [];
  const push: Push = (severity, rule, message) => deckFindings.push({ severity, rule, message });
  checkFonts(deck, assets, push);
  checkContrast(deck, push);
  checkRhythm(deck, push);
  return [...deckFindings, ...checkStory(deck), ...checkMotion(deck), ...deck.slides.flatMap((s) => validateSlide(s, deck, assets))];
}

export const hasErrors = (findings: Finding[]) => findings.some((f) => f.severity === "error");
