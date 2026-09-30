import type {
  AssessmentDefinition,
  DifficultyVector,
  Domain,
  Phase,
  ProbeDefinition,
  TaskKind,
  TaskTemplate,
  TrialDefinition,
  TaskRun,
} from "../core/types";
import { SeededRandom } from "../core/random";
const definitions: {
  kind: TaskKind;
  domain: Domain;
  paradigm: string;
  count: number;
  url: string;
  title: string;
  year: number;
  doi: string;
}[] = [
  {
    kind: "GNG",
    domain: "RESPONSE_INHIBITION",
    paradigm: "Go / No-Go",
    count: 12,
    url: "go-no-go",
    title:
      "Automatic and controlled response inhibition: Associative learning in the go/no-go and stop-signal paradigms",
    year: 2008,
    doi: "10.1037/a0013170",
  },
  {
    kind: "SA",
    domain: "SUSTAINED_ATTENTION",
    paradigm: "Continuous performance",
    count: 10,
    url: "sart",
    title: "A continuous performance test of brain damage",
    year: 1956,
    doi: "10.1037/h0043220",
  },
  {
    kind: "FLANKER",
    domain: "SELECTIVE_ATTENTION",
    paradigm: "Eriksen Flanker",
    count: 9,
    url: "flanker",
    title:
      "Effects of noise letters upon the identification of a target letter in a nonsearch task",
    year: 1974,
    doi: "10.3758/BF03203267",
  },
  {
    kind: "CORSI",
    domain: "SPATIAL_WORKING_MEMORY",
    paradigm: "Forward spatial span",
    count: 8,
    url: "corsi",
    title: "The Corsi Block-Tapping Task: Standardization and normative data",
    year: 2000,
    doi: "10.1207/S15324826AN0704_8",
  },
  {
    kind: "DCCS",
    domain: "RULE_SWITCHING",
    paradigm: "Dimensional Change Card Sort",
    count: 12,
    url: "taskswitching",
    title:
      "The Dimensional Change Card Sort (DCCS): a method of assessing executive function in children",
    year: 2006,
    doi: "10.1038/nprot.2006.46",
  },
  {
    kind: "INSTRUCTION",
    domain: "MULTI_STEP_EXECUTION",
    paradigm: "Focus&Go Following Instructions",
    count: 9,
    url: "",
    title: "Focus&Go original protocol; no external validation",
    year: 2026,
    doi: "",
  },
];
const base: DifficultyVector = {
  stimulusDurationMs: 1500,
  responseWindowMs: 2200,
  isiMinMs: 600,
  isiMaxMs: 1000,
  goRatio: 0.75,
  visualSimilarity: 0.25,
  backgroundDistractors: 0,
  ruleCount: 1,
  sequenceLength: 1,
};
export const templates: TaskTemplate[] = definitions.map((d) => ({
  id: `FG-${d.kind}-TRAINING`,
  version: "2.0.0",
  kind: d.kind,
  nameKey: `domain.${d.domain}`,
  domain: d.domain,
  paradigm: d.paradigm,
  science: {
    paradigmName: d.paradigm,
    targetConstruct: d.domain,
    secondaryConstructs: ["motor response", "instruction comprehension"],
    references: [
      {
        title: d.title,
        year: d.year,
        doi: d.doi,
        url: d.doi ? `https://doi.org/${d.doi}` : undefined,
      },
    ],
    referenceImplementations: d.url
      ? [
          {
            name: "PsyToolkit",
            url: `https://www.psytoolkit.org/experiment-library/${d.url}.html`,
            note: "Independent adaptation; no copied code/assets; SART and task switching are related, not equivalent protocols.",
          },
        ]
      : [],
    implementationNote: "science.implementation",
    normativeStatus: "PERSONAL_BASELINE_ONLY",
    limitations: ["science.limitations"],
  },
  population: {
    minAge: 5,
    maxAge: 8,
    readingRequired: false,
    motorRequirements: ["touch or click"],
  },
  interaction: {
    stimulusModalities: ["VISUAL", "AUDIO"],
    responseModalities: ["TOUCH", "CLICK", "SELECT", "NO_RESPONSE"],
  },
  difficultySchema: {
    ...base,
    goRatio: d.kind === "SA" ? 0.2 : 0.75,
    responseWindowMs: ["CORSI", "INSTRUCTION"].includes(d.kind)
      ? 15000
      : d.kind === "DCCS"
        ? 5000
        : 2200,
  },
  scoringDefinition: "FG-SCORING-1.0",
  findingRules: ["FG-FINDINGS-1.0"],
  trainingGenerationSpec: {
    allowedSlots: [
      "theme",
      "encouragement",
      "targetLabel",
      "distractorLabel",
      "objects",
    ],
  },
}));
export const probes: ProbeDefinition[] = definitions.map((d) => ({
  id: `FG-${d.kind}-PROBE-2.0`,
  version: "2.0.0",
  taskTemplateId: `FG-${d.kind}-TRAINING`,
  kind: d.kind,
  trialCount: d.count,
  practiceCount: 4,
  difficulty: { ...templates.find((t) => t.kind === d.kind)!.difficultySchema },
  stimulusPool:
    d.kind === "GNG"
      ? ["green-light", "red-light"]
      : d.kind === "SA"
        ? ["star", "moon"]
        : d.kind === "INSTRUCTION"
          ? ["apple", "star", "car", "moon"]
          : ["leaf", "moon", "left", "right", "circle", "triangle"],
  trialProtocol: "FG-PROTOCOL-2.0",
  scoringDefinition: "FG-SCORING-1.0",
}));
export const baseline: AssessmentDefinition = {
  id: "FG-BASELINE-2.0",
  version: "2.0.0",
  createdAt: "2026-09-30",
  taskProbeVersions: probes.map((p) => p.id),
};
// Preserve the released protocol for saved sessions and seeded practice retries.
const legacyCounts: Record<TaskKind, number> = {
  GNG: 40,
  SA: 60,
  FLANKER: 30,
  CORSI: 8,
  DCCS: 16,
  INSTRUCTION: 9,
};
export const legacyProbes: ProbeDefinition[] = probes.map((probe) => ({
  ...structuredClone(probe),
  id: `FG-${probe.kind}-PROBE-1.0`,
  version: "1.0.0",
  trialCount: legacyCounts[probe.kind],
  stimulusPool:
    probe.kind === "INSTRUCTION"
      ? ["apple", "star", "car", "moon"]
      : ["leaf", "moon", "left", "right", "circle", "triangle"],
  trialProtocol: "FG-PROTOCOL-1.0",
}));
export const legacyBaseline: AssessmentDefinition = {
  id: "FG-BASELINE-1.0",
  version: "1.0.0",
  createdAt: "2026-09-29",
  taskProbeVersions: legacyProbes.map((probe) => probe.id),
};
export function probesForAssessment(assessmentId: string): ProbeDefinition[] {
  if (assessmentId === legacyBaseline.id) return legacyProbes;
  if (assessmentId === baseline.id) return probes;
  throw new Error(`Unknown assessment protocol: ${assessmentId}`);
}
export function templateForVersion(
  kind: TaskKind,
  version = "2.0.0",
): TaskTemplate {
  if (!["1.0.0", "2.0.0"].includes(version))
    throw new Error("Unknown template version");
  return { ...templates.find((template) => template.kind === kind)!, version };
}
export function taskTextKey(
  prefix: "task" | "instruction",
  kind: TaskKind,
  assessmentId: string,
): string {
  return `${prefix}.${kind}${assessmentId === legacyBaseline.id && ["GNG", "SA"].includes(kind) ? ".legacy" : ""}`;
}
export function probeIdForRun(run: TaskRun, assessmentId: string): string {
  return (
    run.trials.find((trial) => trial.probeId)?.probeId ??
    probesForAssessment(assessmentId).find((probe) => probe.kind === run.kind)!
      .id
  );
}
export function generateTrials(
  kind: TaskKind,
  seed: string,
  phase: Phase,
  attempt = 0,
  assessmentId = baseline.id,
): TrialDefinition[] {
  const probe = probesForAssessment(assessmentId).find((p) => p.kind === kind)!;
  const rng = new SeededRandom(`${probe.id}:${seed}:${phase}:${attempt}`);
  const n =
    phase === "PRACTICE"
      ? probe.practiceCount
      : phase === "TRAINING"
        ? Math.min(probe.trialCount, 12)
        : probe.trialCount;
  const goCount =
    phase === "PRACTICE" ? 2 : Math.round(n * probe.difficulty.goRatio);
  const goPool = rng.shuffle(Array.from({ length: n }, (_, i) => i < goCount));
  return Array.from({ length: n }, (_, index) => {
    const t: TrialDefinition = {
      id: `${seed}:${phase}:${attempt}:${index}`,
      index,
      taskTemplateId: probe.taskTemplateId,
      probeId: phase === "TRAINING" ? undefined : probe.id,
      kind,
      phase,
      condition: "",
      stimulus: {},
      expectedResponse: [],
      difficultySnapshot: { ...probe.difficulty },
      seed,
    };
    if (kind === "GNG" || kind === "SA") {
      const go = goPool[index];
      t.condition = go ? "GO" : "NO_GO";
      t.stimulus = {
        symbol:
          assessmentId === legacyBaseline.id
            ? go
              ? "leaf"
              : "moon"
            : kind === "GNG"
              ? go
                ? "green-light"
                : "red-light"
              : go
                ? "star"
                : "moon",
      };
      t.expectedResponse = go ? ["tap"] : [];
    }
    if (kind === "FLANKER") {
      const direction = rng.next() < 0.5 ? "left" : "right";
      t.condition = ["CONGRUENT", "INCONGRUENT", "NEUTRAL"][index % 3];
      t.stimulus = {
        direction,
        flankers:
          t.condition === "NEUTRAL"
            ? "neutral"
            : t.condition === "CONGRUENT"
              ? direction
              : direction === "left"
                ? "right"
                : "left",
      };
      t.expectedResponse = [direction];
    }
    if (kind === "CORSI") {
      const length = phase === "PRACTICE" ? 2 : 2 + (Math.floor(index / 2) % 4);
      t.condition = `SPAN_${length}`;
      t.stimulus = {
        sequence: rng
          .shuffle(["0", "1", "2", "3", "4", "5", "6", "7", "8"])
          .slice(0, length),
      };
      t.expectedResponse = t.stimulus.sequence!;
      t.difficultySnapshot.sequenceLength = length;
    }
    if (kind === "DCCS") {
      const rule = index < n / 2 ? "color" : "shape";
      const color = index % 2 === 0 ? "coral" : "blue";
      const shape = index % 2 === 0 ? "triangle" : "circle";
      const byColor = color === "coral" ? "left" : "right";
      const byShape = shape === "circle" ? "left" : "right";
      t.condition = rule === "color" ? "PRE_SWITCH" : "POST_SWITCH";
      t.stimulus = { rule, color, shape, previousExpected: byColor };
      t.expectedResponse = [rule === "color" ? byColor : byShape];
      t.difficultySnapshot.ruleCount = 2;
    }
    if (kind === "INSTRUCTION") {
      const length = phase === "PRACTICE" ? 1 + (index % 2) : 1 + (index % 3);
      t.condition = `STEPS_${length}`;
      t.expectedResponse = rng
        .shuffle(["apple", "star", "car", "moon"])
        .slice(0, length);
      t.stimulus = { sequence: t.expectedResponse };
      t.difficultySnapshot.sequenceLength = length;
    }
    return t;
  });
}
