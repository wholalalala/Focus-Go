import type {
  TrialDefinition,
  TrialResult,
  ErrorType,
  Metrics,
  TaskRun,
  Finding,
  EvidencePacket,
} from "./types";
import { templates, probeIdForRun, baseline } from "../probes";
export function scoreTrial(
  t: TrialDefinition,
  response: string[],
  timing: {
    scheduled: number;
    onset: number;
    responseWindowOnset?: number;
    end: number;
    firstResponse?: number;
    valid: boolean;
    replays?: number;
    premature?: boolean;
  },
  timeout = false,
): TrialResult {
  const expected = t.expectedResponse;
  let errorType: ErrorType | undefined;
  if (timing.premature) errorType = "IMPULSIVE_RESPONSE";
  else if (!expected.length && response.length) errorType = "COMMISSION";
  else if (expected.length && !response.length) errorType = "OMISSION";
  else if (response.some((x) => !expected.includes(x)))
    errorType =
      t.kind === "DCCS" &&
      t.condition === "POST_SWITCH" &&
      response[0] === t.stimulus.previousExpected
        ? "PERSEVERATION"
        : expected.length > 1
          ? "INTRUSION"
          : "WRONG_TARGET";
  else if (response.length < expected.length) errorType = "OMISSION";
  else if (JSON.stringify(response) !== JSON.stringify(expected))
    errorType = "ORDER_ERROR";
  const rt =
    timing.firstResponse === undefined
      ? undefined
      : Math.max(
          0,
          timing.firstResponse - (timing.responseWindowOnset ?? timing.onset),
        );
  if (
    !errorType &&
    expected.length &&
    rt !== undefined &&
    rt > t.difficultySnapshot.responseWindowMs
  )
    errorType = "TOO_SLOW";
  return {
    trialId: t.id,
    stimulusActualOnsetMs: timing.onset,
    responseWindowOnsetMs: timing.responseWindowOnset ?? timing.onset,
    scheduledOnsetMs: timing.scheduled,
    responseAtMs: timing.firstResponse,
    reactionTimeMs: rt,
    completionTimeMs: Math.max(0, timing.end - timing.onset),
    response: [...response],
    correct: !errorType,
    timeout,
    errorType,
    timingValid: timing.valid,
    metadata: {
      instructionReplayCount: timing.replays ?? 0,
      promptCount: 0,
      stepsCompleted: expected.filter((x, i) => response[i] === x).length,
    },
  };
}
const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
export const median = (a: number[]) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return (
    (b[Math.floor((b.length - 1) / 2)] + b[Math.ceil((b.length - 1) / 2)]) / 2
  );
};
export function metricEngine(
  trials: TrialDefinition[],
  results: TrialResult[],
): Metrics {
  const map = new Map(trials.map((t) => [t.id, t]));
  const eligible = results.filter(
    (r) => map.get(r.trialId)?.phase !== "PRACTICE" && map.has(r.trialId),
  );
  const rows = eligible.filter((r) => r.timingValid);
  const rate = (rs: TrialResult[]) =>
    rs.length ? rs.filter((r) => r.correct).length / rs.length : null;
  const subset = (c: string) =>
    rows.filter((r) => map.get(r.trialId)!.condition === c);
  const rt = (rs: TrialResult[]) =>
    rs
      .filter((r) => r.correct && r.reactionTimeMs !== undefined)
      .map((r) => r.reactionTimeMs!);
  const times = rt(rows),
    avg = mean(times),
    sd =
      times.length > 1
        ? Math.sqrt(
            times.reduce((s, x) => s + (x - avg!) ** 2, 0) / (times.length - 1),
          )
        : null;
  const go = subset("GO"),
    no = subset("NO_GO");
  const first = rows.filter(
      (r) => map.get(r.trialId)!.index < eligible.length / 2,
    ),
    second = rows.filter(
      (r) => map.get(r.trialId)!.index >= eligible.length / 2,
    );
  const errors = (e: ErrorType) => rows.filter((r) => r.errorType === e).length;
  const m: Metrics = {
    trialCount: eligible.length,
    validTrials: rows.length,
    invalidTimingTrials: eligible.length - rows.length,
    accuracy: rate(rows),
    medianRtMs: median(times),
    rtSdMs: sd,
    rtCv: sd !== null && avg ? sd / avg : null,
    omissions: errors("OMISSION"),
    commissions: errors("COMMISSION"),
    orderErrors: errors("ORDER_ERROR"),
    intrusions: errors("INTRUSION"),
    prematureResponses: eligible.filter(
      (r) => r.errorType === "IMPULSIVE_RESPONSE",
    ).length,
    completionTimeMs: mean(rows.map((r) => r.completionTimeMs)),
    firstHalfAccuracy: rate(first),
    secondHalfAccuracy: rate(second),
    timeOnTaskTrend:
      rate(first) !== null && rate(second) !== null
        ? rate(second)! - rate(first)!
        : null,
    instructionReplayCount: rows.reduce(
      (n, r) => n + r.metadata.instructionReplayCount,
      0,
    ),
    promptCount: rows.reduce((n, r) => n + r.metadata.promptCount, 0),
  };
  const kind = trials[0]?.kind;
  if (kind === "GNG" || kind === "SA")
    Object.assign(m, {
      goTrials: go.length,
      noGoTrials: no.length,
      goAccuracy: rate(go),
      noGoAccuracy: rate(no),
      hitRate: rate(go),
      omissionRate: go.length
        ? go.filter((r) => r.errorType === "OMISSION").length / go.length
        : null,
      commissionRate: no.length
        ? no.filter((r) => r.errorType === "COMMISSION").length / no.length
        : null,
      falseAlarmRate: no.length
        ? no.filter((r) => !r.correct).length / no.length
        : null,
    });
  if (kind === "FLANKER") {
    for (const c of ["CONGRUENT", "INCONGRUENT", "NEUTRAL"]) {
      m[`${c}Accuracy`] = rate(subset(c));
      m[`${c}RtMs`] = median(rt(subset(c)));
    }
    m.interferenceAccuracyCost =
      m.CONGRUENTAccuracy !== null && m.INCONGRUENTAccuracy !== null
        ? m.CONGRUENTAccuracy - m.INCONGRUENTAccuracy
        : null;
    m.interferenceRtCost =
      m.CONGRUENTRtMs !== null && m.INCONGRUENTRtMs !== null
        ? m.INCONGRUENTRtMs - m.CONGRUENTRtMs
        : null;
  }
  if (kind === "CORSI") {
    const success = rows
      .filter((r) => r.correct)
      .map((r) => map.get(r.trialId)!.expectedResponse.length);
    m.maximumSpanCompleted = success.length ? Math.max(...success) : 0;
    m.stableSpan = 0;
    for (let n = 2; n <= 5; n++) {
      const s = subset(`SPAN_${n}`);
      if (s.length >= 2 && s.every((r) => r.correct)) m.stableSpan = n;
    }
    m.sequenceAccuracy = rate(rows);
  }
  if (kind === "DCCS") {
    m.preSwitchAccuracy = rate(subset("PRE_SWITCH"));
    m.postSwitchAccuracy = rate(subset("POST_SWITCH"));
    m.perseverativeErrors = errors("PERSEVERATION");
    const pre = median(rt(subset("PRE_SWITCH"))),
      post = median(rt(subset("POST_SWITCH")));
    m.switchCostMs = pre !== null && post !== null ? post - pre : null;
  }
  if (kind === "INSTRUCTION") {
    for (let n = 1; n <= 3; n++)
      m[`${n}StepAccuracy`] = rate(subset(`STEPS_${n}`));
    m.stepsPresented = rows.reduce(
      (n, r) => n + map.get(r.trialId)!.expectedResponse.length,
      0,
    );
    m.stepsCompleted = rows.reduce((n, r) => n + r.metadata.stepsCompleted, 0);
    m.sequenceAccuracy = rate(rows);
  }
  return m;
}
export const findingConfig = {
  commissionThreshold: 0.2,
  instructionLoadDrop: 0.25,
};
export function findingEngine(
  runId: string,
  m: Metrics,
  config = findingConfig,
): Finding[] {
  const findings: Finding[] = [];
  const add = (type: string, keys: string[], rule: string) =>
    findings.push({
      id: `${runId}:${type}`,
      type,
      statementKey: `finding.${type}`,
      evidenceRefs: keys.map((k) => `${runId}:metric:${k}`),
      rule,
    });
  if ((m.validTrials ?? 0) > 0)
    add(
      "OBSERVED",
      ["accuracy", "validTrials"],
      "Report observed accuracy among timing-valid non-practice trials. No threshold or norm.",
    );
  if (
    m.commissionRate != null &&
    m.omissionRate != null &&
    m.commissionRate >= config.commissionThreshold &&
    m.commissionRate > m.omissionRate
  )
    add(
      "COMMISSION_DOMINANT",
      ["commissionRate", "omissionRate"],
      `commissionRate >= ${config.commissionThreshold} and commissionRate > omissionRate`,
    );
  if (
    m["2StepAccuracy"] != null &&
    m["3StepAccuracy"] != null &&
    m["2StepAccuracy"] - m["3StepAccuracy"] >= config.instructionLoadDrop
  )
    add(
      "INSTRUCTION_LOAD_DROP",
      ["2StepAccuracy", "3StepAccuracy"],
      `2StepAccuracy - 3StepAccuracy >= ${config.instructionLoadDrop}`,
    );
  if ((m.invalidTimingTrials ?? 0) > 0)
    add(
      "TIMING_EXCLUDED",
      ["invalidTimingTrials"],
      "Exclude trials interrupted by page hiding, pausing or premature input.",
    );
  return findings;
}
export function evidencePacket(
  run: TaskRun,
  age: number,
  assessmentId = baseline.id,
): EvidencePacket {
  return {
    childAgeYears: age,
    assessmentId,
    taskRunId: run.id,
    probeId: probeIdForRun(run, assessmentId),
    domain: templates.find((t) => t.kind === run.kind)!.domain,
    metrics: run.metrics,
    findings: run.findings,
    evidence: Object.entries(run.metrics).map(([metric, value]) => ({
      id: `${run.id}:metric:${metric}`,
      taskRunId: run.id,
      metric,
      value,
      trialIds: run.results
        .filter(
          (r) =>
            run.trials.find((t) => t.id === r.trialId)?.phase === "FORMAL" &&
            r.timingValid,
        )
        .map((r) => r.trialId),
    })),
  };
}
