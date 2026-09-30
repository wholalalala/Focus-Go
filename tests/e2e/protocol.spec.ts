import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/core/types";

test.use({ locale: "en-US" });
async function addChild(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add a child", exact: true })
    .first()
    .click();
  await page.getByLabel("Nickname", { exact: true }).fill("Protocol Explorer");
  await page.getByLabel("Birth month").fill("2020-06");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Protocol Explorer" }),
  ).toBeVisible();
}
async function current(page: Page): Promise<Session> {
  return page.evaluate(async () => {
    const path = "/src/data/repositories.ts";
    const { db } = await import(path);
    return (await db.sessions.toArray())
      .sort((a: Session, b: Session) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);
  });
}
async function finishGng(page: Page) {
  for (let turn = 0; turn < 150; turn++) {
    if (await page.getByRole("heading", { name: "All done for today" }).count())
      return;
    const feedback = page.locator(".feedback");
    if (await feedback.count()) {
      if (await feedback.getByRole("button").count()) {
        await feedback.getByRole("button").click();
        await expect(feedback).toHaveCount(0);
      } else await page.clock.fastForward(850);
      continue;
    }
    const demo = page.getByRole("button", { name: "Watch together" });
    if (await demo.count()) {
      await demo.click();
      await expect(
        page.getByRole("button", { name: "Let’s begin" }),
      ).toBeVisible();
      continue;
    }
    const begin = page.getByRole("button", { name: "Let’s begin" });
    if (await begin.count()) {
      await begin.click();
      await expect(page.getByTestId("trial")).toBeVisible();
      continue;
    }
    await expect(page.getByTestId("trial")).toBeVisible();
    await page.clock.fastForward(32);
    const s = await current(page);
    const r = s.taskRuns[0];
    const trial = r.trials.filter(
      (t) =>
        t.phase === s.cursor.stage &&
        (t.phase !== "PRACTICE" ||
          t.id.includes(`:PRACTICE:${s.cursor.practiceAttempt}:`)),
    )[s.cursor.trial];
    if (trial.expectedResponse.length)
      await page
        .getByRole("button", {
          name:
            s.assessmentDefinition.id === "FG-BASELINE-1.0" ? "Tap here" : "Go",
          exact: true,
        })
        .click();
    await page.clock.fastForward(2300);
    await expect(page.locator(".feedback, .finish")).toBeVisible();
  }
  throw new Error("Session did not finish");
}

