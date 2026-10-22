/**
 * Fixed briefs for the eval (V008). No assets: the eval measures what the model makes from text and tools.
 * Briefs with photos and a logo come with the image layer.
 */
export interface EvalBrief {
  id: string;
  language: "en" | "cs";
  /** What the brief tests, so the results can be read. */
  probes: string;
  text: string;
}

export const BRIEFS: readonly EvalBrief[] = [
  {
    id: "seed-saas",
    language: "en",
    probes: "classic seed pitch, story beats, traction proof",
    text: "Seed pitch for Ledgerly, a B2B startup that automates invoice matching for mid-size finance teams. 14 months old, 38 paying customers, 2.1 M USD ARR, 9 percent monthly growth, raising 4 M USD. Audience: seed investors, first meeting.",
  },
  {
    id: "enterprise-sales",
    language: "en",
    probes: "persuasion for a skeptical buyer, comparison, proof",
    text: "Sales deck for Bastion, a compliance automation platform for regulated companies. Audience: chief information security officers at banks and insurers. Goal: book a technical pilot. Proof: cuts audit preparation from 11 weeks to 3, used by 60 regulated companies.",
  },
  {
    id: "board-update-cs",
    language: "cs",
    probes: "still, calm board update in Czech, numbers and decisions",
    text: "Čtvrtletní zpráva pro představenstvo logistické firmy Trans-Morava. Tržby za Q3 1,42 mld. Kč (plán 1,38), EBITDA marže 11,8 procenta (loni 10,9), dvě rizika: ceny paliv a odchod klíčového dopravce. Představenstvo má rozhodnout o koupi dvou skladů za 180 mil. Kč. Klidný, věcný tón.",
  },
  {
    id: "finance-analysis",
    language: "en",
    probes: "analytic deck with charts, bridge, margins, valuation",
    text: "Equity research style deck on Corvane Industries, a mid-cap industrial automation company. Revenue 2021 to 2024: 410, 455, 540, 612 M EUR, 2025 estimate 690. Operating margin 12.1, 12.8, 14.2, 15.0 percent. Net debt falls from 1.9x to 0.9x EBITDA. Show the revenue bridge 2023 to 2024 by segment (Robotics +48, Sensors +17, Services +9, FX -2), margin trend and valuation at 11x EV/EBITDA. Audience: portfolio managers.",
  },
  {
    id: "product-launch",
    language: "en",
    probes: "kinetic launch, hero moment, emotion",
    text: "Launch keynote for Halo One, a wireless speaker that tunes itself to the room in 4 seconds. Audience: tech press and early adopters. Ships next month at 249 USD. Make it feel like an event.",
  },
  {
    id: "consumer-app-cs",
    language: "cs",
    probes: "playful tone in Czech, community, short copy",
    text: "Pitch aplikace Spolujízda pro sdílení jízd mezi sousedy v malých městech. 14 000 uživatelů za 8 měsíců, 62 procent jízd se opakuje, průměrná jízda ušetří 87 Kč. Hledáme 15 mil. Kč na rozšíření do dalších 20 měst. Publikum: byznys andělé.",
  },
  {
    id: "nonprofit",
    language: "en",
    probes: "emotional story without photos, one number that matters",
    text: "Fundraising deck for Clearwell, a charity that builds water wells in rural Kenya. 212 wells built, 340 000 people served, 94 percent still working after 5 years, a well costs 7 800 USD. Audience: foundations and major donors. Ask: 1.2 M USD for 150 more wells.",
  },
  {
    id: "internal-strategy-cs",
    language: "cs",
    probes: "text-heavy internal strategy, restraint, hierarchy",
    text: "Interní strategie 2027 pro ředitelství výrobní firmy Kovoplast. Tři priority: snížit odpad z 6,2 na 4 procenta, spustit druhou směnu v závodě v Brně, vstoupit na polský trh přes distributora. Pro každou cíl, rozpočet (14, 22, 9 mil. Kč) a odpovědnou osobu (Petra Novotná, Martin Kolář, Eva Dvořáková). Publikum: vedení firmy.",
  },
  {
    id: "brand-given",
    language: "en",
    probes: "given brand color and tone, premium advisory",
    text: "Pitch for Marlowe & Finch, a boutique advisory firm for family-owned businesses planning succession. Brand color #0B6E4F (deep green), tone: refined and editorial. 23 successions completed, average family business value 48 M EUR, 100 percent of clients stayed in the family. Audience: owners of family businesses over 60 years old.",
  },
  {
    id: "devtools",
    language: "en",
    probes: "technical product, precision, product explanation",
    text: "Product deck for Tracewell, an observability tool that finds the cause of a production incident in minutes by linking traces, logs and deploys. Audience: engineering leads at companies with 50 to 500 engineers. Median time to diagnose drops from 47 to 9 minutes in the design partner group of 12 teams.",
  },
];
