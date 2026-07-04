// Outcome-measure definitions and scoring for PATH.
// All instruments here are free to use and validated screening tools. Scores are
// indicative only and never a diagnosis — clinical judgement stays with the
// therapist, who administers and interprets them.
//
//   PHQ-9   depression        (Pfizer, free)
//   GAD-7   anxiety           (Pfizer, free)
//   CORE-10 global distress   (CORE System Trust, free)
//   ASRS    adult ADHD        (WHO, ASRS v1.1 6-item screener, CC-BY)
//   PCL-5   PTSD              (US National Center for PTSD, public domain)

export type Instrument = 'phq9' | 'gad7' | 'core10' | 'asrs' | 'pcl5';
export type Severity = 'low' | 'mild' | 'moderate' | 'high';

export interface InstrumentDef {
  id: Instrument;
  name: string;
  subtitle: string;
  prompt: string;
  items: string[];
  options: { label: string; value: number }[];
  // 'sum' (default) adds item scores; 'count' counts items meeting a per-item
  // threshold (used by the ASRS screener).
  scoring?: 'sum' | 'count';
  thresholds?: number[];        // ASRS: min value for an item to count as positive
  reverseItems?: number[];      // CORE-10: positively-worded items are reverse-scored
  band: (score: number) => { label: string; severity: Severity };
  max: number;
  note?: string;                // shown under the score (e.g. citation / caveat)
}

const FREQ_0_3 = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
];

const CORE_0_4 = [
  { label: 'Not at all', value: 0 },
  { label: 'Only occasionally', value: 1 },
  { label: 'Sometimes', value: 2 },
  { label: 'Often', value: 3 },
  { label: 'Most or all the time', value: 4 },
];

const ASRS_0_4 = [
  { label: 'Never', value: 0 },
  { label: 'Rarely', value: 1 },
  { label: 'Sometimes', value: 2 },
  { label: 'Often', value: 3 },
  { label: 'Very often', value: 4 },
];

const PCL_0_4 = [
  { label: 'Not at all', value: 0 },
  { label: 'A little bit', value: 1 },
  { label: 'Moderately', value: 2 },
  { label: 'Quite a bit', value: 3 },
  { label: 'Extremely', value: 4 },
];

