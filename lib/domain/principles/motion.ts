/**
 * Motion principles: why something moves in a presentation and when it does not. From research on perception, animation and data visualization.
 * The measurable thresholds that follow from them are in motion-limits.ts. The `measured` rule says
 * which validation finding guards the principle.
 */

export interface MotionPrinciple {
  id: string;
  name: string;
  author: string;
  principle: string;
  why: string;
  slideApplication: string;
  /** Validation rule that measures the principle (rule in findings). */
  measured?: string;
}

export const MOTION_PRINCIPLES: readonly MotionPrinciple[] = [
  {
    id: 'motion-earns-its-place',
    name: 'Congruence and Apprehension',
    author: 'Tversky, Morrison and Betrancourt (2002)',
    principle: 'Animation helps only when its structure matches the structure of the idea and is simple enough to perceive.',
    why: 'Motion that carries no meaning is decoration. It costs attention and adds nothing to understanding.',
    slideApplication: 'Move things when order, change or connection matters: an argument that builds, a number that grows, a timeline that advances. A professional deck may not move at all, and that is a valid design.',
  },
  {
    id: 'preattentive-motion',
    name: 'Motion Captures Attention',
    author: 'Bartram and Ware (2002), Treisman',
    principle: 'Motion is the strongest preattentive signal. The eye goes to what moves before it reads anything.',
    why: 'Two things moving at once split attention. The audience looks at the motion, not at the speaker or the message.',
    slideApplication: 'One focal motion at a time: one hero motion per slide, blocks enter in reading order, nothing moves while the presenter talks over a settled slide.',
  },
  {
    id: 'common-fate',
    name: 'Common Fate',
    author: 'Wertheimer (Gestalt)',
    principle: 'Elements that move together are seen as one group.',
    why: 'Grouping by motion is as strong as grouping by proximity. Moving unrelated things together implies a relationship that is not there.',
    slideApplication: 'A block enters as one unit. Stagger between blocks, not within a sentence. Never animate text letter by letter or word by word.',
  },
  {
    id: 'object-constancy',
    name: 'Object Constancy',
    author: 'Heer and Robertson (2007)',
    principle: 'When the same object appears in two states, keep its identity visible across the change.',
    why: 'If a persisting element disappears and enters again, the audience has to re-find it. If it glides, they never lose it.',
    slideApplication: 'When a headline, logo or image continues to the next slide, use a shared transition so it glides into place instead of entering again.',
    measured: 'motion-shared',
  },
  {
    id: 'staging',
    name: 'Staging',
    author: 'Heer and Robertson (2007), Thomas and Johnston (1981)',
    principle: 'Present one change at a time. Complex changes are broken into stages.',
    why: 'Simultaneous changes exceed what the eye can track and nothing is understood.',
    slideApplication: 'Let the slide arrive, then its content, then click steps for arguments that build. At most a few steps per slide.',
    measured: 'motion-steps',
  },
  {
    id: 'slow-in-slow-out',
    name: 'Slow In and Slow Out',
    author: 'Thomas and Johnston (1981)',
    principle: 'Physical objects accelerate and decelerate. Entering elements decelerate into place, leaving elements accelerate away.',
    why: 'An element that arrives at full speed and stops dead feels mechanical. Deceleration tells the eye where the motion ends.',
    slideApplication: 'Ease out (out-expo, out-cubic) for entrances and incoming slides, ease in or ease in-out for exits. Linear motion only for continuous things like a line that draws.',
    measured: 'motion-easing',
  },
  {
    id: 'perceptual-timing',
    name: 'Perceptual Timing',
    author: 'Card, Moran and Newell (1983)',
    principle: 'Changes faster than about 100 ms are seen as a jump. Around 200 to 700 ms they read as motion. Beyond about a second the audience waits.',
    why: 'Too fast and the motion is lost, too slow and it delays the talk.',
    slideApplication: 'Entrances 300 to 900 ms, transitions 300 to 800 ms. A cut (0 ms) is a deliberate choice, not a short animation.',
    measured: 'motion-duration',
  },
  {
    id: 'distance-and-duration',
    name: 'Duration Follows Distance',
    author: 'Material Design motion',
    principle: 'Bigger moves need more time, small moves less.',
    why: 'Equal durations make long moves feel rushed and short moves feel sluggish.',
    slideApplication: 'A 24 px rise takes about 500 ms, a full slide push 600 to 800 ms with a strong ease out.',
  },
  {
    id: 'read-when-still',
    name: 'Reading Needs Stillness',
    author: 'Rayner (eye movement research)',
    principle: 'Text is read in fixations. Moving text cannot be read.',
    why: 'Until the slide settles, the audience waits instead of reading, and the presenter loses them.',
    slideApplication: 'All content of a slide entrance is still within a couple of seconds. Move the rest to click steps.',
    measured: 'motion-readable',
  },
  {
    id: 'one-figure-at-a-time',
    name: 'One Figure at a Time',
    author: 'Rubin, Koffka (Gestalt figure and ground)',
    principle: 'The eye reads one figure against its ground. Two texts in the same place at once are not two figures but noise.',
    why: 'A cross fade between two slides of text shows both headlines half transparent on top of each other. The audience sees a glitch instead of a change.',
    slideApplication: 'Between text slides the old slide leaves before the new one appears (fade through), or the slides move apart so their texts never cover the same place while both are legible.',
    measured: 'motion-overlap',
  },
  {
    id: 'repetition-predictability',
    name: 'Repetition Builds Predictability',
    author: 'Williams, Vignelli',
    principle: 'The same motion means the same thing across the deck. A different motion marks a different moment.',
    why: 'A consistent motion language becomes invisible and lets the content lead. Exceptions only work when they are rare.',
    slideApplication: 'One entrance and one transition carry the deck. Use an exception for the hook, the reveal or the ask, roughly one per five slides.',
    measured: 'motion-consistency',
  },
  {
    id: 'energy-is-tone',
    name: 'Energy Is Tone',
    author: 'Norman, Emotional Design (2004)',
    principle: 'How much and how springy things move is part of the voice of the brand.',
    why: 'A bouncing chart in a board update reads as unserious. A stiff fade in a consumer launch reads as dull.',
    slideApplication: 'Declare the intensity for the audience: still for boards and reports, subtle for investors and enterprise, expressive for launches and vision, kinetic for playful consumer brands. Overshoot (spring, bounce) only at kinetic.',
    measured: 'motion-intensity',
  },
  {
    id: 'vestibular-safety',
    name: 'Motion Sensitivity',
    author: 'WCAG 2.3.3',
    principle: 'Large zooms, spins and parallax can cause discomfort for people with vestibular disorders.',
    why: 'A presentation fills a big screen, so large motion fills the field of view.',
    slideApplication: 'The player honours reduced motion settings. Keep zoom and rotation small unless the deck is kinetic on purpose.',
  },
];
