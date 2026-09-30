import { useEffect, useRef, useState } from "react";
import type { Session, TrialResult } from "../core/types";
import { sessionProgress } from "../core/progress";
import { abilitySnapshot } from "../core/planner";
import { generateTrials, taskTextKey } from "../probes";
import { appendEvent, finishRun, baselineForSession } from "../core/runtime";
import { SessionRepository } from "../data/repositories";
import { Trial, symbols } from "./Trial";
import { TaskScene } from "./TaskScene";
import { useI18n } from "../i18n";
export function ChildSession({
  initial,
  onExit,
}: {
  initial: Session;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [session, setSession] = useState(initial),
    [feedback, setFeedback] = useState(""),
    [pauseRequested, setPauseRequested] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const guard = useRef(false);
  useEffect(() => {
    if (feedback === "recorded") {
      const timer = setTimeout(() => setFeedback(""), 800);
      return () => clearTimeout(timer);
    }
  }, [feedback, session.cursor.trial]);
  const run = session.taskRuns[session.cursor.task];
  const stage = session.cursor.stage;
  const textKey = (prefix: "task" | "instruction") =>
    taskTextKey(prefix, run.kind, session.assessmentDefinition.id);
  const modernScene = session.assessmentDefinition.id !== "FG-BASELINE-1.0";
  const active =
    stage === "PRACTICE" || stage === "FORMAL" || stage === "TRAINING";
  const trials = run?.trials.filter(
    (x) =>
      x.phase === stage &&
      (stage !== "PRACTICE" ||
        x.id.includes(`:PRACTICE:${session.cursor.practiceAttempt}:`)),
  );
  const trial = trials?.[session.cursor.trial];
  const progressPercent = Math.round(sessionProgress(session) * 10000) / 100;
  const completedTrials =
    trials?.filter((trial) =>
      run.results.some((result) => result.trialId === trial.id),
    ).length ?? 0;
  async function persist(next: Session) {
    await SessionRepository.save(next);
    setSession(next);
  }
  async function advance() {
    if (busy) return;
    setBusy(true);
    try {
      const next = structuredClone(session);
      if (stage === "INSTRUCTION") {
        next.cursor.stage = "DEMO";
        await appendEvent(next, "DEMO_STARTED");
      } else {
        next.cursor.stage = next.mode === "TRAINING" ? "TRAINING" : "PRACTICE";
        await appendEvent(
          next,
          next.mode === "TRAINING" ? "TASK_STARTED" : "PRACTICE_STARTED",
        );
      }
      await persist(next);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function finish(result: TrialResult, paused: boolean) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      let nextFeedback: string | undefined;
      const next = structuredClone(session),
        r = next.taskRuns[next.cursor.task];
      r.results.push(result);
      await appendEvent(next, "TRIAL_COMPLETED", { result }, result.trialId);
      next.cursor.trial++;
      if (next.cursor.trial >= (trials?.length ?? 0)) {
        next.cursor.trial = 0;
        if (stage === "PRACTICE") {
          const practice = r.results.filter((x) =>
            trials!.some((t) => t.id === x.trialId),
          );
          const passed =
            practice.filter((x) => x.correct && x.timingValid).length >= 3;
          await appendEvent(next, "PRACTICE_ENDED", {
            passed,
            attempt: next.cursor.practiceAttempt,
          });
          if (passed) {
            r.ruleComprehension = "SUFFICIENT";
            next.cursor.stage = "FORMAL";
          } else if (next.cursor.practiceAttempt === 0) {
            next.cursor.practiceAttempt = 1;
            r.trials.push(
              ...generateTrials(
                r.kind,
                r.seed,
                "PRACTICE",
                1,
                next.assessmentDefinition.id,
              ),
            );
            next.cursor.stage = "INSTRUCTION";
            nextFeedback = "practiceRetry";
          } else {
            r.ruleComprehension = "INSUFFICIENT";
            await nextTask(next);
            nextFeedback = "skipTask";
          }
        } else await nextTask(next);
      }
      if (paused && next.status !== "COMPLETED") {
        next.status = "PAUSED";
        await appendEvent(next, "PAUSED");
      }
      await persist(next);
      if (paused) {
        onExit();
        return;
      }
      setFeedback(
        nextFeedback ??
          (next.cursor.stage === "INSTRUCTION"
            ? next.cursor.practiceAttempt === 1
              ? "practiceRetry"
              : "recorded"
            : stage === "PRACTICE"
              ? result.correct
                ? "good"
                : "again"
              : "recorded"),
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      guard.current = false;
    }
  }
  async function nextTask(next: Session) {
    const r = next.taskRuns[next.cursor.task];
    finishRun(r);
    await appendEvent(next, "TASK_COMPLETED", {
      ruleComprehension: r.ruleComprehension,
    });
    next.cursor.task++;
    next.cursor.stage = "INSTRUCTION";
    next.cursor.practiceAttempt = 0;
    if (next.cursor.task >= next.taskRuns.length) {
      next.status = "COMPLETED";
      next.completedAt = new Date().toISOString();
      if (next.mode === "ASSESSMENT") {
        next.abilitySnapshot = abilitySnapshot(next);
        const previous = await SessionRepository.forChild(next.childId);
        next.baselineType = baselineForSession(previous, next)
          ? "FOLLOW_UP"
          : "PERSONAL_BASELINE";
      }
      await appendEvent(next, "SESSION_COMPLETED");
    } else {
      await appendEvent(next, "TASK_STARTED");
      await appendEvent(next, "INSTRUCTION_SHOWN");
    }
  }
  async function pause() {
    if (active && trial && !feedback) {
      setPauseRequested(true);
      return;
    }
    const next = structuredClone(session);
    next.status = "PAUSED";
    await appendEvent(next, "PAUSED");
    await persist(next);
    onExit();
  }
  return (
    <main className="child-shell">
      <header className="child-header">
        <a className="brand">
          Focus<span>&</span>Go
        </a>
        <span>{t("today")}</span>
        {session.status !== "COMPLETED" && (
          <button
            className="secondary"
            disabled={busy}
            onClick={() => void pause()}
          >
            {t("pause")}
          </button>
        )}
      </header>
      {error && (
        <div role="alert" className="notice">
          {t("error")}
        </div>
      )}
      {session.status === "COMPLETED" ? (
        <section className="child-card finish">
          <div className="finish-icon">✧</div>
          <h1>{t("done")}</h1>
          <p>{t("done.sub")}</p>
          <button className="primary" onClick={onExit}>
            {t("backParent")}
          </button>
        </section>
      ) : (
        <>
          <div className="child-progress">
            <span>
              {t("progress")} {session.cursor.task + 1} /{" "}
              {session.taskRuns.length}
            </span>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={t("progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <i
                style={{
                  width: `${progressPercent}%`,
                }}
              />
            </div>
          </div>
          {active && (
            <p className="trial-progress" data-testid="trial-progress">
              {t(
                stage === "PRACTICE"
                  ? "practice"
                  : session.mode === "TRAINING"
                    ? "trainingMode"
                    : "formal",
              )}{" "}
              · {t("completedTrials")} {completedTrials} / {trials?.length ?? 0}
            </p>
          )}
          <section className="child-card">
            <div className="eyebrow">
              {t(
                stage === "PRACTICE"
                  ? "practice"
                  : active
                    ? "formal"
                    : stage === "DEMO"
                      ? "demo"
                      : "today",
              )}
            </div>
            <h1>{t(textKey("task"))}</h1>
            {feedback ? (
              <div className="feedback">
                <div>✧</div>
                <h2>{t(feedback)}</h2>
                {feedback !== "recorded" && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => setFeedback("")}
                  >
                    {t("next")}
                  </button>
                )}
              </div>
            ) : active && trial ? (
              <Trial
                key={trial.id}
                trial={trial}
                session={session}
                onComplete={(r, p) => void finish(r, p)}
                pauseRequested={pauseRequested}
                artifact={session.artifacts.find(
                  (a) => a.taskTemplateId === trial.taskTemplateId,
                )}
              />
            ) : (
              <div className="instruction-panel">
                <p>{t(textKey("instruction"))}</p>
                {stage === "DEMO" && (
                  <div className="demo-visual">
                    {run.kind === "CORSI" ? (
                      <span>① → ③ → ②</span>
                    ) : run.kind === "INSTRUCTION" ? (
                      <span>🍎 → ⭐</span>
                    ) : run.kind === "FLANKER" ? (
                      <span>
                        → <b>←</b> →
                      </span>
                    ) : run.kind === "DCCS" ? (
                      <span className="coral">● → ●</span>
                    ) : modernScene &&
                      (run.kind === "GNG" || run.kind === "SA") ? (
                      <div className="scene-demo">
                        <div>
                          <TaskScene
                            kind={run.kind}
                            symbol={run.kind === "GNG" ? "green-light" : "star"}
                            visible
                          />
                          <small>
                            {t(run.kind === "GNG" ? "trafficGo" : "findStar")}
                          </small>
                        </div>
                        <div>
                          <TaskScene
                            kind={run.kind}
                            symbol={run.kind === "GNG" ? "red-light" : "moon"}
                            visible
                          />
                          <small>{t("wait")}</small>
                        </div>
                      </div>
                    ) : (
                      <span>
                        {symbols.leaf} → ☝ {symbols.moon} → {t("wait")}
                      </span>
                    )}
                  </div>
                )}
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void advance()}
                >
                  {t(stage === "INSTRUCTION" ? "demo" : "begin")} →
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
