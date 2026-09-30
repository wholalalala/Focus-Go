import { useEffect, useRef, useState } from "react";
import type {
  TrialDefinition,
  TrialResult,
  Session,
  ContentArtifact,
} from "../core/types";
import { scoreTrial } from "../core/scoring";
import { appendEvent, BrowserSpeechOutput } from "../core/runtime";
import { taskTextKey } from "../probes";
import { TaskScene } from "./TaskScene";
import { useI18n } from "../i18n";
export const symbols: Record<string, string> = {
  leaf: "♧",
  moon: "☾",
  apple: "🍎",
  star: "⭐",
  car: "🚙",
  left: "←",
  right: "→",
  neutral: "•",
};
const speech = new BrowserSpeechOutput();
export function Trial({
  trial,
  session,
  onComplete,
  pauseRequested,
  artifact,
}: {
  trial: TrialDefinition;
  session: Session;
  onComplete: (r: TrialResult, paused: boolean) => void;
  pauseRequested: boolean;
  artifact?: ContentArtifact;
}) {
  const { t, language } = useI18n();
  const [ready, setReady] = useState(false),
    [visible, setVisible] = useState(false),
    [highlight, setHighlight] = useState(""),
    [response, setResponse] = useState<string[]>([]);
  const state = useRef({
    scheduled: performance.now(),
    onset: 0,
    responseWindowOnset: 0,
    firstResponse: undefined as number | undefined,
    valid: !document.hidden,
    replays: 0,
    premature: false,
    response: [] as string[],
    finished: false,
  });
  const finishRef = useRef<(pause?: boolean) => void>(() => {});
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    const s = state.current;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    const later = (fn: () => void, ms: number) =>
      timers.push(setTimeout(fn, ms));
    const finish = (pause = false) => {
      if (s.finished) return;
      s.finished = true;
      if (pause) s.valid = false;
      const end = performance.now();
      if (!s.response.length)
        void appendEvent(session, "RESPONSE_TIMEOUT", {}, trial.id);
      speech.cancel();
      complete.current(
        scoreTrial(
          trial,
          s.response,
          { ...s, end, onset: s.onset || end },
          !pause &&
            end - s.responseWindowOnset >=
              trial.difficultySnapshot.responseWindowMs,
        ),
        pause,
      );
    };
    finishRef.current = finish;
    void appendEvent(
      session,
      "TRIAL_SCHEDULED",
      { scheduledOnset: s.scheduled },
      trial.id,
    );
    frame = requestAnimationFrame(() => {
      setVisible(true);
      const shown = performance.now();
      s.onset = shown;
      void appendEvent(
        session,
        "STIMULUS_SHOWN",
        { actualOnset: shown },
        trial.id,
      );
      const startResponse = () => {
        s.responseWindowOnset = performance.now();
        setReady(true);
        later(() => finish(), trial.difficultySnapshot.responseWindowMs);
      };
      if (trial.kind === "CORSI") {
        trial.expectedResponse.forEach((cell, i) => {
          later(
            () => {
              setHighlight(cell);
              void appendEvent(
                session,
                "SEQUENCE_ITEM_SHOWN",
                { cell, index: i },
                trial.id,
              );
            },
            400 + i * 850,
          );
          later(() => setHighlight(""), 1050 + i * 850);
        });
        later(startResponse, 400 + trial.expectedResponse.length * 850);
      } else {
        startResponse();
        if (trial.kind === "GNG" || trial.kind === "SA")
          later(
            () => setVisible(false),
            trial.difficultySnapshot.stimulusDurationMs,
          );
      }
    });
    const visibility = () => {
      if (document.hidden) s.valid = false;
      void appendEvent(
        session,
        document.hidden ? "PAGE_HIDDEN" : "PAGE_VISIBLE",
        {},
        trial.id,
      );
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      s.finished = true;
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", visibility);
      speech.cancel();
    };
  }, [trial.id]);
  useEffect(() => {
    if (pauseRequested) finishRef.current(true);
  }, [pauseRequested]);
  const respond = (value: string) => {
    const s = state.current;
    if (s.finished) return;
    const at = performance.now();
    if (!ready) {
      s.premature = true;
      s.valid = false;
      void appendEvent(
        session,
        "RESPONSE_RECEIVED",
        { value, premature: true, at },
        trial.id,
      );
      return;
    }
    void appendEvent(
      session,
      "RESPONSE_RECEIVED",
      {
        value,
        at,
        accepted:
          s.response.length < Math.max(1, trial.expectedResponse.length),
      },
      trial.id,
    );
    if (
      ["GNG", "SA", "FLANKER", "DCCS"].includes(trial.kind) &&
      s.response.length
    )
      return;
    if (s.response.length >= Math.max(1, trial.expectedResponse.length)) return;
    s.firstResponse ??= at;
    s.response.push(value);
    setResponse([...s.response]);
    if (
      !["GNG", "SA"].includes(trial.kind) &&
      s.response.length >= trial.expectedResponse.length
    )
      finishRef.current();
  };
  const instructionKey = taskTextKey(
    "instruction",
    trial.kind,
    session.assessmentDefinition.id,
  );
  const modernScene = session.assessmentDefinition.id !== "FG-BASELINE-1.0";
  const instruction =
    trial.kind === "INSTRUCTION"
      ? `${t("sequenceInstruction")} ${trial.expectedResponse.map((x) => t(x)).join(" → ")}`
      : t(instructionKey);
  const replay = () => {
    state.current.replays++;
    void appendEvent(session, "INSTRUCTION_REPLAYED", {}, trial.id);
    void appendEvent(session, "INSTRUCTION_AUDIO_STARTED", {}, trial.id);
    void speech.speak(instruction, language);
  };
  return (
    <div
      className={"trial theme-" + (artifact?.content.theme ?? "garden")}
      data-testid="trial"
      data-kind={trial.kind}
      data-ready={ready}
    >
      <div className="trial-instruction">
        <p>
          {trial.kind === "DCCS"
            ? t(trial.stimulus.rule!)
            : trial.kind === "CORSI"
              ? t(ready ? "yourTurn" : "watch")
              : t(instructionKey)}
        </p>
        <button className="text-button" onClick={replay}>
          ♫ {t("listen")}
        </button>
      </div>
      {(trial.kind === "GNG" || trial.kind === "SA") && (
        <>
          {modernScene ? (
            <TaskScene
              kind={trial.kind}
              symbol={trial.stimulus.symbol!}
              visible={visible}
            />
          ) : (
            <div
              className={"big-stimulus " + trial.stimulus.symbol}
              aria-live="off"
            >
              {visible ? symbols[trial.stimulus.symbol!] : "·"}
            </div>
          )}
          <button className="primary tap-button" onClick={() => respond("tap")}>
            {t(
              modernScene
                ? trial.kind === "GNG"
                  ? "trafficGo"
                  : "findStar"
                : "tap",
            )}
          </button>
        </>
      )}
      {trial.kind === "FLANKER" && (
        <>
          <div className="arrows">
            <span>
              {symbols[trial.stimulus.flankers!]}{" "}
              {symbols[trial.stimulus.flankers!]}
            </span>
            <strong>{symbols[trial.stimulus.direction!]}</strong>
            <span>
              {symbols[trial.stimulus.flankers!]}{" "}
              {symbols[trial.stimulus.flankers!]}
            </span>
          </div>
          <div className="response-row">
            {["left", "right"].map((d) => (
              <button key={d} onClick={() => respond(d)} aria-label={t(d)}>
                {symbols[d]}
              </button>
            ))}
          </div>
        </>
      )}
      {trial.kind === "CORSI" && (
        <div className="spatial-board">
          {Array.from({ length: 9 }, (_, i) => (
            <button
              aria-label={String(i + 1)}
              className={highlight === String(i) ? "lit" : ""}
              key={i}
              onClick={() => respond(String(i))}
            >
              {response.includes(String(i)) ? "·" : ""}
            </button>
          ))}
        </div>
      )}
      {trial.kind === "DCCS" && (
        <>
          <div className={"sort-shape " + trial.stimulus.color}>
            {trial.stimulus.shape === "circle" ? "●" : "▲"}
          </div>
          <div className="response-row sorting">
            {["left", "right"].map((d, i) => (
              <button aria-label={t(d)} key={d} onClick={() => respond(d)}>
                <span className={i ? "blue" : "coral"}>{i ? "▲" : "●"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {trial.kind === "INSTRUCTION" && (
        <>
          <div className="instruction-sequence">
            {trial.expectedResponse.map((x, i) => (
              <span key={i}>
                {i > 0 && <small>→</small>}
                <b aria-label={t(x)}>{symbols[x]}</b>
              </span>
            ))}
          </div>
          <div className="object-board">
            {(
              artifact?.content.objects ?? ["apple", "star", "car", "moon"]
            ).map((x) => (
              <button key={x} aria-label={t(x)} onClick={() => respond(x)}>
                {symbols[x]}
                {response.includes(x) && (
                  <small>{response.indexOf(x) + 1}</small>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {["CORSI", "INSTRUCTION"].includes(trial.kind) && (
        <button
          className="secondary"
          disabled={!ready}
          onClick={() => finishRef.current()}
        >
          {t("submit")} · {response.length}
        </button>
      )}
    </div>
  );
}
