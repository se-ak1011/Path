// Practitioner resource library for PATH — session guides, therapy approaches and
// in-session exercises for two client populations that map to the wider
// ecosystem: chronic illness (Hassle) and alcohol/addiction (Alchono).
//
// This is evidence-informed guidance for qualified practitioners to adapt to the
// individual client — not a protocol, and not a substitute for training,
// supervision or clinical judgement.

export type ResourceCategory = 'chronic_illness' | 'alcohol';
export type ResourceType = 'approach' | 'guide' | 'exercise';

export interface ResourceSection { heading: string; body: string[]; }

export interface Resource {
  id: string;
  category: ResourceCategory;
  type: ResourceType;
  title: string;
  summary: string;
  meta: string;                 // e.g. "In session · 10 min"
  sections: ResourceSection[];
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  chronic_illness: 'Chronic illness',
  alcohol: 'Alcohol & addiction',
};

export const TYPE_LABELS: Record<ResourceType, string> = {
  approach: 'Approach',
  guide: 'Session guide',
  exercise: 'Exercise',
};

export const TYPE_ICON: Record<ResourceType, string> = {
  approach: 'psychology',
  guide: 'menu-book',
  exercise: 'self-improvement',
};

export const RESOURCES: Resource[] = [
  // ─────────────────────────────  CHRONIC ILLNESS  ─────────────────────────────
  {
    id: 'ci-act',
    category: 'chronic_illness',
    type: 'approach',
    title: 'ACT for chronic illness',
    summary: 'Acceptance and Commitment Therapy for living well alongside symptoms that may not go away.',
    meta: 'Approach · ongoing',
    sections: [
      { heading: 'Why it fits', body: [
        'Chronic illness often can’t be “fixed”. ACT shifts the goal from symptom elimination to a valued life carried alongside symptoms.',
        'Strong evidence base for chronic pain and long-term conditions; reduces the struggle that amplifies suffering.',
      ]},
      { heading: 'Core processes', body: [
        'Acceptance — making room for uncomfortable sensations rather than fighting them.',
        'Cognitive defusion — noticing thoughts (“I can’t cope”) as thoughts, not commands.',
        'Values — clarifying what matters even when energy is limited.',
        'Committed action — small, workable steps toward those values.',
      ]},
      { heading: 'In the room', body: [
        'Use the “struggle switch” and “tug of war with a monster” metaphors for acceptance.',
        'Watch for experiential avoidance driving deconditioning and isolation.',
        'Anchor homework to values, not to symptom reduction.',
      ]},
    ],
  },
  {
    id: 'ci-pacing',
    category: 'chronic_illness',
    type: 'exercise',
    title: 'Activity pacing & the boom–bust cycle',
    summary: 'Break the overactivity-then-crash pattern with steady, quota-based activity.',
    meta: 'Exercise · homework',
    sections: [
      { heading: 'The pattern', body: [
        'On good days the client overdoes it (“boom”), triggers a flare, then rests completely (“bust”) — reinforcing the cycle and lowering the baseline over time.',
      ]},
      { heading: 'Steps', body: [
        'Baseline: find the amount of an activity that can be done on a bad day without a flare.',
        'Set a quota slightly below that baseline — done regardless of how they feel that day.',
        'Increase the quota gradually (~10%) once stable, not on impulse.',
        'Build in planned rest before fatigue, not after the crash.',
      ]},
      { heading: 'Therapist notes', body: [
        'Perfectionism and “all or nothing” beliefs often drive the boom. Explore gently.',
        'Frame pacing as a skill that expands life, not a restriction.',
      ]},
    ],
  },
  {
    id: 'ci-first-session',
    category: 'chronic_illness',
    type: 'guide',
    title: 'First session: adjustment to diagnosis',
    summary: 'A structure for the initial session with a newly- or long-diagnosed client.',
    meta: 'Session guide · 50 min',
    sections: [
      { heading: 'Open', body: [
        'Normalise the range of reactions — grief, anger, relief, fear — without rushing to reframe.',
        'Ask for their story of the illness in their own words before any assessment.',
      ]},
      { heading: 'Assess', body: [
        'Impact on identity, roles, relationships, work and future plans.',
        'Mood and risk — chronic illness raises rates of depression and anxiety (consider PHQ-9 / GAD-7).',
        'Coping so far: what’s helped, what’s made things worse.',
      ]},
      { heading: 'Formulate & agree', body: [
        'Name the losses and the adjustment task honestly.',
        'Agree realistic, values-based goals — coping and quality of life, not cure.',
        'Set expectations about pacing of the work itself.',
      ]},
    ],
  },
  {
    id: 'ci-grief',
    category: 'chronic_illness',
    type: 'exercise',
    title: 'Naming the losses',
    summary: 'A structured grief-and-adjustment exercise for what illness has taken.',
    meta: 'Exercise · in session',
    sections: [
      { heading: 'Purpose', body: [
        'Adjustment to chronic illness is a grief process. Unspoken losses fuel low mood and stuckness.',
      ]},
      { heading: 'Steps', body: [
        'Invite the client to name concrete losses — activities, roles, spontaneity, an imagined future.',
        'Validate each without problem-solving. Let the loss be real.',
        'Then gently explore what remains and what can be rebuilt in a new form.',
        'Close by identifying one value they can still honour this week.',
      ]},
    ],
  },
  {
    id: 'ci-flare-plan',
    category: 'chronic_illness',
    type: 'exercise',
    title: 'Flare-up coping plan',
    summary: 'A pre-agreed plan the client follows when symptoms spike.',
    meta: 'Exercise · homework',
    sections: [
      { heading: 'Why', body: [
        'Flares narrow thinking and drive panic or total shutdown. A plan made in calm reduces both.',
      ]},
      { heading: 'Build the plan', body: [
        'Early warning signs the client can notice.',
        'Two or three soothing, low-demand actions (breathing, warmth, gentle movement, a message to a trusted person).',
        'Permission scripts — what they’re allowed to drop guilt-free during a flare.',
        'When to seek medical help vs. ride it out.',
      ]},
    ],
  },

  // ─────────────────────────────  ALCOHOL & ADDICTION  ─────────────────────────
  {
    id: 'al-mi',
    category: 'alcohol',
    type: 'approach',
    title: 'Motivational Interviewing',
    summary: 'A collaborative, non-confrontational way to strengthen a client’s own motivation to change.',
    meta: 'Approach · ongoing',
    sections: [
      { heading: 'Spirit', body: [
        'Partnership, acceptance, compassion, evocation. Change talk is drawn out, not imposed.',
        'Rolling with resistance beats arguing — confrontation raises defensiveness and drinking.',
      ]},
      { heading: 'OARS skills', body: [
        'Open questions — “What would you like to be different about your drinking?”',
        'Affirmations — genuine recognition of strengths and effort.',
        'Reflections — especially of change talk.',
        'Summaries — gather change talk and hand it back.',
      ]},
      { heading: 'Tools', body: [
        'Importance and confidence rulers (0–10) — “Why a 6 and not a 3?” pulls for change talk.',
        'Listen for DARN-CAT: Desire, Ability, Reasons, Need → Commitment, Activation, Taking steps.',
      ]},
    ],
  },
  {
    id: 'al-first-session',
    category: 'alcohol',
    type: 'guide',
    title: 'First session: alcohol assessment & goals',
    summary: 'Structure the initial session — assess, gauge motivation, agree a goal.',
    meta: 'Session guide · 50 min',
    sections: [
      { heading: 'Assess', body: [
        'Pattern: quantity, frequency, context, what drinking does for them.',
        'Screen (e.g. AUDIT) and ask about dependence — morning drinking, withdrawal, tolerance.',
        'Safety: never advise abrupt cessation where physical dependence is likely — signpost to medical support for detox.',
      ]},
      { heading: 'Motivation', body: [
        'Use importance/confidence rulers rather than pushing.',
        'Explore ambivalence openly — both sides are real to them.',
      ]},
      { heading: 'Agree a goal', body: [
        'Moderation vs. abstinence — the client’s choice, informed by risk and dependence.',
        'Set a first-step drinking diary as homework.',
      ]},
    ],
  },
  {
    id: 'al-urge-surfing',
    category: 'alcohol',
    type: 'exercise',
    title: 'Urge surfing',
    summary: 'Ride out a craving mindfully instead of fighting or feeding it.',
    meta: 'Exercise · 10 min',
    sections: [
      { heading: 'The idea', body: [
        'Cravings rise, peak and fall like a wave — usually within 20–30 minutes. You don’t have to act on them or fight them; you can surf them.',
      ]},
      { heading: 'Guide the client', body: [
        'Notice the urge and where it sits in the body — tightness, restlessness, salivation.',
        'Breathe into that area with curiosity, not judgement.',
        'Describe the sensation as it changes — rising, cresting, easing.',
        'Remind them: an urge is not a command, and it will pass whether or not they drink.',
      ]},
      { heading: 'Carry it out of the room', body: [
        'Pair with a simple action from their world — step outside, message a trusted person, a glass of water.',
        'This mirrors the Alchono “urge” flow clients may already use between sessions.',
      ]},
    ],
  },
  {
    id: 'al-decisional-balance',
    category: 'alcohol',
    type: 'exercise',
    title: 'Decisional balance',
    summary: 'Map the pros and cons of drinking vs. changing to surface ambivalence.',
    meta: 'Exercise · in session',
    sections: [
      { heading: 'Grid', body: [
        'Four boxes: benefits of drinking, costs of drinking, benefits of changing, costs of changing.',
        'Fill all four honestly — the “benefits of drinking” box builds trust and reveals what change must replace.',
      ]},
      { heading: 'Use it well', body: [
        'Don’t argue with the pro-drinking column — understand the need it meets.',
        'Reflect and summarise the change side; let the client draw the conclusion.',
      ]},
    ],
  },
  {
    id: 'al-relapse-prevention',
    category: 'alcohol',
    type: 'approach',
    title: 'Relapse prevention (Marlatt)',
    summary: 'Identify high-risk situations and build coping before they arise.',
    meta: 'Approach · ongoing',
    sections: [
      { heading: 'Key ideas', body: [
        'Relapse is a process, not a single event — spot the chain early.',
        'Distinguish a lapse (one drink) from a relapse; the “abstinence violation effect” (guilt → “I’ve blown it”) turns one into the other.',
      ]},
      { heading: 'Build resilience', body: [
        'Map high-risk situations — emotional states, social pressure, celebration, routine cues.',
        'Rehearse specific coping for each; use if-then plans (“If offered a drink at X, then I’ll…”).',
        'Address the “seemingly irrelevant decisions” that walk a client toward risk.',
      ]},
    ],
  },
  {
    id: 'al-halt',
    category: 'alcohol',
    type: 'exercise',
    title: 'HALT & trigger mapping',
    summary: 'A quick self-check for the states that most often precede a drink.',
    meta: 'Exercise · homework',
    sections: [
      { heading: 'HALT', body: [
        'Hungry, Angry, Lonely, Tired — four states that lower resistance to cravings.',
        'Teach the client to pause and ask “Am I HALT?” before deciding, and to meet the real need.',
      ]},
      { heading: 'Trigger map', body: [
        'Together, list personal triggers: people, places, times, feelings.',
        'For each, agree one concrete coping move.',
        'Review and refine the map across sessions as patterns become clearer.',
      ]},
    ],
  },
  {
    id: 'al-drink-refusal',
    category: 'alcohol',
    type: 'exercise',
    title: 'Drink-refusal skills',
    summary: 'Practise assertive, low-friction ways to say no.',
    meta: 'Exercise · role-play',
    sections: [
      { heading: 'Why rehearse', body: [
        'Social pressure is a top relapse trigger. Confidence comes from practice, not intention.',
      ]},
      { heading: 'Skills to role-play', body: [
        'A clear, brief “No thanks, I’m good” without over-explaining or apologising.',
        'Offer an alternative — “I’ll get a lime and soda.”',
        'Change the subject or leave early with a pre-planned exit.',
        'Have a ready line for persistent offers, said calmly and repeated.',
      ]},
    ],
  },
];

export function getResource(id: string): Resource | undefined {
  return RESOURCES.find(r => r.id === id);
}