test("legacy practice retry and report survive upgrade; new protocol establishes its own baseline", async ({
  page,
}) => {
  await addChild(page);
  await page.clock.install();
  await page.evaluate(async () => {
    const repoPath = "/src/data/repositories.ts",
      runtimePath = "/src/core/runtime.ts",
      probePath = "/src/probes/index.ts",
      scoringPath = "/src/core/scoring.ts";
    const { db } = await import(repoPath);
    const { createSession } = await import(runtimePath);
    const { legacyBaseline } = await import(probePath);
    const { scoreTrial } = await import(scoringPath);
    const child = (await db.children.toArray())[0];
    const s = createSession(
      child.id,
      "ASSESSMENT",
      ["GNG"],
      [],
      "legacy-browser",
      legacyBaseline,
    );
    const r = s.taskRuns[0];
    // A pre-upgrade session paused during its first failed practice block.
    const first = r.trials.find(
      (t: { phase: string }) => t.phase === "PRACTICE",
    );
    r.results.push(
      scoreTrial(first, first.expectedResponse.length ? [] : ["tap"], {
        scheduled: 0,
        onset: 1,
        end: 2201,
        firstResponse: 500,
        valid: true,
      }),
    );
    s.cursor = { task: 0, stage: "PRACTICE", trial: 1, practiceAttempt: 0 };
    s.status = "PAUSED";
    await db.sessions.put(s);
  });
  await page.reload();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page.getByRole("button", { name: "Resume session" }).click();
  await page.clock.fastForward(32);
  await expect(
    page.getByText(
      "Tap the leaf. When the moon appears, keep your hands still.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator("svg[data-scene]")).toHaveCount(0);
  // Fail the remaining old practice trials, forcing a retry to be generated after upgrade.
  for (let n = 1; n < 4; n++) {
    const s = await current(page);
    const trial = s.taskRuns[0].trials.filter((t) => t.phase === "PRACTICE")[n];
    if (!trial.expectedResponse.length)
      await page.getByRole("button", { name: "Tap here", exact: true }).click();
    await page.clock.fastForward(2300);
    await expect(page.locator(".feedback")).toBeVisible();
    await page.locator(".feedback").getByRole("button").click();
    await expect(page.locator(".feedback")).toHaveCount(0);
    if (n < 3) await page.clock.fastForward(32);
  }
  let old = await current(page);
  const retry = old.taskRuns[0].trials.filter((t) =>
    t.id.includes(":PRACTICE:1:"),
  );
  expect(retry).toHaveLength(4);
  expect(
    retry.every(
      (t) =>
        t.probeId === "FG-GNG-PROBE-1.0" &&
        ["leaf", "moon"].includes(t.stimulus.symbol!),
    ),
  ).toBe(true);
  await finishGng(page);
  old = await current(page);
  expect(old.taskRuns[0].trials).toHaveLength(48);
  expect(old.taskRuns[0].results).toHaveLength(48);
  expect(old.baselineType).toBe("PERSONAL_BASELINE");
  await page.getByRole("button", { name: "Back to parent" }).click();
  await page.getByRole("button", { name: "Evidence & provenance" }).click();
  await expect(page.getByRole("dialog")).toContainText("FG-GNG-PROBE-1.0");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(async () => {
    const repoPath = "/src/data/repositories.ts",
      runtimePath = "/src/core/runtime.ts";
    const { db } = await import(repoPath);
    const { createSession } = await import(runtimePath);
    const s = createSession((await db.children.toArray())[0].id, "ASSESSMENT", [
      "GNG",
    ]);
    s.status = "PAUSED";
    await db.sessions.put(s);
  });
  await page.reload();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page.getByRole("button", { name: "Resume session" }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic light challenge" }),
  ).toBeVisible();
  await finishGng(page);
  const latest = await current(page);
  expect(latest.assessmentDefinition.id).toBe("FG-BASELINE-2.0");
  expect(latest.baselineType).toBe("PERSONAL_BASELINE");
  expect(latest.taskRuns[0].results).toHaveLength(16);
  await page.getByRole("button", { name: "Back to parent" }).click();
  await expect(page.locator(".comparison table")).toHaveCount(0);
  await expect(page.locator(".section-heading")).toContainText(
    "FG-BASELINE-2.0",
  );
});

test("star observation demo and response fit a narrow screen in Chinese", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await addChild(page);
  await page.evaluate(async () => {
    const repoPath = "/src/data/repositories.ts",
      runtimePath = "/src/core/runtime.ts";
    const { db } = await import(repoPath);
    const { createSession } = await import(runtimePath);
    const child = (await db.children.toArray())[0];
    child.preferredLanguage = "zh-CN";
    await db.children.put(child);
    const s = createSession(child.id, "TRAINING", ["SA"], [], "space-mobile");
    s.status = "PAUSED";
    await db.sessions.put(s);
  });
  await page.reload();
  await page.clock.install();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page.getByRole("button", { name: "Resume session" }).click();
  await expect(page.getByRole("heading", { name: "星空观察员" })).toBeVisible();
  await page.getByRole("button", { name: "一起看一看", exact: false }).click();
  await expect(page.locator('svg[data-scene="space"]')).toHaveCount(2);
  await page.screenshot({
    path: "docs/screenshots/sa-demo-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "开始吧", exact: false }).click();
  await page.clock.fastForward(32);
  const s = await current(page);
  const trial = s.taskRuns[0].trials[0];
  await expect(page.getByRole("img")).toHaveAccessibleName(
    trial.expectedResponse.length ? "观察窗口中的星星" : "观察窗口中的月亮",
  );
  await expect(page.getByTestId("trial-progress")).toContainText("0 / 10");
  await page.clock.fastForward(1500);
  await expect(page.getByRole("img")).toHaveAccessibleName("等待下一个信号");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
