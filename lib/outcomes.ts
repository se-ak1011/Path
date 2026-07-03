// Outcome-measure definitions and scoring for PATH.
// PHQ-9 (depression), GAD-7 (anxiety) and CORE-10 (global distress) are
// widely used, free-to-use screening tools. Scores are indicative only and do
// not constitute a diagnosis — clinical judgement remains with the therapist.

export type Instrument = 'phq9' | 'gad7' | 'core10';

export interface InstrumentDef {
  id: Instrument;
  name: string;
  subtitle: string;
  items: string[];
  options: { label: string; value: number }[];
  // CORE-10 reverses two positively-worded items when scoring.
  reverseItems?: number[];
  band: (score: number) => { label: string; severity: 'low' | 'mild' | 'moderate' | 'high' };
  max: number;
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

export const INSTRUMENTS: Record<Instrument, InstrumentDef> = {
  phq9: {
    id: 'phq9',
    name: 'PHQ-9',
    subtitle: 'Depression',
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
    options: CORE_0_4,
    max: 40,
    // Items 2 and 3 (0-indexed 1 and 2) are positively worded and reverse-scored.
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
};

export function scoreInstrument(instrument: Instrument, responses: number[]): number {
  const def = INSTRUMENTS[instrument];
  return responses.reduce((sum, value, idx) => {
    if (def.reverseItems?.includes(idx)) {
      const max = def.options[def.options.length - 1].value;
      return sum + (max - value);
    }
    return sum + value;
  }, 0);
}
