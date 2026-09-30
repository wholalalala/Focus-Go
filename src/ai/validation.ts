import { z } from "zod";
import { probesForAssessment, templates } from "../probes";
import type { EvidencePacket, Language, TaskKind } from "../core/types";
export const contentSchema = z
  .object({
    theme: z.enum(["garden", "space", "ocean"]),
    encouragement: z.string().min(1).max(60),
    targetLabel: z.string().min(1).max(16),
    distractorLabel: z.string().min(1).max(16),
    objects: z.array(z.enum(["apple", "star", "car", "moon"])).length(4),
  })
  .strict();
const prohibited =
  /ADHD|diagnos|percentile|abnormal|normal child|behind peers|stupid|kill|weapon|广告|诊断|落后|笨|多动症|正常|异常|排名|百分位/i;
export function validateContent(data: unknown) {
  const c = contentSchema.parse(data);
  if (
    c.targetLabel.toLowerCase() === c.distractorLabel.toLowerCase() ||
    new Set(c.objects).size !== 4 ||
    prohibited.test(JSON.stringify(c))
  )
    throw new Error("Unsafe or ambiguous content");
  return c;
}
export const reportSchema = z
  .object({
    observations: z
      .array(
        z
          .object({
            findingId: z.string(),
            statement: z.string().max(300),
            evidenceRefs: z.array(z.string()).min(1),
            confidence: z.literal("descriptive"),
          })
          .strict(),
      )
      .max(10),
    limitations: z.array(z.string()).max(0),
  })
  .strict();
export function validateEvidence(
  data: unknown,
  packet: EvidencePacket,
  approved: Record<string, string>,
) {
  const report = reportSchema.parse(data);
  for (const o of report.observations) {
    const f = packet.findings.find((f) => f.id === o.findingId);
    if (
      !f ||
      !o.evidenceRefs.length ||
      o.evidenceRefs.some(
        (ref) =>
          !f.evidenceRefs.includes(ref) ||
          !packet.evidence.some((e) => e.id === ref),
      ) ||
      o.statement !== approved[f.id]
    )
      throw new Error("Unsupported claim");
  }
  return report;
}
export function localContent(
  language: Language,
  kind: TaskKind = "INSTRUCTION",
  version = "2.0.0",
) {
  const modern = version === "2.0.0";
  const target =
    modern && kind === "GNG"
      ? ["Green light", "绿灯"]
      : modern && kind === "SA"
        ? ["Star", "星星"]
        : ["Leaf", "叶子"];
  const distractor =
    modern && kind === "GNG" ? ["Red light", "红灯"] : ["Moon", "月亮"];
  return {
    theme: "garden" as const,
    encouragement:
      language === "en" ? "One small step at a time." : "一步一步，慢慢来。",
    targetLabel: target[language === "en" ? 0 : 1],
    distractorLabel: distractor[language === "en" ? 0 : 1],
    objects: ["apple", "star", "car", "moon"] as (
      "apple" | "star" | "car" | "moon"
    )[],
  };
}

export const evidencePacketSchema = z
  .object({
    childAgeYears: z.number().int().min(5).max(8),
    assessmentId: z.enum(["FG-BASELINE-1.0", "FG-BASELINE-2.0"]),
    taskRunId: z.string().max(100),
    probeId: z.string().max(100),
    domain: z.enum([
      "SUSTAINED_ATTENTION",
      "SELECTIVE_ATTENTION",
      "RESPONSE_INHIBITION",
      "SPATIAL_WORKING_MEMORY",
      "RULE_SWITCHING",
      "MULTI_STEP_EXECUTION",
    ]),
    metrics: z.record(z.number().finite().nullable()),
    findings: z
      .array(
        z
          .object({
            id: z.string().max(200),
            type: z.string().max(100),
            statementKey: z.string().max(100),
            evidenceRefs: z.array(z.string().max(200)).max(20),
            rule: z.string().max(500),
          })
          .strict(),
      )
      .max(20),
    evidence: z
      .array(
        z
          .object({
            id: z.string().max(200),
            taskRunId: z.string().max(100),
            metric: z.string().max(100),
            value: z.number().finite().nullable(),
            trialIds: z.array(z.string().max(200)).max(200),
          })
          .strict(),
      )
      .max(60),
  })
  .strict()
  .refine((packet) => {
    const probe = probesForAssessment(packet.assessmentId).find(
      (probe) => probe.id === packet.probeId,
    );
    return (
      !!probe &&
      templates.find((template) => template.kind === probe.kind)!.domain ===
        packet.domain
    );
  }, "Probe and domain must match the assessment protocol");

/** Bind cosmetic names to the task's fixed stimulus meanings. */
export function validateTaskContent(
  data: unknown,
  language: Language,
  kind: TaskKind,
  version: string,
) {
  const content = validateContent(data);
  const expected = localContent(language, kind, version);
  if (
    content.targetLabel !== expected.targetLabel ||
    content.distractorLabel !== expected.distractorLabel
  )
    throw new Error("Labels do not match the task version");
  return content;
}
