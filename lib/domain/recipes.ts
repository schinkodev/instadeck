/**
 * Recepty slidů: osvědčené kompozice pro jednotlivé beaty příběhu. Model skládá slide z receptu pro jeho
 * beat, nebo z vlastní kompozice, místo aby kopíroval slidy vzorového decku. Každý recept má dobrý
 * a špatný příklad, protože kontrastní dvojice učí lépe než pravidlo. Test hlídá, že layouty a beaty existují
 * a že každý beat má aspoň jeden recept.
 */

export interface SlideRecipe {
  id: string;
  beats: readonly string[];
  layout: string;
  /** Jak slide složit: které bloky, co v nich, tón. */
  compose: string;
  good: string;
  bad: string;
  why: string;
}

export const SLIDE_RECIPES: readonly SlideRecipe[] = [
  {
    id: "surprising-fact",
    beats: ["hook"],
    layout: "statement",
    compose: "One display heading that states a surprising fact with its number. Optional support: one line on why it matters to this audience.",
    good: "\"Europe throws away 4.2 B EUR of clean energy every year\" / support: \"Because the grid cannot take it when the wind blows.\"",
    bad: "\"Welcome to Northwind\" or \"About us\".",
    why: "A fact the audience did not know opens a curiosity gap (Loewenstein). A greeting wastes the most attentive minute.",
  },
  {
    id: "promise-title",
    beats: ["hook"],
    layout: "title",
    compose: "Company name as the title, the promise as a one line subtitle with a verb, meeting context in meta.",
    good: "Title \"Ledgerly\" / subtitle \"Invoices that match themselves\" / meta \"Seed round, October 2026\".",
    bad: "Subtitle \"Innovative AP automation platform\": a category, not a promise.",
    why: "The first slide is on screen while people settle. A promise gives them something to listen for.",
  },
  {
    id: "cost-of-problem",
    beats: ["problem"],
    layout: "headline-stat",
    compose: "Heading states the consequence as a sentence. The stat is the cost (time, money, risk) with its unit and period. Support names who pays it.",
    good: "\"Finance teams lose a week every month to matching\" / stat 38 h per month / \"in a mid-size AP team\".",
    bad: "\"The problem\" with five bullets of pains.",
    why: "A number makes the pain concrete and comparable. One number is remembered, five bullets are not.",
  },
  {
    id: "voice-of-pain",
    beats: ["problem"],
    layout: "quote",
    compose: "A real customer quote that names the pain in their words, with name, role and company.",
    good: "\"We close the month in nine days, six of them are spent chasing invoices.\" Head of finance, Brightline.",
    bad: "A made up quote or one without a name and role.",
    why: "A peer voice carries credibility the presenter does not have (ethos). It must be real, ask the user for it.",
  },
  {
    id: "three-shifts",
    beats: ["why-now"],
    layout: "cards",
    compose: "Heading: why this is solvable now. Three cards, each one shift (technology, regulation, behavior) with a year or a number in the title.",
    good: "Cards \"2024: e-invoicing becomes mandatory\", \"Bank APIs open by law\", \"Models read any invoice\".",
    bad: "Cards \"Innovation\", \"Growth\", \"Digital\": topics without evidence.",
    why: "Investors ask why nobody did it before. Dated, concrete shifts answer that.",
  },
  {
    id: "inflection-chart",
    beats: ["why-now", "market"],
    layout: "chart",
    compose: "Line or column chart where the bend is visible, the year of the bend highlighted. Heading states what changed.",
    good: "\"Battery prices fell 90% in ten years\" with the last year highlighted.",
    bad: "A chart titled \"Market data\" with every bar in the same color.",
    why: "The shape of the curve is the argument. Highlight the one point the slide is about (Knaflic).",
  },
  {
    id: "one-sentence-solution",
    beats: ["solution"],
    layout: "statement",
    compose: "The solution as one sentence with a verb and the moment of value. Optional support: how, in one line. Can use the accent tone once.",
    good: "\"Ledgerly matches every invoice to its order before anyone opens it.\"",
    bad: "\"A next generation, end-to-end, intelligent platform\": adjectives instead of what it does.",
    why: "The thesis of the deck (propositio). If it does not fit in a sentence, the audience cannot repeat it.",
  },
  {
    id: "product-proof",
    beats: ["solution", "product"],
    layout: "text-image",
    compose: "Heading states what the user sees or gets. Body: two or three short points or one stat. Image: the real product screenshot, cropped to the part that matters.",
    good: "\"Exceptions land in one queue, everything else is already paid\" with the queue screenshot.",
    bad: "A full browser window screenshot with tiny unreadable UI, or a stock photo.",
    why: "Seeing the product is proof that it exists. Crop to the detail that carries the claim. Ask the user for screenshots.",
  },
  {
    id: "three-steps",
    beats: ["product", "go-to-market"],
    layout: "cards",
    compose: "Heading: the outcome of the flow. Three cards titled with verbs (Connect, Match, Review), one sentence each.",
    good: "\"From inbox to approved payment in three steps\" / Connect, Match, Review.",
    bad: "A points slide with three long sentences that leaves half the slide empty.",
    why: "Parallel cards show a process at a glance (common region). Verbs make it a flow, not a list.",
  },
  {
    id: "before-after",
    beats: ["product", "competition", "solution"],
    layout: "comparison",
    compose: "Two columns: the old way and the new way, three to four matching rows, our column highlighted.",
    good: "Before: \"9 days to close\", \"6 people\" / After: \"3 days\", \"2 people\".",
    bad: "Rows that do not match across the columns, so nothing can be compared.",
    why: "Juxtaposition amplifies the difference (Duarte, contrast). Matching rows make it readable in seconds.",
  },
  {
    id: "hero-metric",
    beats: ["traction"],
    layout: "headline-stat",
    compose: "The strongest number with its period as the stat, heading says what it means, support gives the base.",
    good: "\"Revenue tripled in twelve months\" / 2.1 M USD ARR / \"38 paying customers, 9% monthly growth\".",
    bad: "\"Traction\" with four equal numbers and no message.",
    why: "Lead with the strongest proof. One dominant number per slide (Williams, contrast).",
  },
  {
    id: "growth-chart",
    beats: ["traction", "financials"],
    layout: "chart-insight",
    compose: "Chart of the metric over time with the latest or the target period highlighted, insight: one stat that explains the slope.",
    good: "Monthly ARR bars with the last month highlighted, insight \"9% month over month\".",
    bad: "A chart without a heading that states the finding, or with three series in three colors.",
    why: "The chart proves the trend, the insight names it. Assertion plus evidence (Alley).",
  },
  {
    id: "logo-wall",
    beats: ["traction"],
    layout: "logos",
    compose: "Heading: who uses or backs it, as a sentence. Four to eight customer logos, support: the common thread.",
    good: "\"60 regulated companies run their audits on Bastion\" with eight logos.",
    bad: "Logos of companies that only took a demo, or a heading \"Our customers\".",
    why: "Social proof from recognizable names. Only use logos the user confirms.",
  },
  {
    id: "customer-voice",
    beats: ["traction", "competition"],
    layout: "quote",
    compose: "One real quote about the result, with name, role and company. Short enough to read in five seconds.",
    good: "\"We cut audit preparation from eleven weeks to three.\" CISO, Nordbank.",
    bad: "A quote that praises the team instead of the result.",
    why: "A result in a customer's words is the strongest traction after revenue.",
  },
  {
    id: "bottom-up-market",
    beats: ["market"],
    layout: "stats",
    compose: "Three numbers that multiply: customers, price per year, market. Heading states the market as a sentence.",
    good: "41 000 mid-size companies x 18 000 USD a year = 740 M USD serviceable market.",
    bad: "\"TAM 400 B USD\" from an analyst report with no logic.",
    why: "Bottom up logic is checkable and believable, a top down number is not.",
  },
  {
    id: "unit-economics",
    beats: ["business-model"],
    layout: "stats",
    compose: "Two to four numbers that show the model is healthy: price, gross margin, payback, net revenue retention. Heading: the conclusion.",
    good: "\"Every customer pays back in five months\" / 18 k USD ACV, 82% margin, 5 months payback.",
    bad: "A pricing table with every feature listed.",
    why: "Investors judge the business on a few ratios. Show those, keep pricing detail for the appendix.",
  },
  {
    id: "pricing-tiers",
    beats: ["business-model", "ask"],
    layout: "table",
    compose: "Up to three tiers as columns or rows, highlight the one you recommend, a short heading with the starting price.",
    good: "\"Start at 990 EUR a month, most teams choose Growth\" with Growth highlighted.",
    bad: "Six tiers and fifteen rows of checkmarks.",
    why: "Buyers compare few options well (cognitive load). The highlight is your recommendation.",
  },
  {
    id: "honest-comparison",
    beats: ["competition"],
    layout: "comparison",
    compose: "Us against the real alternative (often a spreadsheet or doing nothing) on three to four dimensions buyers care about. Our column highlighted.",
    good: "Spreadsheet versus Ledgerly on time to close, error rate, audit trail.",
    bad: "A 2x2 where we are alone in the top right, or a feature grid where only we have checkmarks.",
    why: "An honest comparison builds trust (refutatio). Buyers know the alternatives.",
  },
  {
    id: "channels-with-proof",
    beats: ["go-to-market"],
    layout: "cards",
    compose: "Two or three channels, each with its early proof as a number in the card.",
    good: "\"Partners: 14 accounting firms refer clients\", \"Content: 40% of signups from our close checklist\".",
    bad: "\"Sales, marketing, partnerships\" without any number.",
    why: "A channel with proof is a plan, a channel without proof is a wish.",
  },
  {
    id: "milestones-to-ask",
    beats: ["roadmap"],
    layout: "timeline",
    compose: "Three to five milestones, the current one marked, the last one is what the ask unlocks.",
    good: "Q1 EU launch, Q2 50 customers, Q4 break even, marked at Q1.",
    bad: "Ten milestones over five years with no link to the ask.",
    why: "A roadmap tied to the ask answers what the money buys.",
  },
  {
    id: "why-us-team",
    beats: ["team"],
    layout: "team",
    compose: "Two to four people, each with one line of credibility that matters for this company.",
    good: "\"Ran AP automation at SAP for 8 years\".",
    bad: "Full CVs, or a bio placeholder because the user did not give one.",
    why: "The audience asks why these people. One relevant fact answers it. Ask the user for real bios.",
  },
  {
    id: "plan-with-assumptions",
    beats: ["financials"],
    layout: "chart-insight",
    compose: "Revenue by year, actuals and plan clearly told apart in the categories (2024A, 2025E), insight: the two assumptions the plan rests on.",
    good: "Bars 2023A to 2027E, insight \"120 new customers a year, 92% retention\".",
    bad: "A hockey stick without assumptions.",
    why: "A plan is only as credible as its assumptions (Toulmin warrant).",
  },
  {
    id: "risks-with-response",
    beats: ["risks"],
    layout: "table",
    compose: "Two to four risks as rows with impact and the response or trigger.",
    good: "\"Fuel prices | high | hedged 60% to Q2\".",
    bad: "A list of risks with no response.",
    why: "A board wants to see that risks are owned, not only known.",
  },
  {
    id: "decision-options",
    beats: ["decision"],
    layout: "comparison",
    compose: "The options side by side with cost and impact, the recommended one highlighted, heading states the decision asked for.",
    good: "\"We ask the board to approve buying both warehouses\" / Buy vs Lease, recommended Buy.",
    bad: "A decision slide without options, or options without a recommendation.",
    why: "Minto: answer first, then the options that support it. A board decides faster with a recommendation.",
  },
  {
    id: "use-of-funds",
    beats: ["ask"],
    layout: "cards",
    compose: "The raise split into two to four uses, each with its share and what it unlocks.",
    good: "\"Engineering 50%: EU launch\", \"Sales 35%: 50 customers\", \"Ops 15%\".",
    bad: "A pie chart of percentages without what they unlock.",
    why: "The audience wants to know what their money changes, not only where it goes.",
  },
  {
    id: "ask-callback",
    beats: ["ask", "decision"],
    layout: "closing",
    compose: "Heading calls back to the hook. The call to action is the amount and use, or one next step with a date and a contact.",
    good: "Hook was \"4.2 B EUR thrown away\", closing \"Let's keep it on the grid\" / \"Raising 4 M EUR, pilot with you in Q1\".",
    bad: "\"Thank you! Questions?\"",
    why: "A bookend closes the loop (classical rhetoric). The last slide stays on screen during questions, it must carry the ask.",
  },
];

export function recipesFor(beat: string): SlideRecipe[] {
  return SLIDE_RECIPES.filter((r) => r.beats.includes(beat));
}

export const RECIPE_GUIDANCE =
  "Compose each slide from a recipe for its beat (or your own composition when none fits). Read the good and the bad example: the bad one is the habit to avoid. Take the rhythm and the text lengths of the whole deck from an example, never copy its slides.";
