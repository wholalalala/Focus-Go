import { describe, it, expect } from "vitest";
import { SeededRandom } from "../src/core/random";
import { generateTrials, probes } from "../src/probes";
import {
  scoreTrial,
  metricEngine,
  findingEngine,
  evidencePacket,
} from "../src/core/scoring";
import {
  validateContent,
  validateEvidence,
  localContent,
} from "../src/ai/validation";
import { createSession, finishRun } from "../src/core/runtime";
const timing = {
  scheduled: 90,
  onset: 100,
  end: 800,
  firstResponse: 750,
  valid: true,
};
describe("reproducible versioned probes", () => {
  it("same seed produces same sequence", () =>
    expect(new SeededRandom("a").shuffle([1, 2, 3, 4, 5])).toEqual(
      new SeededRandom("a").shuffle([1, 2, 3, 4, 5]),
    ));
  for (const p of probes)
    it(`${p.kind} protocol preserves counts and seed`, () => {
      const a = generateTrials(p.kind, "seed", "FORMAL");
      expect(a).toEqual(generateTrials(p.kind, "seed", "FORMAL"));
      expect(a).toHaveLength(p.trialCount);
      expect(new Set(a.map((t) => t.id)).size).toBe(a.length);
    });
  it("uses exactly 75% go and 20% rare targets", () => {
    expect(
      generateTrials("GNG", "a", "FORMAL").filter((t) => t.condition === "GO"),
    ).toHaveLength(9);
    expect(
      generateTrials("SA", "a", "FORMAL").filter((t) => t.condition === "GO"),
    ).toHaveLength(2);
  });
  it("never generates baseline content through AI", () => {
    for (const p of probes)
      expect(
        generateTrials(p.kind, "a", "FORMAL").every((t) => t.probeId === p.id),
      ).toBe(true);
  });
});
describe("deterministic scoring", () => {
  const trials = generateTrials("GNG", "a", "FORMAL"),
    go = trials.find((t) => t.condition === "GO")!,
    no = trials.find((t) => t.condition === "NO_GO")!;
  it("correct tap", () =>
    expect(scoreTrial(go, ["tap"], timing).correct).toBe(true));
  it("omission and timeout", () => {
    const r = scoreTrial(go, [], { ...timing, firstResponse: undefined }, true);
    expect(r.errorType).toBe("OMISSION");
    expect(r.timeout).toBe(true);
  });
  it("correct withholding has no reaction time", () => {
    const r = scoreTrial(no, [], { ...timing, firstResponse: undefined }, true);
    expect(r.correct).toBe(true);
    expect(r.reactionTimeMs).toBeUndefined();
  });
  it("commission", () =>
    expect(scoreTrial(no, ["tap"], timing).errorType).toBe("COMMISSION"));
  it("order error", () => {
    const t = generateTrials("CORSI", "a", "FORMAL")[0];
    expect(
      scoreTrial(t, [...t.expectedResponse].reverse(), timing).errorType,
    ).toBe("ORDER_ERROR");
  });
  it("intrusion", () => {
    const t = generateTrials("CORSI", "a", "FORMAL")[0];
    expect(scoreTrial(t, ["99", "98"], timing).errorType).toBe("INTRUSION");
  });
  it("perseveration", () => {
    const t = generateTrials("DCCS", "a", "FORMAL").find(
      (t) => t.condition === "POST_SWITCH",
    )!;
    expect(
      scoreTrial(t, [t.stimulus.previousExpected!], timing).errorType,
    ).toBe("PERSEVERATION");
  });
  it("premature response", () =>
    expect(
      scoreTrial(go, ["tap"], { ...timing, premature: true }).errorType,
    ).toBe("IMPULSIVE_RESPONSE"));
  it("late response", () =>
    expect(
      scoreTrial(go, ["tap"], { ...timing, firstResponse: 9999, end: 9999 })
        .errorType,
    ).toBe("TOO_SLOW"));
});
describe("metrics and findings", () => {
  it("excludes practice and invalid timing; null for unobserved condition", () => {
    const formal = generateTrials("GNG", "a", "FORMAL")
        .filter((t) => t.condition === "GO")
        .slice(0, 2),
      practice = generateTrials("GNG", "a", "PRACTICE")[0];
    const m = metricEngine(
      [...formal, practice],
      [
        scoreTrial(formal[0], ["tap"], timing),
        scoreTrial(formal[1], [], { ...timing, valid: false }),
        scoreTrial(practice, [], timing),
      ],
    );
    expect(m.accuracy).toBe(1);
    expect(m.validTrials).toBe(1);
    expect(m.invalidTimingTrials).toBe(1);
    expect(m.noGoAccuracy).toBeNull();
    expect(m.medianRtMs).toBe(650);
  });
  it("rates use condition denominators", () => {
    const trials = generateTrials("GNG", "a", "FORMAL");
    const results = trials.map((t) => scoreTrial(t, ["tap"], timing));
    const m = metricEngine(trials, results);
    expect(m.goAccuracy).toBe(1);
    expect(m.commissionRate).toBe(1);
    expect(m.omissionRate).toBe(0);
    expect(findingEngine("run", m).map((f) => f.type)).toContain(
      "COMMISSION_DOMINANT",
    );
  });
  it("instruction finding cites both step metrics", () => {
    const f = findingEngine("r", { "2StepAccuracy": 1, "3StepAccuracy": 0.5 });
    expect(f[0].evidenceRefs).toEqual([
      "r:metric:2StepAccuracy",
      "r:metric:3StepAccuracy",
    ]);
  });
  it("does not infer a pattern from missing metrics", () =>
    expect(
      findingEngine("r", {
        validTrials: 0,
        commissionRate: null,
        omissionRate: null,
      }),
    ).toEqual([]));
});
describe("AI guardrails", () => {
  it("valid built-in content", () =>
    expect(validateContent(localContent("en")).objects).toHaveLength(4));
  it("rejects malformed and rule changing output", () => {
    expect(() => validateContent({ foo: 1 })).toThrow();
    expect(() =>
      validateContent({ ...localContent("en"), trialCount: 1 }),
    ).toThrow();
  });
  it("rejects duplicate labels and unavailable objects", () => {
    expect(() =>
      validateContent({ ...localContent("en"), targetLabel: "Moon" }),
    ).toThrow();
    expect(() =>
      validateContent({
        ...localContent("en"),
        objects: ["apple", "apple", "car", "moon"],
      }),
    ).toThrow();
  });
  it("rejects uncited and fabricated claims even with valid references", () => {
    const s = createSession("child", "ASSESSMENT", ["GNG"]);
    const run = s.taskRuns[0];
    run.results = run.trials
      .filter((t) => t.phase === "FORMAL")
      .map((t) => scoreTrial(t, t.expectedResponse, timing));
    finishRun(run);
    const packet = evidencePacket(run, 6),
      f = packet.findings[0],
      approved = { [f.id]: "Observed performance." };
    const valid = {
      observations: [
        {
          findingId: f.id,
          statement: approved[f.id],
          evidenceRefs: f.evidenceRefs,
          confidence: "descriptive",
        },
      ],
      limitations: [],
    };
    expect(validateEvidence(valid, packet, approved).observations).toHaveLength(
      1,
    );
    expect(() =>
      validateEvidence(
        {
          ...valid,
          observations: [
            { ...valid.observations[0], evidenceRefs: ["missing"] },
          ],
        },
        packet,
        approved,
      ),
    ).toThrow();
    expect(() =>
      validateEvidence(
        {
          ...valid,
          observations: [
            { ...valid.observations[0], statement: "Your child has ADHD." },
          ],
        },
        packet,
        approved,
      ),
    ).toThrow();
  });
});

