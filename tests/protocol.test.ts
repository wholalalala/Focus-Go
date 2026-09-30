import { describe, it, expect } from "vitest";
import {
  baseline,
  legacyBaseline,
  legacyProbes,
  probes,
  generateTrials,
  taskTextKey,
} from "../src/probes";
import { createSession, baselineForSession } from "../src/core/runtime";
import { evidencePacket } from "../src/core/scoring";
import {
  evidencePacketSchema,
  localContent,
  validateTaskContent,
} from "../src/ai/validation";

describe("short protocol and legacy compatibility", () => {
  it("bounds all new task blocks including a full practice retry", () => {
    expect(probes.map((p) => p.trialCount)).toEqual([12, 10, 9, 8, 12, 9]);
    const session = createSession("c", "ASSESSMENT");
    const training = createSession("c", "TRAINING");
    for (const run of session.taskRuns) {
      const retry = generateTrials(
        run.kind,
        run.seed,
        "PRACTICE",
        1,
        baseline.id,
      );
      expect(run.trials.length + retry.length).toBeLessThanOrEqual(20);
      const trained = training.taskRuns.find((r) => r.kind === run.kind)!;
      expect(trained.trials.every((t) => t.phase === "TRAINING")).toBe(true);
      expect(trained.trials).toHaveLength(
        probes.find((p) => p.kind === run.kind)!.trialCount,
      );
    }
  });
  it("retains balanced conditions and distinct target stimuli", () => {
    const counts = (kind: Parameters<typeof generateTrials>[0]) =>
      generateTrials(kind, "balanced", "FORMAL").reduce<Record<string, number>>(
        (counts, t) => {
          counts[t.condition] = (counts[t.condition] ?? 0) + 1;
          return counts;
        },
        {},
      );
    expect(counts("GNG")).toEqual({ GO: 9, NO_GO: 3 });
    expect(counts("SA")).toEqual({ GO: 2, NO_GO: 8 });
    expect(counts("FLANKER")).toEqual({
      CONGRUENT: 3,
      INCONGRUENT: 3,
      NEUTRAL: 3,
    });
    expect(counts("CORSI")).toEqual({
      SPAN_2: 2,
      SPAN_3: 2,
      SPAN_4: 2,
      SPAN_5: 2,
    });
    expect(counts("DCCS")).toEqual({ PRE_SWITCH: 6, POST_SWITCH: 6 });
    expect(counts("INSTRUCTION")).toEqual({
      STEPS_1: 3,
      STEPS_2: 3,
      STEPS_3: 3,
    });
    expect(
      new Set(
        generateTrials("GNG", "a", "FORMAL").map((t) => t.stimulus.symbol),
      ),
    ).toEqual(new Set(["green-light", "red-light"]));
    expect(
      new Set(
        generateTrials("SA", "a", "FORMAL").map((t) => t.stimulus.symbol),
      ),
    ).toEqual(new Set(["star", "moon"]));
  });
  it("keeps v1 counts, seeded retry rules, instructions and evidence IDs", () => {
    expect(legacyProbes.map((p) => p.trialCount)).toEqual([
      40, 60, 30, 8, 16, 9,
    ]);
    const old = createSession(
      "c",
      "ASSESSMENT",
      undefined,
      [],
      "old",
      legacyBaseline,
    );
    for (const run of old.taskRuns) {
      const retry = generateTrials(
        run.kind,
        run.seed,
        "PRACTICE",
        1,
        old.assessmentDefinition.id,
      );
      expect(retry).toEqual(
        generateTrials(run.kind, run.seed, "PRACTICE", 1, legacyBaseline.id),
      );
      expect(retry.every((t) => t.probeId?.endsWith("1.0"))).toBe(true);
      const packet = evidencePacket(run, 6, old.assessmentDefinition.id);
      expect(evidencePacketSchema.parse(packet).assessmentId).toBe(
        legacyBaseline.id,
      );
    }
    expect(
      old.taskRuns[0].trials.filter(
        (t) => t.phase === "FORMAL" && t.expectedResponse.length,
      ),
    ).toHaveLength(30);
    expect(
      new Set(old.taskRuns[0].trials.map((t) => t.stimulus.symbol)),
    ).toEqual(new Set(["leaf", "moon"]));
    expect(taskTextKey("instruction", "GNG", legacyBaseline.id)).toBe(
      "instruction.GNG.legacy",
    );
    expect(taskTextKey("instruction", "GNG", baseline.id)).toBe(
      "instruction.GNG",
    );
  });
  it("selects the first baseline within a version and never compares the first to a later run", () => {
    const old = createSession(
      "c",
      "ASSESSMENT",
      ["GNG"],
      [],
      "old",
      legacyBaseline,
    );
    const first = createSession("c", "ASSESSMENT", ["GNG"]);
    const later = createSession("c", "ASSESSMENT", ["GNG"]);
    old.status = first.status = later.status = "COMPLETED";
    old.createdAt = "2026-09-28";
    first.createdAt = "2026-09-29";
    later.createdAt = "2026-09-30";
    expect(baselineForSession([old], first)).toBeUndefined();
    expect(baselineForSession([later, old, first], later)?.id).toBe(first.id);
    expect(baselineForSession([old, first, later], first)).toBeUndefined();
    const anotherChild = { ...old, childId: "other" };
    expect(baselineForSession([anotherChild], old)).toBeUndefined();
  });
  it("binds content labels and evidence packets to the actual task version", () => {
    for (const language of ["en", "zh-CN"] as const)
      for (const kind of ["GNG", "SA"] as const) {
        const current = localContent(language, kind, "2.0.0");
        expect(validateTaskContent(current, language, kind, "2.0.0")).toEqual(
          current,
        );
        expect(() =>
          validateTaskContent(
            localContent(language, kind, "1.0.0"),
            language,
            kind,
            "2.0.0",
          ),
        ).toThrow();
      }
    const run = createSession("c", "ASSESSMENT", ["GNG"]).taskRuns[0];
    const packet = evidencePacket(run, 6, baseline.id);
    expect(evidencePacketSchema.parse(packet).probeId).toBe("FG-GNG-PROBE-2.0");
    expect(() =>
      evidencePacketSchema.parse({
        ...packet,
        assessmentId: legacyBaseline.id,
      }),
    ).toThrow();
    expect(() =>
      evidencePacketSchema.parse({ ...packet, domain: "SUSTAINED_ATTENTION" }),
    ).toThrow();
  });
});
