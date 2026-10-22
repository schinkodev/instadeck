/**
 * Snapshot of rendered slides (measure.js, snapshotInstaDeck): geometry and style of elements in pixels
 * of the 1920x1080 slide. It is made in a browser (locally Chromium, hosted the viewer's browser), the server
 * assembles PPTX from it. The schema guards what comes from outside: shapes, bounds and colors only as hex.
 */
import { z } from "zod";

const num = z.number().finite().min(-10_000).max(10_000);
const color = z.string().regex(/^[0-9A-F]{6}$/);
const rect = { x: num, y: num, w: num.min(0), h: num.min(0) };

const run = z.strictObject({
  text: z.string().max(2000),
  font: z.string().max(80),
  size: num.min(1).max(1000),
  color,
  bold: z.boolean(),
  italic: z.boolean(),
  spacing: num,
  upper: z.boolean(),
});

export const snapshotItemSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("box"),
    ...rect,
    radius: num.min(0),
    ellipse: z.boolean(),
    fill: z.strictObject({ color, alpha: z.number().min(0).max(1) }).optional(),
    line: z.strictObject({ color, alpha: z.number().min(0).max(1), width: num.min(0) }).optional(),
  }),
  z.strictObject({ kind: z.literal("line"), x1: num, y1: num, x2: num, y2: num, color, width: num.min(0) }),
  z.strictObject({ kind: z.literal("text"), ...rect, lines: z.number().int().min(1).max(200), align: z.enum(["left", "center", "right"]), lineHeight: num.min(0), runs: z.array(run).max(200) }),
  z.strictObject({
    kind: z.literal("image"),
    ...rect,
    asset: z.string().max(80),
    nw: num.min(0),
    nh: num.min(0),
    fit: z.enum(["cover", "contain"]),
    /** Focal point of a cover crop (object-position), 0 to 1. Center when absent. */
    fx: z.number().min(0).max(1).optional(),
    fy: z.number().min(0).max(1).optional(),
    radius: num.min(0),
    grayscale: z.boolean(),
  }),
  z.strictObject({ kind: z.literal("icon"), ...rect, name: z.string().min(1).max(40), png: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).max(60000) }),
  z.strictObject({ kind: z.literal("chart"), ...rect, zone: z.string().max(40) }),
  z.strictObject({ kind: z.literal("table"), ...rect, zone: z.string().max(40) }),
  z.strictObject({ kind: z.literal("scrim"), ...rect }),
]);
export type SnapshotItem = z.infer<typeof snapshotItemSchema>;

export const slideSnapshotSchema = z.strictObject({
  slideId: z.string().min(1).max(80),
  background: color,
  items: z.array(snapshotItemSchema).max(1500),
});
export type SlideSnapshot = z.infer<typeof slideSnapshotSchema>;

/** Body of an export request from the browser: the snapshot belongs to a specific deck revision. */
export const exportRequestSchema = z.strictObject({
  revision: z.number().int().min(1),
  slides: z.array(slideSnapshotSchema).min(1).max(100),
});
