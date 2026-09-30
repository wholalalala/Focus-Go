export type Language = "zh-CN" | "en";
export const domains = [
  "SUSTAINED_ATTENTION",
  "SELECTIVE_ATTENTION",
  "RESPONSE_INHIBITION",
  "SPATIAL_WORKING_MEMORY",
  "RULE_SWITCHING",
  "MULTI_STEP_EXECUTION",
] as const;
export type Domain = (typeof domains)[number];
export type TaskKind =
  "SA" | "FLANKER" | "GNG" | "CORSI" | "DCCS" | "INSTRUCTION";
export type Phase = "PRACTICE" | "FORMAL" | "TRAINING";
export type LocalizedText = Record<Language, string>;
export interface DifficultyVector {
  stimulusDurationMs: number;
  responseWindowMs: number;
  isiMinMs: number;
  isiMaxMs: number;
  goRatio: number;
  visualSimilarity: number;
  backgroundDistractors: number;
  ruleCount: number;
  sequenceLength: number;
}
export interface ScientificProvenance {
  paradigmName: string;
  targetConstruct: Domain;
  secondaryConstructs: string[];
  references: {
    title: string;
    authors?: string;
    year?: number;
    doi?: string;
    url?: string;
  }[];
  referenceImplementations: { name: string; url: string; note: string }[];
  implementationNote: string;
  normativeStatus: "PERSONAL_BASELINE_ONLY";
  limitations: string[];
}
export interface TaskTemplate {
  id: string;
  version: string;
  kind: TaskKind;
  nameKey: string;
  domain: Domain;
  paradigm: string;
  science: ScientificProvenance;
  population: {
    minAge: number;
    maxAge: number;
    readingRequired: boolean;
    motorRequirements: string[];
  };
  interaction: { stimulusModalities: string[]; responseModalities: string[] };
  difficultySchema: DifficultyVector;
  scoringDefinition: string;
  findingRules: string[];
  trainingGenerationSpec: { allowedSlots: string[] };
}
export interface ProbeDefinition {
  id: string;
  version: string;
  taskTemplateId: string;
  kind: TaskKind;
  trialCount: number;
  practiceCount: number;
  difficulty: DifficultyVector;
  stimulusPool: string[];
  trialProtocol: string;
  scoringDefinition: string;
}
export interface AssessmentDefinition {
  id: string;
  version: string;
  createdAt: string;
  taskProbeVersions: string[];
}
export interface TrialDefinition {
  id: string;
  index: number;
  taskTemplateId: string;
  probeId?: string;
  kind: TaskKind;
  phase: Phase;
  condition: string;
  stimulus: {
    symbol?: string;
    direction?: string;
    flankers?: string;
    sequence?: string[];
    color?: string;
    shape?: string;
    rule?: string;
    previousExpected?: string;
  };
  expectedResponse: string[];
  difficultySnapshot: DifficultyVector;
  seed: string;
}
export type ErrorType =
  | "OMISSION"
  | "COMMISSION"
  | "WRONG_TARGET"
  | "ORDER_ERROR"
  | "INTRUSION"
  | "PERSEVERATION"
  | "IMPULSIVE_RESPONSE"
  | "TOO_SLOW";
export interface TrialResult {
  trialId: string;
  stimulusActualOnsetMs: number;
  responseWindowOnsetMs: number;
  scheduledOnsetMs: number;
  responseAtMs?: number;
  reactionTimeMs?: number;
  completionTimeMs: number;
  response: string[];
  correct: boolean;
  timeout: boolean;
  errorType?: ErrorType;
  timingValid: boolean;
  metadata: {
    instructionReplayCount: number;
    promptCount: number;
    stepsCompleted: number;
  };
}
export type FocusGoEventType =
  | "SESSION_CREATED"
  | "SESSION_STARTED"
  | "TASK_STARTED"
  | "INSTRUCTION_SHOWN"
  | "DEMO_STARTED"
  | "INSTRUCTION_AUDIO_STARTED"
  | "INSTRUCTION_REPLAYED"
  | "PRACTICE_STARTED"
  | "PRACTICE_ENDED"
  | "TRIAL_SCHEDULED"
  | "STIMULUS_SHOWN"
  | "RESPONSE_RECEIVED"
  | "RESPONSE_TIMEOUT"
  | "TRIAL_COMPLETED"
  | "PAGE_HIDDEN"
  | "PAGE_VISIBLE"
  | "PAUSED"
  | "RESUMED"
  | "TASK_COMPLETED"
  | "SESSION_COMPLETED"
  | "SEQUENCE_ITEM_SHOWN"
  | "TRIAL_INTERRUPTED";
