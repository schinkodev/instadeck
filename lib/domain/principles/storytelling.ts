/**
 * Principy storytellingu (převzato ze slyde-saas, src/lib/layers/storytelling-principles.ts).
 * Struktura příběhu, pořadí argumentů a role jednotlivých slidů.
 */

export interface StorytellingPrinciple {
  id: string;
  name: string;
  author: string;
  category: 'narrative' | 'persuasion' | 'slide-structure';
  principle: string;
  why: string;
  outlineApplication: string;
  contraindications?: string;
}

export const STORYTELLING_PRINCIPLES: readonly StorytellingPrinciple[] = [
  // Narrative Structure
  {
    id: 'pyramid-principle',
    name: 'Pyramid Principle',
    author: 'Barbara Minto',
    category: 'narrative',
    principle: 'Lead with the answer, then support with evidence. Audiences are not detectives; they should not have to guess where the presentation is going.',
    why: 'When the conclusion comes first, every subsequent slide has a clear purpose: proving the claim. Without it, slides feel like random facts.',
    outlineApplication: 'State the conclusion on slide 2. Spend the rest proving it. Each slide is evidence for the opening claim.',
    contraindications: 'Narrative decks where the reveal IS the point (product launches, creative pitches).',
  },
  {
    id: 'situation-complication-resolution',
    name: 'Situation-Complication-Resolution',
    author: 'Minto/McKinsey',
    category: 'narrative',
    principle: 'Three phases: here is the current state, here is what broke or changed, here is what we propose.',
    why: 'Without the complication, there is no reason to listen. The complication creates the urgency that makes the resolution valuable.',
    outlineApplication: 'First third establishes context. Middle third presents the problem or change. Final third delivers the solution and proof.',
  },
  {
    id: 'sparkline',
    name: 'Sparkline',
    author: 'Nancy Duarte',
    category: 'narrative',
    principle: 'Alternate between "what is" and "what could be" throughout the deck. Each transition pulls the audience out of the status quo.',
    why: 'Not a one-time before/after, but a recurring wave pattern. Duarte found this structure in every major keynote from Jobs to MLK.',
    outlineApplication: 'Interleave reality slides with vision slides. Current state, then possibility. Pain point, then solution. Repeat the wave.',
    contraindications: 'Pure data/analytical decks where emotional contrast would feel forced.',
  },
  {
    id: 'monroes-motivated-sequence',
    name: "Monroe's Motivated Sequence",
    author: 'Alan Monroe',
    category: 'narrative',
    principle: 'Attention, Need, Satisfaction, Visualization, Action. A persuasion funnel that remains the most effective structure for pitch decks.',
    why: 'Each phase must be present. Skipping "Need" makes "Satisfaction" feel unmotivated. Skipping "Visualization" makes "Action" feel premature.',
    outlineApplication: 'Open with attention grab. Establish the need. Present your solution. Help them visualize the outcome. Close with a specific call to action.',
  },
  {
    id: 'narrative-arc',
    name: 'Narrative Arc',
    author: 'Freytag/McKee',
    category: 'narrative',
    principle: 'Setup, rising tension, climax, resolution. Not every presentation is a story, but every good presentation has a tension curve.',
    why: 'Flat energy across slides means the audience checks out. The arc creates anticipation and payoff.',
    outlineApplication: 'Map your slides to a tension curve. Energy should build toward a climax in the final third, then resolve cleanly.',
  },

  // Persuasion Sequencing
  {
    id: 'ethos-logos-pathos',
    name: 'Ethos-Logos-Pathos',
    author: 'Aristotle',
    category: 'persuasion',
    principle: 'First establish credibility (who you are, what you have achieved), then present logic (data, evidence), then appeal to emotion (vision, impact).',
    why: 'In reverse order it feels like manipulation. Credibility must precede data, and data must precede emotional appeal.',
    outlineApplication: 'Early slides establish authority (credentials, track record). Middle slides present evidence. Late slides appeal to vision and impact.',
  },
  {
    id: 'curiosity-gap',
    name: 'Curiosity Gap',
    author: 'Loewenstein/Heath Brothers',
    category: 'persuasion',
    principle: 'Open a question, let it hang, then answer it. The brain cannot tolerate open loops.',
    why: '"Made to Stick" is built on this principle. An unanswered question keeps the audience engaged until resolution.',
    outlineApplication: 'Pose a big question early (slide 2-3). Let it hang through supporting slides. Answer it in the final third.',
  },
  {
    id: 'stakes-escalation',
    name: 'Stakes Escalation',
    author: 'McKee',
    category: 'persuasion',
    principle: 'Each section must raise the stakes. Never plateau.',
    why: 'If slide 5 is less important than slide 4, the sequence is wrong. The arc must build, not meander.',
    outlineApplication: 'Order slides so each one matters more than the last. Save the strongest proof point for late in the deck.',
  },
  {
    id: 'contrast-principle',
    name: 'Contrast Principle',
    author: 'Duarte/Cialdini',
    category: 'persuasion',
    principle: 'Before/after, problem/solution, old/new, always placed side by side. Juxtaposition amplifies the difference.',
    why: '"This is how it was, this is how it will be" is stronger than either statement in isolation.',
    outlineApplication: 'Place problem slides immediately before solution slides. Place "before" metrics next to "after" metrics.',
  },

  // Slide-Level Structure
  {
    id: 'assertion-evidence',
    name: 'Assertion-Evidence',
    author: 'Michael Alley',
    category: 'slide-structure',
    principle: 'Every slide asserts one thing. The heading is a claim ("Revenue grew 3x"), not a topic label ("Revenue").',
    why: 'This single change improves any presentation. Topic labels force the audience to find the point themselves.',
    outlineApplication: 'Every slide heading must be a complete assertion. Not "Our Team" but "12 engineers with 80 years of combined fintech experience".',
  },
  {
    id: 'rule-of-three',
    name: 'Rule of Three',
    author: 'Classical Rhetoric',
    category: 'slide-structure',
    principle: 'Three points, three examples, three sections. The brain clusters in threes.',
    why: 'Two feels incomplete, four feels excessive. Applies at every level: three sections in the deck, three points per slide.',
    outlineApplication: 'Structure the deck in three acts. Each slide has at most three key points. Three supporting examples per claim.',
  },
  {
    id: 'progressive-disclosure',
    name: 'Progressive Disclosure',
    author: 'Cognitive Science/Norman',
    category: 'slide-structure',
    principle: 'Reveal complexity gradually. Big picture first, then details.',
    why: 'Never open with a complex chart. When everything is presented at once, the audience absorbs nothing.',
    outlineApplication: 'Start with the high-level message. Each subsequent slide adds one layer of detail. Save the complex data for after the concept is established.',
  },
  {
    id: 'one-controlling-idea',
    name: 'One Controlling Idea',
    author: 'Robert McKee',
    category: 'slide-structure',
    principle: 'The entire deck serves one thesis. Every slide must pass the test: "does this support the one main argument?"',
    why: 'This is not about having one theme; it is about having one argument. Slides that fail the test should be cut.',
    outlineApplication: 'Define the controlling idea before structuring slides. Test every slide against it. Cut anything that does not advance the argument.',
  },
  {
    id: 'bookend-callback',
    name: 'Bookend Callback',
    author: 'Classical Rhetoric',
    category: 'slide-structure',
    principle: 'Return to the opening image or idea at the end. Creates closure and a sense of completeness.',
    why: 'Stronger than a generic "Questions?" slide. The callback signals the argument is complete.',
    outlineApplication: 'Reference the opening hook in the closing slide. If you opened with a question, close with the answer. If you opened with a problem, close with the transformation.',
  },
];
