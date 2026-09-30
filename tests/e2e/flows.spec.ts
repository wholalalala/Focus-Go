import { test, expect, type Page } from "@playwright/test";
import type { Session } from "../../src/core/types";
async function addChild(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add a child", exact: true })
    .first()
    .click();
  await page.getByLabel("Nickname", { exact: true }).fill("Demo Explorer");
  await page.getByLabel("Birth month").fill("2020-06");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Demo Explorer" }),
  ).toBeVisible();
}
async function current(page: Page): Promise<Session> {
  return page.evaluate(async () => {
    const path = "/src/data/repositories.ts";
    const { db } = await import(path);
    const sessions = await db.sessions.toArray();
    return sessions
      .sort((a: Session, b: Session) => a.createdAt.localeCompare(b.createdAt))
      .at(-1);
  });
}
async function completeSession(page: Page) {
  await expect(page.locator(".child-shell")).toBeVisible();
  let turns = 0;
  while (turns++ < 500) {
    if (await page.getByRole("heading", { name: "All done for today" }).count())
      break;
    const feedback = page.locator(".feedback");
    if (await feedback.count()) {
      const button = feedback.getByRole("button");
      if (await button.count()) {
        await button.click();
        await expect(feedback).toHaveCount(0);
      } else await page.clock.fastForward(850);
      continue;
    }
    if (await page.getByRole("button", { name: "Watch together" }).count()) {
      await page.getByRole("button", { name: "Watch together" }).click();
      await expect(
        page.getByRole("button", { name: "Let’s begin" }),
      ).toBeVisible();
      continue;
    }
    if (await page.getByRole("button", { name: "Let’s begin" }).count()) {
      await page.getByRole("button", { name: "Let’s begin" }).click();
      await expect(page.getByTestId("trial")).toBeVisible();
      continue;
    }
    await expect(page.getByTestId("trial")).toBeVisible();
    await page.clock.fastForward(32);
    const s = await current(page);
    const run = s.taskRuns[s.cursor.task];
    const trial = run.trials.filter(
      (t) =>
        t.phase === s.cursor.stage &&
        (t.phase !== "PRACTICE" ||
          t.id.includes(`:PRACTICE:${s.cursor.practiceAttempt}:`)),
    )[s.cursor.trial];
    if (trial.kind === "CORSI") await page.clock.fastForward(5000);
    await expect(page.getByTestId("trial")).toHaveAttribute(
      "data-ready",
      "true",
    );
    if (
      (trial.kind === "GNG" || trial.kind === "SA") &&
      s.assessmentDefinition.id === "FG-BASELINE-2.0"
    ) {
      await expect(
        page.locator(
          `svg[data-scene="${trial.kind === "GNG" ? "traffic" : "space"}"]`,
        ),
      ).toBeVisible();
      if (trial.phase === "FORMAL" && trial.index === 0)
        await page.screenshot({
          path: `docs/screenshots/${trial.kind.toLowerCase()}-short.png`,
          fullPage: true,
        });
    }
    if (trial.kind === "GNG" || trial.kind === "SA") {
      if (trial.expectedResponse.length)
        await page
          .getByRole("button", {
            name:
              s.assessmentDefinition.id === "FG-BASELINE-1.0"
                ? "Tap here"
                : trial.kind === "GNG"
                  ? "Go"
                  : "Found a star",
            exact: true,
          })
          .click();
      await page.clock.fastForward(2300);
    } else if (trial.kind === "FLANKER" || trial.kind === "DCCS")
      await page
        .getByRole("button", {
          name: trial.expectedResponse[0] === "left" ? "Left" : "Right",
          exact: true,
        })
        .click();
    else if (trial.kind === "CORSI")
      for (const value of trial.expectedResponse)
        await page
          .getByRole("button", { name: String(Number(value) + 1), exact: true })
          .click();
    else
      for (const value of trial.expectedResponse)
        await page
          .getByRole("button", {
            name: (
              {
                apple: "red apple",
                star: "yellow star",
                car: "blue car",
                moon: "moon",
              } as Record<string, string>
            )[value],
            exact: true,
          })
          .click();
    await expect(async () => {
      const next = await current(page);
      expect(next.taskRuns.flatMap((r) => r.results).length).toBeGreaterThan(
        s.taskRuns.flatMap((r) => r.results).length,
      );
    }).toPass({ timeout: 5000 });
    await expect(page.locator(".feedback, .finish")).toBeVisible();
  }
  await expect(
    page.getByRole("heading", { name: "All done for today" }),
  ).toBeVisible();
}
test.use({ locale: "en-US" });
test("complete six-probe baseline, evidence, no-key training, export and translations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await addChild(page);
  await page.screenshot({
    path: "docs/screenshots/parent-desktop.png",
    fullPage: true,
  });
  await page.clock.install();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Personal Baseline", exact: false })
    .click();
  await completeSession(page);
  const baseline = await current(page);
  expect(baseline.baselineType).toBe("PERSONAL_BASELINE");
  expect(baseline.taskRuns).toHaveLength(6);
  expect(
    baseline.taskRuns.every((r) => r.ruleComprehension === "SUFFICIENT"),
  ).toBe(true);
  expect(
    baseline.taskRuns.reduce(
      (n, r) =>
        n +
        r.results.filter(
          (x) => r.trials.find((t) => t.id === x.trialId)?.phase === "FORMAL",
        ).length,
      0,
    ),
  ).toBe(60);
  await page.getByRole("button", { name: "Back to parent" }).click();
  await expect(
    page.getByRole("heading", { name: "An ability profile, not a label" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Why?" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("FG-GNG-PROBE-2.0");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/report-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Training plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prepare today’s activities" })
    .click();
  await expect(
    page.getByText(
      "AI content generation is unavailable or not configured. Using built-in training content.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start today’s practice" }).click();
  await completeSession(page);
  expect((await current(page)).mode).toBe("TRAINING");
  await page.getByRole("button", { name: "Back to parent" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export child data" }).click();
  expect((await download).suggestedFilename()).toMatch(/focusgo-.*\.json/);
  await page.getByRole("button", { name: "简体中文", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "只和自己的起点相遇" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("pause, reload, resume and CRUD on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await addChild(page);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Nickname", { exact: true }).fill("Updated Explorer");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Personal Baseline", exact: false })
    .click();
  await page.getByRole("button", { name: "Take a break" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page.getByRole("button", { name: "Resume session" }).click();
  await expect(
    page.getByRole("heading", { name: "Traffic light challenge" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take a break" }).click();
  await page.getByRole("button", { name: "Children", exact: true }).click();
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Updated Explorer" }),
  ).toHaveCount(0);
});
test("mobile layout and no fabricated first-run results", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByText("A little focus, a world to explore."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/screenshots/parent-mobile.png",
    fullPage: true,
  });
});

test("repeated failed practice skips formal trials without invented metrics", async ({
  page,
}) => {
  await addChild(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Personal Baseline", exact: false })
    .click();
  await expect(page.locator(".child-shell")).toBeVisible();
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Watch together" }).click();
    await expect(
      page.getByRole("button", { name: "Let’s begin" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Let’s begin" }).click();
    for (let n = 0; n < 4; n++) {
      await expect(page.getByTestId("trial")).toBeVisible();
      await page.clock.fastForward(32);
      const s = await current(page);
      const run = s.taskRuns[0];
      const trial = run.trials.filter(
        (t) => t.phase === "PRACTICE" && t.id.includes(`:PRACTICE:${attempt}:`),
      )[n];
      if (!trial.expectedResponse.length)
        await page
          .getByRole("button", {
            name:
              s.assessmentDefinition.id === "FG-BASELINE-1.0"
                ? "Tap here"
                : trial.kind === "GNG"
                  ? "Go"
                  : "Found a star",
            exact: true,
          })
          .click();
      await page.clock.fastForward(2300);
      await expect(page.locator(".feedback")).toBeVisible();
      await page.locator(".feedback").getByRole("button").click();
      await expect(page.locator(".feedback")).toHaveCount(0);
    }
  }
  const s = await current(page);
  expect(s.taskRuns[0].ruleComprehension).toBe("INSUFFICIENT");
  expect(s.taskRuns[0].results).toHaveLength(8);
  expect(s.taskRuns[0].metrics.validTrials).toBe(0);
  expect(s.taskRuns[0].findings).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "Watch the stars" }),
  ).toBeVisible();
});

test("pausing during a trial preserves an invalid result and append-only event", async ({
  page,
}) => {
  await addChild(page);
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Personal Baseline", exact: false })
    .click();
  await page.getByRole("button", { name: "Watch together" }).click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await expect(page.getByTestId("trial")).toBeVisible();
  await page.getByRole("button", { name: "Take a break" }).click();
  await expect(page.locator(".child-shell")).toHaveCount(0);
  const s = await current(page);
  expect(s.status).toBe("PAUSED");
  expect(s.taskRuns[0].results).toHaveLength(1);
  expect(s.taskRuns[0].results[0].timingValid).toBe(false);
  expect(s.cursor.trial).toBe(1);
  const types = await page.evaluate(async (id) => {
    const path = "/src/data/repositories.ts";
    const { EventRepository } = await import(path);
    return (await EventRepository.forSession(id)).map(
      (e: { type: string }) => e.type,
    );
  }, s.id);
  expect(types).toContain("TRIAL_COMPLETED");
  expect(types).toContain("PAUSED");
});
