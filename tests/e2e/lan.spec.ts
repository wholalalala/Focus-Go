import { test, expect } from "@playwright/test";
import { networkInterfaces } from "node:os";
import type { Session } from "../../src/core/types";
const address = Object.values(networkInterfaces())
  .flat()
  .find(
    (entry) =>
      entry?.family === "IPv4" &&
      !entry.internal &&
      !entry.address.startsWith("198.18."),
  )?.address;
test.use({
  locale: "en-US",
  baseURL: process.env.FOCUSGO_LAN_URL ?? `http://${address}:5173`,
});
async function current(
  page: import("@playwright/test").Page,
): Promise<Session> {
  return page.evaluate(async () => {
    const path = "/src/data/repositories.ts";
    const { db } = await import(path);
    return (await db.sessions.toArray()).at(-1);
  });
}
test("LAN HTTP supports profiles, assessment results and visible trial progress", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await page
    .getByRole("button", { name: "Add a child", exact: true })
    .first()
    .click();
  await page.getByLabel("Nickname", { exact: true }).fill("LAN Explorer");
  await page.getByLabel("Birth month").fill("2020-06");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "LAN Explorer" }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Personal Baseline", exact: false })
    .click();
  await page.getByRole("button", { name: "Watch together" }).click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  const progress = page.getByRole("progressbar");
  for (let index = 0; index < 5; index++) {
    await expect(page.getByTestId("trial")).toBeVisible();
    await page.clock.fastForward(32);
    await expect(page.getByTestId("trial")).toHaveAttribute(
      "data-ready",
      "true",
    );
    const before = await current(page);
    const run = before.taskRuns[0];
    const trial = run.trials.filter((t) => t.phase === before.cursor.stage)[
      before.cursor.trial
    ];
    if (trial.expectedResponse.length)
      await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.clock.fastForward(2300);
    await expect(page.locator(".feedback")).toBeVisible();
    await expect(async () =>
      expect((await current(page)).taskRuns[0].results.length).toBe(index + 1),
    ).toPass({ timeout: 5000 });
    expect(
      Number(await progress.getAttribute("aria-valuenow")),
    ).toBeGreaterThan(0);
    const button = page.locator(".feedback").getByRole("button");
    if (await button.count()) {
      await button.click();
      await expect(page.locator(".feedback")).toHaveCount(0);
    } else await page.clock.fastForward(850);
  }
  const after = await current(page);
  expect(after.cursor.stage).toBe("FORMAL");
  expect(after.cursor.trial).toBe(1);
  await expect(page.getByTestId("trial-progress")).toContainText("1 / 12");
  await page.screenshot({
    path: "docs/screenshots/lan-assessment.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Take a break" }).click();
  await expect(page.locator(".child-shell")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Assessment", exact: true }).click();
  await page.getByRole("button", { name: "Resume session" }).click();
  await expect(page.getByTestId("trial-progress")).toContainText("2 / 12");
  expect(errors).toEqual([]);
});
