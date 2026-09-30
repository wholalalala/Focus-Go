import express from "express";
import { z } from "zod";
import { OpenAICompatibleProvider, type LLMProvider } from "./provider";
import {
  localContent,
  validateTaskContent,
  validateEvidence,
  evidencePacketSchema,
} from "../src/ai/validation";
import { prompts } from "../src/ai/prompts";
import { templateForVersion } from "../src/probes";
import type {
  AIInvocation,
  ContentArtifact,
  TrainingContent,
} from "../src/core/types";
import { hash } from "../src/core/random";
import en from "../src/i18n/en.json";
import zh from "../src/i18n/zh-CN.json";
const requestSchema = z
  .object({
    kind: z.enum(["GNG", "SA", "FLANKER", "CORSI", "DCCS", "INSTRUCTION"]),
    templateVersion: z.enum(["1.0.0", "2.0.0"]).default("2.0.0"),
    language: z.enum(["en", "zh-CN"]),
    targetAge: z.number().int().min(5).max(8),
    theme: z.enum(["garden", "space", "ocean"]).default("garden"),
    simulateUnavailable: z.boolean().optional(),
  })
  .strict();
export function createApp(providerOverride?: LLMProvider) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "80kb" }));
  app.use("/api", (req, res, next) => {
    const origin = req.get("origin");
    if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
      res.status(403).json({ error: "ORIGIN_REJECTED" });
      return;
    }
    next();
  });
  const config = {
    baseUrl: process.env.FOCUSGO_LLM_BASE_URL || "https://api.deepseek.com",
    apiKey: process.env.FOCUSGO_LLM_API_KEY || "",
    model: process.env.FOCUSGO_LLM_MODEL || "deepseek-flash",
  };
  const provider =
    providerOverride ??
    (config.apiKey ? new OpenAICompatibleProvider(config) : undefined);
  app.get("/api/health", (_req, res) =>
    res.json({
      ok: true,
      configured: !!provider,
      baseUrl: config.baseUrl,
      model: config.model,
    }),
  );
  app.post("/api/ai/generate-training-content", async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_REQUEST" });
      return;
    }
    const input = parsed.data;
    const template = templateForVersion(input.kind, input.templateVersion);
    const invocations: AIInvocation[] = [];
    let content: TrainingContent = {
      ...localContent(input.language, input.kind, template.version),
      theme: input.theme,
    };
    let source: ContentArtifact["source"] = "BUILT_IN";
    if (provider && !input.simulateUnavailable)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await provider.generateStructured(prompts.content, {
            ...input,
            taskTemplateId: template.id,
            taskVersion: template.version,
            domain: template.domain,
            paradigm: template.paradigm,
            difficulty: template.difficultySchema,
            requiredLabels: {
              targetLabel: content.targetLabel,
              distractorLabel: content.distractorLabel,
            },
          });
          invocations.push(result.invocation);
          const candidate = validateTaskContent(
            result.data,
            input.language,
            input.kind,
            template.version,
          );
          const review = await provider.generateStructured(prompts.validation, {
            language: input.language,
            content: candidate,
            kind: input.kind,
            taskVersion: template.version,
            requiredLabels: {
              targetLabel: content.targetLabel,
              distractorLabel: content.distractorLabel,
            },
          });
          invocations.push(review.invocation);
          if (
            !z
              .object({ accepted: z.literal(true) })
              .strict()
              .safeParse(review.data).success
          )
            throw new Error("SEMANTIC_REJECTED");
          content = candidate;
          source = "AI";
          result.invocation.validationResult = "VALID";
          review.invocation.validationResult = "VALID";
          break;
        } catch (e) {
          const invocation = (e as { invocation?: AIInvocation }).invocation;
          if (invocation) invocations.push(invocation);
          for (const i of invocations)
            if (i.validationResult === "PENDING")
              i.validationResult = "REJECTED";
        }
      }
    const artifact: ContentArtifact = {
      id: crypto.randomUUID(),
      taskTemplateId: template.id,
      taskTemplateVersion: template.version,
      language: input.language,
      targetAge: input.targetAge,
      difficultySnapshot: template.difficultySchema,
      generatedBy:
        source === "AI"
          ? {
              invocationId: [...invocations]
                .reverse()
                .find(
                  (i) =>
                    i.promptId === prompts.content.promptId &&
                    i.validationResult === "VALID",
                )!.id,
            }
          : undefined,
      content,
      createdAt: new Date().toISOString(),
      contentHash: hash(content),
      cacheKey: hash({
        template: template.id,
        version: template.version,
        difficulty: template.difficultySchema,
        language: input.language,
        ageBand: "5-8",
        theme: input.theme,
      }),
      source,
    };
    res.json({ artifact, invocations, fallback: source === "BUILT_IN" });
  });
  app.post("/api/ai/generate-report", async (req, res) => {
    const parsed = z
      .object({
        packet: evidencePacketSchema,
        language: z.enum(["en", "zh-CN"]),
      })
      .strict()
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "INVALID_PACKET" });
      return;
    }
    const { packet, language } = parsed.data;
    const translations: Record<string, string> = language === "en" ? en : zh;
    const approved = Object.fromEntries(
      packet.findings
        .filter((f) => translations[f.statementKey])
        .map((f) => [f.id, translations[f.statementKey]]),
    );
    const invocations: AIInvocation[] = [];
    if (provider)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await provider.generateStructured(prompts.report, {
            packet,
            language,
            approvedStatements: approved,
          });
          invocations.push(result.invocation);
          const report = validateEvidence(result.data, packet, approved);
          result.invocation.validationResult = "VALID";
          res.json({ report, invocations, fallback: false });
          return;
        } catch (e) {
          const invocation = (e as { invocation?: AIInvocation }).invocation;
          if (invocation) invocations.push(invocation);
          for (const i of invocations)
            if (i.validationResult === "PENDING")
              i.validationResult = "REJECTED";
        }
      }
    res.json({
      report: { observations: [], limitations: [] },
      invocations,
      fallback: true,
    });
  });
  return app;
}
