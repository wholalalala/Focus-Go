import type { Session } from "./types";

/** Completed work, independent of correctness and excluded timing trials. */
export function sessionProgress(session: Session): number {
  if (session.status === "COMPLETED") return 1;
  const run = session.taskRuns[session.cursor.task];
  if (!run || !session.taskRuns.length) return 0;
  const phase = session.mode === "ASSESSMENT" ? "FORMAL" : "TRAINING";
  const phaseTrials = run.trials.filter((trial) => trial.phase === phase);
  const completed = run.results.filter((result) =>
    phaseTrials.some((trial) => trial.id === result.trialId),
  ).length;
  const execution = phaseTrials.length ? completed / phaseTrials.length : 0;
  const practice = run.results.filter((result) =>
    run.trials.some(
      (trial) => trial.id === result.trialId && trial.phase === "PRACTICE",
    ),
  ).length;
  const practiceCount = run.trials.filter(
    (trial) => trial.phase === "PRACTICE" && trial.id.includes(":PRACTICE:0:"),
  ).length;
  const withinTask =
    session.mode === "TRAINING"
      ? execution
      : session.cursor.stage === "FORMAL"
        ? 0.25 + 0.75 * execution
        : Math.min(0.25, (practice / Math.max(1, practiceCount)) * 0.25);
  return Math.min(
    1,
    (session.cursor.task + withinTask) / session.taskRuns.length,
  );
}
