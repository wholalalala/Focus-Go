import { it, expect, afterEach } from "vitest";
import { request, type Server } from "node:http";
import { createApp } from "../server/app";
import { MockProvider } from "../server/provider";
import type { TaskKind } from "../src/core/types";
import { localContent } from "../src/ai/validation";
const servers: Server[] = [];
async function start(provider?: MockProvider) {
  const app = createApp(provider);
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((r) => server.on("listening", () => r()));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
afterEach(() => {
  servers.forEach((s) => s.close());
});
it("missing key returns a playable immutable fallback", async () => {
  const base = await start();
  const res = await fetch(base + "/api/ai/generate-training-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "GNG",
      language: "en",
      targetAge: 6,
      simulateUnavailable: true,
    }),
  });
  const body = await res.json();
  expect(body.fallback).toBe(true);
  expect(body.artifact.source).toBe("BUILT_IN");
  expect(body.artifact.content.objects).toHaveLength(4);
  expect(JSON.stringify(body)).not.toContain("apiKey");
});
it("invalid model content retries then falls back", async () => {
  const base = await start(new MockProvider({ unsafe: "x" }));
  const res = await fetch(base + "/api/ai/generate-training-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "INSTRUCTION",
      language: "zh-CN",
      targetAge: 7,
    }),
  });
  const body = await res.json();
  expect(body.fallback).toBe(true);
  expect(body.invocations).toHaveLength(2);
});
it("valid generation plus semantic validation works for three families", async () => {
  class ValidProvider extends MockProvider {
    override async generateStructured(
      prompt: Parameters<MockProvider["generateStructured"]>[0],
      input: unknown,
    ) {
      const result = await super.generateStructured(prompt, input);
      return {
        ...result,
        data:
          prompt.promptId === "FG_CONTENT_VALIDATOR"
            ? { accepted: true }
            : localContent("en", (input as { kind: TaskKind }).kind),
      };
    }
  }
  const base = await start(new ValidProvider(null));
  for (const kind of ["GNG", "INSTRUCTION", "SA"]) {
    const res = await fetch(base + "/api/ai/generate-training-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, language: "en", targetAge: 6 }),
    });
    const body = await res.json();
    expect(body.fallback).toBe(false);
    expect(body.artifact.generatedBy.invocationId).toBeTruthy();
  }
});
it("rejects cross-origin and unknown task input", async () => {
  const base = await start();
  expect(
    (
      await fetch(base + "/api/health", {
        headers: { Origin: "https://untrusted.example" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(base + "/api/ai/generate-training-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
  ).toBe(400);
});

it("report endpoint rejects extraneous profile fields before provider invocation", async () => {
  const base = await start();
  const res = await fetch(base + "/api/ai/generate-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: "en",
      packet: { nickname: "private", findings: [], evidence: [] },
    }),
  });
  expect(res.status).toBe(400);
});

it("accepts same-origin LAN access, including the frontend proxy host", async () => {
  const base = await start();
  for (const port of [3001, 5173]) {
    const host = `192.168.1.10:${port}`;
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(
        base + "/api/health",
        { headers: { Host: host, Origin: `http://${host}` } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
    expect(status).toBe(200);
  }
});

it("content labels and cache keys follow the requested task version", async () => {
  const base = await start();
  const artifacts = [];
  for (const templateVersion of ["1.0.0", "2.0.0"]) {
    const response = await fetch(base + "/api/ai/generate-training-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "GNG",
        language: "zh-CN",
        targetAge: 6,
        templateVersion,
        simulateUnavailable: true,
      }),
    });
    expect(response.status).toBe(200);
    const { artifact } = await response.json();
    expect(artifact.taskTemplateVersion).toBe(templateVersion);
    expect(artifact.content.targetLabel).toBe(
      templateVersion === "1.0.0" ? "叶子" : "绿灯",
    );
    artifacts.push(artifact);
  }
  expect(artifacts[0].cacheKey).not.toBe(artifacts[1].cacheKey);
});

it("rejects stale stimulus labels even if the semantic model would accept them", async () => {
  const base = await start(
    new MockProvider(localContent("en", "GNG", "1.0.0")),
  );
  const response = await fetch(base + "/api/ai/generate-training-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "GNG", language: "en", targetAge: 6 }),
  });
  const result = await response.json();
  expect(result.fallback).toBe(true);
  expect(result.invocations).toHaveLength(2);
  expect(result.artifact.content.targetLabel).toBe("Green light");
});

it("report endpoint accepts both stored protocols and rejects mixed versions", async () => {
  const { createSession } = await import("../src/core/runtime");
  const { baseline, legacyBaseline } = await import("../src/probes");
  const { evidencePacket } = await import("../src/core/scoring");
  const base = await start();
  for (const assessment of [legacyBaseline, baseline]) {
    const session = createSession(
      "c",
      "ASSESSMENT",
      ["GNG"],
      [],
      "report",
      assessment,
    );
    const packet = evidencePacket(session.taskRuns[0], 6, assessment.id);
    const send = (payload: typeof packet) =>
      fetch(base + "/api/ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "en", packet: payload }),
      });
    expect((await send(packet)).status).toBe(200);
    expect(
      (
        await send({
          ...packet,
          assessmentId:
            assessment.id === baseline.id ? legacyBaseline.id : baseline.id,
        })
      ).status,
    ).toBe(400);
  }
});