it("baseline snapshot and priorities preserve finding evidence", async () => {
  const { abilitySnapshot, suggestedDirections } =
    await import("../src/core/planner");
  const s = createSession("child", "ASSESSMENT", ["GNG"]);
  expect(suggestedDirections(s).domains).toEqual([]);
  const run = s.taskRuns[0];
  run.results = run.trials
    .filter((t) => t.phase === "FORMAL")
    .map((t) => scoreTrial(t, ["tap"], timing));
  finishRun(run);
  expect(suggestedDirections(s).domains).toEqual(["RESPONSE_INHIBITION"]);
  expect(abilitySnapshot(s).domains[0].findingIds).toEqual(
    run.findings.map((f) => f.id),
  );
});

it("preserves actual stimulus onset separately from sequence response-window onset", () => {
  const t = generateTrials("CORSI", "timing", "FORMAL")[0];
  const r = scoreTrial(t, t.expectedResponse, {
    scheduled: 90,
    onset: 100,
    responseWindowOnset: 2000,
    firstResponse: 2600,
    end: 2900,
    valid: true,
  });
  expect(r.stimulusActualOnsetMs).toBe(100);
  expect(r.responseWindowOnsetMs).toBe(2000);
  expect(r.reactionTimeMs).toBe(600);
});
it("counts premature inputs without including them in accuracy", () => {
  const t = generateTrials("GNG", "early", "FORMAL")[0];
  const r = scoreTrial(t, ["tap"], {
    ...timing,
    premature: true,
    valid: false,
  });
  const m = metricEngine([t], [r]);
  expect(m.prematureResponses).toBe(1);
  expect(m.validTrials).toBe(0);
  expect(m.accuracy).toBeNull();
});