export interface FocusGoEvent {
  id: string;
  sessionId: string;
  taskRunId?: string;
  trialId?: string;
  type: FocusGoEventType;
  monotonicTimeMs: number;
  wallClockTime: string;
  payload: Record<string, unknown>;
}
export interface Child {
  id: string;
  nickname: string;
  birthYearMonth: string;
  preferredLanguage: Language;
  readingLevel: "NONE" | "EMERGING" | "INDEPENDENT";
  optionalNotes: string;
  createdAt: string;
  updatedAt: string;
}
export interface TaskRun {
  id: string;
  kind: TaskKind;
  seed: string;
  ruleComprehension: "PENDING" | "SUFFICIENT" | "INSUFFICIENT";
  trials: TrialDefinition[];
  results: TrialResult[];
  metrics: Metrics;
  findings: Finding[];
}
export type Metrics = Record<string, number | null>;
export interface EvidenceReference {
  id: string;
  taskRunId: string;
  metric: string;
  value: number | null;
  trialIds: string[];
}
export interface Finding {
  id: string;
  type: string;
  statementKey: string;
  evidenceRefs: string[];
  rule: string;
}
export interface EvidencePacket {
  childAgeYears: number;
  assessmentId: string;
  taskRunId: string;
  probeId: string;
  domain: Domain;
  metrics: Metrics;
  findings: Finding[];
  evidence: EvidenceReference[];
}
export interface AbilitySnapshot {
  assessmentId: string;
  domains: { domain: Domain; metrics: Metrics; findingIds: string[] }[];
}
export interface TrainingPlan {
  id: string;
  childId: string;
  primaryDomain: Domain;
  secondaryDomains: Domain[];
  allocation: Partial<Record<Domain, number>>;
  lockedDomains: Domain[];
  evidenceRefs: string[];
  createdAt: string;
}
export interface TrainingContent {
  theme: "garden" | "space" | "ocean";
  encouragement: string;
  targetLabel: string;
  distractorLabel: string;
  objects: ("apple" | "star" | "car" | "moon")[];
}
export interface AIInvocation {
  id: string;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  requestHash: string;
  requestedAt: string;
  rawResponse?: string;
  parsedResponse?: unknown;
  validationResult: string;
  durationMs: number;
}
export interface ContentArtifact {
  id: string;
  childId?: string;
  taskTemplateId: string;
  taskTemplateVersion: string;
  language: Language;
  targetAge: number;
  difficultySnapshot: DifficultyVector;
  generatedBy?: { invocationId: string };
  content: TrainingContent;
  createdAt: string;
  contentHash: string;
  cacheKey: string;
  source: "AI" | "BUILT_IN";
}
export interface AIReport {
  observations: {
    findingId: string;
    statement: string;
    evidenceRefs: string[];
    confidence: "descriptive";
  }[];
  limitations: string[];
}
export interface Session {
  id: string;
  childId: string;
  mode: "ASSESSMENT" | "TRAINING";
  assessmentDefinition: AssessmentDefinition;
  seed: string;
  createdAt: string;
  completedAt?: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  baselineType?: "PERSONAL_BASELINE" | "FOLLOW_UP";
  abilitySnapshot?: AbilitySnapshot;
  taskRuns: TaskRun[];
  cursor: {
    task: number;
    stage: "INSTRUCTION" | "DEMO" | "PRACTICE" | "FORMAL" | "TRAINING";
    trial: number;
    practiceAttempt: number;
  };
  artifacts: ContentArtifact[];
  reports: Record<string, AIReport>;
  invocations: AIInvocation[];
}
