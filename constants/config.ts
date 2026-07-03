export const APP_NAME = 'PATH';
export const APP_TAGLINE = 'Your private practice, in order.';

// ─── Subscription ───────────────────────────────────────────
// Therapists: 14-day free trial → monthly fee. Entitlement will be enforced via
// RevenueCat later (StoreKit / Play Billing); today the trial is date-based only.
export const SUBSCRIPTION = {
  TRIAL_DAYS: 14,
  MONTHLY_FEE_GBP: 20,
  THERAPIST_TOOLS: [
    'AI-assisted session notes',
    'Pseudonymised caseload',
    'Sessions & calendar',
    'Outcome measures (PHQ-9, GAD-7, CORE-10)',
    'Invoicing & Tax Pot',
    'Supervision log',
    'Secure client messaging',
  ],
};

// ─── Tax (UK Self-Assessment — NOT CIS) ─────────────────────
// Therapists are sole traders on Self-Assessment. There is no CIS deduction.
export const TAX_RATES = {
  SELF_EMPLOYED: 0.30,
};
export const DEFAULT_TAX_RATE = 30;

// HMRC simplified mileage rate for the first 10,000 business miles.
export const MILEAGE_RATE_GBP = 0.45;

// Keep financial records for 6 years (5 years after the 31 Jan submission
// deadline of the relevant tax year) — HMRC requirement for the self-employed.
export const RECORD_RETENTION_YEARS = 6;

// ─── Professional bodies (UK counselling / psychotherapy) ───
// Used for the verification badge. "Other" allows less common registers.
export const PROFESSIONAL_BODIES = [
  'BACP',   // British Association for Counselling and Psychotherapy
  'NCPS',   // National Counselling & Psychotherapy Society
  'UKCP',   // UK Council for Psychotherapy
  'BABCP',  // British Association for Behavioural & Cognitive Psychotherapies
  'HCPC',   // Health & Care Professions Council (practitioner psychologists)
  'BPS',    // British Psychological Society
  'Other',
];

// ─── Modalities / approaches ────────────────────────────────
export const MODALITIES = [
  'CBT',
  'Person-Centred',
  'Psychodynamic',
  'Integrative',
  'Humanistic',
  'Gestalt',
  'EMDR',
  'DBT',
  'ACT',
  'Systemic / Family',
  'Couples',
  'Psychosexual',
  'Other',
];

// ─── Specialisms / presenting issues ────────────────────────
export const SPECIALISMS = [
  'Anxiety',
  'Depression',
  'Trauma / PTSD',
  'Bereavement',
  'Relationships',
  'Addiction',
  'Eating disorders',
  'Self-esteem',
  'Stress / burnout',
  'Abuse',
  'Neurodivergence',
  'LGBTQ+',
];

export const DELIVERY_MODES = ['in_person', 'online'] as const;
export const DELIVERY_LABELS: Record<string, string> = {
  in_person: 'In person',
  online: 'Online',
};

// ─── Sessions ───────────────────────────────────────────────
export const SESSION_TYPES = ['assessment', 'session', 'review'] as const;
export const SESSION_TYPE_LABELS: Record<string, string> = {
  assessment: 'Assessment',
  session: 'Session',
  review: 'Review',
};

export const SESSION_STATUSES = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DNA: 'dna', // Did Not Attend — client did not show and did not cancel
} as const;

export const SESSION_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  dna: 'DNA',
};

export const DEFAULT_SESSION_MINUTES = 50; // the clinical hour
export const SESSION_DURATIONS = [30, 50, 60, 80, 90, 120];

// ─── Client caseload ────────────────────────────────────────
export const CLIENT_STATUSES = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
} as const;

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
};

// ─── Session-note templates ─────────────────────────────────
export const NOTE_TEMPLATES = {
  SOAP: 'soap',
  DAP: 'dap',
  FREE: 'free',
} as const;

export const NOTE_TEMPLATE_LABELS: Record<string, string> = {
  soap: 'SOAP',
  dap: 'DAP',
  free: 'Free',
};

// Field order per template. AI drafts populate these; the clinician confirms.
export const NOTE_TEMPLATE_FIELDS: Record<string, { key: string; label: string; hint: string }[]> = {
  soap: [
    { key: 'subjective', label: 'Subjective', hint: "The client's report — how they present it in their own words." },
    { key: 'objective', label: 'Objective', hint: 'Your observations — presentation, affect, engagement.' },
    { key: 'assessment', label: 'Assessment', hint: 'Clinical formulation and progress against goals.' },
    { key: 'plan', label: 'Plan', hint: 'Interventions, homework, focus for next session.' },
  ],
  dap: [
    { key: 'data', label: 'Data', hint: 'What happened — report and observation combined.' },
    { key: 'assessment', label: 'Assessment', hint: 'Your clinical interpretation and progress.' },
    { key: 'plan', label: 'Plan', hint: 'Next steps and interventions.' },
  ],
  free: [
    { key: 'body', label: 'Notes', hint: 'Free-form clinical notes.' },
  ],
};

// ─── Expense categories (therapist-deductible) ──────────────
export const EXPENSE_CATEGORIES = [
  'clinical_supervision',
  'professional_indemnity',
  'body_membership',
  'room_hire',
  'cpd',
  'mileage',
  'equipment',
  'personal_therapy',
  'other',
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  clinical_supervision: 'Clinical supervision',
  professional_indemnity: 'Professional indemnity insurance',
  body_membership: 'Professional body membership',
  room_hire: 'Room hire',
  cpd: 'CPD / training',
  mileage: 'Mileage',
  equipment: 'Equipment',
  personal_therapy: 'Personal therapy',
  other: 'Other',
};

// ─── Supervision ────────────────────────────────────────────
export const SUPERVISION_TYPES = ['individual', 'group'] as const;
export const SUPERVISION_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  group: 'Group',
};

// ─── Invoices ───────────────────────────────────────────────
export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
} as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
};

// ─── Compliance copy (surface in the UI) ────────────────────
export const DISCLAIMERS = {
  NOT_CLINICAL_ADVICE:
    'PATH is practice-administration software, not a clinical decision-making tool. Clinical judgement remains entirely yours.',
  AI_DRAFT:
    'AI produces a draft from the information you enter. Review, edit and confirm every note — the clinician is the author and owner of the record.',
  SPECIAL_CATEGORY:
    'Client records are special-category personal data under UK GDPR. Keep identifying details to a minimum, use client references rather than full names, and store nothing you would not want disclosed.',
  RETENTION:
    `Keep clinical and financial records in line with your professional body's guidance and HMRC (records for ${RECORD_RETENTION_YEARS} years).`,
};

// ─── Dev mode ───────────────────────────────────────────────
export const DEV_MODE = false;