export const INSTRUMENTS: Record<Instrument, InstrumentDef> = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    subtitle: 'Depression',
    prompt: 'Over the last 2 weeks, how often have you been bothered by any of the following?',
    options: FREQ_0_3,
    max: 27,
    items: [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep, or sleeping too much',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself — or that you are a failure',
      'Trouble concentrating on things',
      'Moving or speaking so slowly that others noticed — or being restless',
      'Thoughts that you would be better off dead, or of hurting yourself',
    ],
    band: (s) =>
      s <= 4 ? { label: 'Minimal', severity: 'low' } :
      s <= 9 ? { label: 'Mild', severity: 'mild' } :
      s <= 14 ? { label: 'Moderate', severity: 'moderate' } :
      s <= 19 ? { label: 'Moderately severe', severity: 'high' } :
      { label: 'Severe', severity: 'high' },
  },
  gad7: {
    id: 'gad7',
    name: 'GAD-7',
    subtitle: 'Anxiety',
    prompt: 'Over the last 2 weeks, how often have you been bothered by the following?',
    options: FREQ_0_3,
    max: 21,
    items: [
      'Feeling nervous, anxious, or on edge',
      'Not being able to stop or control worrying',
      'Worrying too much about different things',
      'Trouble relaxing',
      'Being so restless that it is hard to sit still',
      'Becoming easily annoyed or irritable',
      'Feeling afraid, as if something awful might happen',
    ],
    band: (s) =>
      s <= 4 ? { label: 'Minimal', severity: 'low' } :
      s <= 9 ? { label: 'Mild', severity: 'mild' } :
      s <= 14 ? { label: 'Moderate', severity: 'moderate' } :
      { label: 'Severe', severity: 'high' },
  },
  core10: {
    id: 'core10',
    name: 'CORE-10',
    subtitle: 'Global distress',
    prompt: 'Over the last week, how have you felt?',
    options: CORE_0_4,
    max: 40,
    reverseItems: [1, 2],
    items: [
      'I have felt tense, anxious or nervous',
      'I have felt I have someone to turn to for support when needed',
      'I have felt able to cope when things go wrong',
      'Talking to people has felt too much for me',
      'I have felt panic or terror',
      'I made plans to end my life',
      'I have had difficulty getting to sleep or staying asleep',
      'I have felt despairing or hopeless',
      'I have felt unhappy',
      'Unwanted images or memories have been distressing me',
    ],
    band: (s) =>
      s <= 5 ? { label: 'Healthy', severity: 'low' } :
      s <= 10 ? { label: 'Low', severity: 'mild' } :
      s <= 14 ? { label: 'Mild', severity: 'mild' } :
      s <= 19 ? { label: 'Moderate', severity: 'moderate' } :
      s <= 24 ? { label: 'Moderate-to-severe', severity: 'high' } :
      { label: 'Severe', severity: 'high' },
  },
  asrs: {
    id: 'asrs',
    name: 'ASRS v1.1',
    subtitle: 'Adult ADHD screener',
    prompt: 'Over the past 6 months, how often have you experienced the following?',
    options: ASRS_0_4,
    scoring: 'count',
    // Part A darkened-box thresholds: items 1–3 ≥ Sometimes (2), items 4–6 ≥ Often (3).
    thresholds: [2, 2, 2, 3, 3, 3],
    max: 6,
    note: 'WHO Adult ADHD Self-Report Scale (ASRS-v1.1). Screening only — a fuller assessment is needed to diagnose.',
    items: [
      'Trouble wrapping up the final details of a project, once the challenging parts are done',
      'Difficulty getting things in order when you have to do a task that requires organisation',
      'Problems remembering appointments or obligations',
      'When a task requires a lot of thought, avoiding or delaying getting started',
      'Fidgeting or squirming with your hands or feet when you have to sit for a long time',
      'Feeling overly active and compelled to do things, as if driven by a motor',
    ],
    band: (s) =>
      s >= 4
        ? { label: 'Consistent with ADHD — consider fuller assessment', severity: 'high' }
        : { label: 'Below screening threshold', severity: 'low' },
  },
  pcl5: {
    id: 'pcl5',
    name: 'PCL-5',
    subtitle: 'PTSD',
    prompt: 'In the past month, how much were you bothered by these problems (in response to a stressful experience)?',
    options: PCL_0_4,
    max: 80,
    note: 'PTSD Checklist for DSM-5 (public domain). A provisional total ≥ 33 suggests probable PTSD; confirm with structured assessment.',
    items: [
      'Repeated, disturbing, unwanted memories of the stressful experience',
      'Repeated, disturbing dreams of the stressful experience',
      'Suddenly feeling or acting as if the experience were happening again',
      'Feeling very upset when something reminded you of the experience',
      'Strong physical reactions when reminded of the experience (heart pounding, sweating)',
      'Avoiding memories, thoughts, or feelings related to the experience',
      'Avoiding external reminders (people, places, conversations, activities, objects)',
      'Trouble remembering important parts of the experience',
      'Strong negative beliefs about yourself, other people, or the world',
      'Blaming yourself or someone else for the experience or what happened after',
      'Strong negative feelings such as fear, horror, anger, guilt, or shame',
      'Loss of interest in activities you used to enjoy',
      'Feeling distant or cut off from other people',
      'Trouble experiencing positive feelings',
      'Irritable behaviour, angry outbursts, or acting aggressively',
      'Taking too many risks or doing things that could cause you harm',
      'Being “superalert”, watchful, or on guard',
      'Feeling jumpy or easily startled',
      'Having difficulty concentrating',
      'Trouble falling or staying asleep',
    ],
    band: (s) =>
      s <= 19 ? { label: 'Minimal', severity: 'low' } :
      s <= 32 ? { label: 'Sub-threshold', severity: 'mild' } :
      s <= 49 ? { label: 'Probable PTSD', severity: 'high' } :
      { label: 'Severe', severity: 'high' },
  },
};

export function scoreInstrument(instrument: Instrument, responses: number[]): number {
  const def = INSTRUMENTS[instrument];
  if (def.scoring === 'count' && def.thresholds) {
    return responses.reduce((n, v, i) => n + (v >= (def.thresholds as number[])[i] ? 1 : 0), 0);
  }
  return responses.reduce((sum, value, idx) => {
    if (def.reverseItems?.includes(idx)) {
      const maxVal = def.options[def.options.length - 1].value;
      return sum + (maxVal - value);
    }
    return sum + value;
  }, 0);
}
