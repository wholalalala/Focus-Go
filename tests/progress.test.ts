import { afterEach, describe, expect, it, vi } from "vitest";
import { createId } from "../src/core/id";
import { createSession } from "../src/core/runtime";
import { sessionProgress } from "../src/core/progress";
import { scoreTrial } from "../src/core/scoring";
import { generateTrials } from "../src/probes";
const timing = {
  scheduled: 90,
  onset: 100,
  end: 800,
  firstResponse: 750,
  valid: true,
};
afterEach(() => vi.unstubAllGlobals());
it("creates RFC-compatible distinct IDs without the secure-context randomUUID API", () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(
    globalThis.crypto,
  );
  vi.stubGlobal("crypto", { getRandomValues });
  const ids = Array.from({ length: 100 }, () => createId());
  expect(new Set(ids).size).toBe(100);
  for (const id of ids)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  expect(createSession("lan", "ASSESSMENT").taskRuns).toHaveLength(6);
});
describe("session progress reflects completed work rather than accuracy", () => {
  it("increases during practice and formal trials", () => {
    const s = createSession("a", "ASSESSMENT", ["GNG"]);
    s.cursor.stage = "PRACTICE";
    const r = s.taskRuns[0];
    const practice = r.trials.filter((t) => t.phase === "PRACTICE");
    expect(sessionProgress(s)).toBe(0);
    r.results.push(scoreTrial(practice[0], [], timing));
    expect(sessionProgress(s)).toBeGreaterThan(0);
    r.results = practice.map((t) => scoreTrial(t, t.expectedResponse, timing));
    const practiceProgress = sessionProgress(s);
    s.cursor.stage = "FORMAL";
    expect(sessionProgress(s)).toBe(practiceProgress);
    const firstFormal = r.trials.find((t) => t.phase === "FORMAL")!;
    r.results.push(scoreTrial(firstFormal, [], { ...timing, valid: false }));
    expect(sessionProgress(s)).toBeGreaterThan(practiceProgress);
  });
  it("does not reset while retrying practice", () => {
    const s = createSession("a", "ASSESSMENT", ["GNG"]);
    const r = s.taskRuns[0];
    r.results = r.trials
      .filter((t) => t.phase === "PRACTICE")
      .map((t) => scoreTrial(t, [], timing));
    s.cursor.stage = "INSTRUCTION";
    s.cursor.practiceAttempt = 1;
    const before = sessionProgress(s);
    r.trials.push(...generateTrials("GNG", r.seed, "PRACTICE", 1));
    s.cursor.stage = "PRACTICE";
    expect(sessionProgress(s)).toBe(before);
  });
  it("counts training trials directly and completes at one", () => {
    const s = createSession("a", "TRAINING", ["GNG"]);
    s.cursor.stage = "TRAINING";
    const r = s.taskRuns[0];
    const trial = r.trials.find((t) => t.phase === "TRAINING")!;
    r.results.push(scoreTrial(trial, [], timing));
    expect(sessionProgress(s)).toBeCloseTo(1 / 12);
    s.status = "COMPLETED";
    expect(sessionProgress(s)).toBe(1);
  });
});
