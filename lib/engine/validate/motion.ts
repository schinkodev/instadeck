/**
 * Scoring of the measured motion (measure.js, measureMotionInstaDeck) against the deck intensity and the thresholds
 * of perception. Runs locally after measurement in Chromium and in the MCP App in the user's browser, so it imports only
 * moduly bez zod (motion-limits).
 */
import { INTENSITY, MOTION_LIMITS, type Intensity, type MotionSample } from "@/lib/domain/motion-limits";
import type { Finding } from "./rules";

export interface MotionMeasureContext {
  intensity: Intensity;
  usage: { entrances: Record<string, string[]>; transitions: Record<string, string[]> };
}

const LABEL: Record<MotionSample["part"], string> = { entrance: "entrance", enter: "transition (incoming slide)", exit: "transition (outgoing slide)" };

export function motionFindings(ctx: MotionMeasureContext, samples: MotionSample[]): Finding[] {
  const limit = INTENSITY[ctx.intensity];
  const out: Finding[] = [];
  for (const s of samples) {
    const slides = (s.part === "entrance" ? ctx.usage.entrances : ctx.usage.transitions)[s.name] ?? [];
    const where = `The ${LABEL[s.part]} "${s.name}"${slides.length ? ` (slides ${slides.join(", ")})` : ""}`;
    const push = (rule: string, message: string) => out.push({ severity: "warning", rule, message: `${where} ${message}` });

    const travel = s.part === "entrance" ? limit.travelPx : limit.transitionTravelPx;
    const over = [
      s.travelPx > travel && `moves ${s.travelPx}px (up to ${travel}px)`,
      s.scale > limit.scale && `scales by ${Math.round(s.scale * 100)}% (up to ${Math.round(limit.scale * 100)}%)`,
      s.blurPx > limit.blurPx && `blurs ${s.blurPx}px (up to ${limit.blurPx}px)`,
      s.rotateDeg > limit.rotateDeg && `rotates ${s.rotateDeg} degrees (up to ${limit.rotateDeg})`,
    ].filter(Boolean);
    if (over.length) push("motion-intensity", `${over.join(", ")}, more than a ${ctx.intensity} deck allows. Calm the motion or declare a higher intensity if the audience calls for it`);
    if (s.overshoot && !limit.overshoot) push("motion-overshoot", `overshoots its resting place (spring or bounce). That reads as playful, keep it for kinetic decks`);
    if (s.part !== "exit" && s.remainingAtHalf > MOTION_LIMITS.remainingAtHalf) {
      push("motion-easing", `still has ${Math.round(s.remainingAtHalf * 100)}% of its motion left halfway, so it speeds up into place. Ease out (out-expo, out-cubic) so it decelerates`);
    }
  }
  return out;
}
