import { createId } from "./id";
import type {
  Session,
  TaskKind,
  FocusGoEventType,
  TrialResult,
  TaskRun,
  ContentArtifact,
  AssessmentDefinition,
} from "./types";
import {
  baseline,
  generateTrials,
  probes,
  probesForAssessment,
} from "../probes";
import { EventRepository, SessionRepository } from "../data/repositories";
import { metricEngine, findingEngine } from "./scoring";
export function createSession(
  childId: string,
  mode: Session["mode"],
  kinds: TaskKind[] = probes.map((p) => p.kind),
  artifacts: ContentArtifact[] = [],
  sessionSeed?: string,
  assessment: AssessmentDefinition = baseline,
): Session {
  probesForAssessment(assessment.id);
  const id = createId();
  return {
    id,
    childId,
    mode,
    assessmentDefinition: structuredClone(assessment),
    seed: sessionSeed ?? id,
    createdAt: new Date().toISOString(),
    status: "ACTIVE",
    taskRuns: kinds.map((kind) => {
      const seed = `${sessionSeed ?? id}:${kind}`;
      return {
        id: createId(),
        kind,
        seed,
        ruleComprehension: "PENDING",
        trials: [
          ...(mode === "ASSESSMENT"
            ? generateTrials(kind, seed, "PRACTICE", 0, assessment.id)
            : []),
          ...generateTrials(
            kind,
            seed,
            mode === "ASSESSMENT" ? "FORMAL" : "TRAINING",
            0,
            assessment.id,
          ),
        ],
        results: [],
        metrics: {},
        findings: [],
      };
    }),
    cursor: { task: 0, stage: "INSTRUCTION", trial: 0, practiceAttempt: 0 },
    artifacts: structuredClone(artifacts),
    reports: {},
    invocations: [],
  };
}
export async function appendEvent(
  session: Session,
  type: FocusGoEventType,
  payload: Record<string, unknown> = {},
  trialId?: string,
) {
  return EventRepository.append({
    id: createId(),
    sessionId: session.id,
    taskRunId: session.taskRuns[session.cursor.task]?.id,
    trialId,
    type,
    monotonicTimeMs: performance.now(),
    wallClockTime: new Date().toISOString(),
    payload,
  });
}
export function finishRun(run: TaskRun) {
  run.metrics = metricEngine(run.trials, run.results);
  run.findings = findingEngine(run.id, run.metrics);
}
export async function saveResult(session: Session, result: TrialResult) {
  const run = session.taskRuns[session.cursor.task];
  if (run.results.some((r) => r.trialId === result.trialId))
    throw new Error("Duplicate trial result");
  run.results.push(result);
  await appendEvent(session, "TRIAL_COMPLETED", { result }, result.trialId);
  await SessionRepository.save(session);
}
export interface SpeechOutputProvider {
  speak(text: string, language: string): Promise<void>;
  cancel(): void;
}
export class BrowserSpeechOutput implements SpeechOutputProvider {
  speak(text: string, language: string): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in globalThis)) {
        resolve();
        return;
      }
      this.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.85;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }
  cancel() {
    if ("speechSynthesis" in globalThis) speechSynthesis.cancel();
  }
}

/** The earliest completed baseline for this child and protocol only. */
export function baselineForSession(
  sessions: Session[],
  session: Session,
): Session | undefined {
  const first = sessions
    .filter(
      (candidate) =>
        candidate.childId === session.childId &&
        candidate.mode === "ASSESSMENT" &&
        candidate.status === "COMPLETED" &&
        candidate.assessmentDefinition.id === session.assessmentDefinition.id &&
        candidate.assessmentDefinition.version ===
          session.assessmentDefinition.version,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  return first?.id === session.id ? undefined : first;
}
