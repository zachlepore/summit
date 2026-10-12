import { test, expect } from "@playwright/test";
const enter = async (page: import("@playwright/test").Page) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Enter Mission" }).click();
};
test("daily checkoffs survive reload; measurements create, edit, delete", async ({
  page,
}) => {
  await enter(page);
  const habit = page.getByRole("button", { name: "Alcohol-free day" });
  await habit.click();
  await expect(habit).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: "Enter Mission" }).click();
  await expect(habit).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "Add observation" }).click();
  await page.getByLabel("Value", { exact: true }).fill("224.5");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(page.getByText("224.5 lb", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("223");
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(page.getByText("223 lb", { exact: true })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete observation" }).click();
  await expect(
    page.getByText("No recorded observations.", { exact: false }),
  ).toBeVisible();
});
test("training can be completed and skipped without breaking schedule", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await page.getByRole("button", { name: /Mon · Oct 12/ }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("completed");
  await page.getByLabel("Actual distance").fill("2");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(
    page.getByRole("button", { name: /Mon · Oct 12/ }),
  ).toContainText("Completed");
  await page.getByRole("button", { name: /Tue · Oct 13/ }).click();
  await page.getByLabel("Status", { exact: true }).selectOption("skipped");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(
    page.getByRole("button", { name: /Tue · Oct 13/ }),
  ).toContainText("Skipped");
  await expect(page.locator(".session")).toHaveCount(7);
});
test("second mission, settings, export and validated import", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Mission settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Create mission" }).click();
  await page
    .getByLabel("Mission name", { exact: true })
    .fill("Thirty-mile journey");
  await page
    .getByLabel("Primary objective / destination")
    .fill("Build endurance for a long hike");
  await page.getByRole("button", { name: "Save mission" }).click();
  await expect(
    page.getByRole("heading", { name: "Thirty-mile journey" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add habit" }).click();
  await page.getByLabel("Commitment", { exact: true }).fill("Walk outside");
  await page.getByRole("button", { name: "Save commitment" }).click();
  await expect(page.getByText("Walk outside", { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON" }).click(),
  ]);
  expect(download.suggestedFilename()).toContain("summit-backup");
  const path = await download.path();
  expect(path).toBeTruthy();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByText("Backup imported successfully.")).toBeVisible();
  await page
    .getByLabel("Select mission")
    .selectOption({ label: "Operation Winter Summit" });
  await expect(
    page.getByRole("heading", { name: "Operation Winter Summit" }),
  ).toBeVisible();
});
test("mobile entrance, navigation and dialogs fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  await page.getByRole("button", { name: "Add observation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/summit-mobile.png", fullPage: true });
});
test("corrupt data is preserved and recoverable", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() =>
    localStorage.setItem("summit.store", "corrupt data"),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your journal is protected." }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("summit.store"))).toBe(
    "corrupt data",
  );
});
test("timeline checkpoints, configurable goals and actual chart observations", async ({
  page,
}) => {
  await enter(page);
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(
    page.getByText("Oct 12 — Jan 10", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("WEEK 13", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Mark Build the foundation completed" })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark Build the foundation incomplete" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Mission settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Add goal" }).click();
  await page.getByLabel("Goal title").fill("Recovery supporting outcome");
  await page.getByLabel("Starting reference").fill("225");
  await page.getByLabel("Target", { exact: true }).fill("215");
  await page.getByLabel("Direction").selectOption("decrease");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(
    page.getByText("Recovery supporting outcome", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Measurements", exact: true }).click();
  for (const [date, value] of [
    ["2026-10-10", "225"],
    ["2026-10-11", "224"],
    ["2026-10-12", "223"],
  ]) {
    await page.getByRole("button", { name: "Add observation" }).click();
    await page.getByLabel("Date", { exact: true }).fill(date);
    await page.getByLabel("Value", { exact: true }).fill(value);
    await page.getByRole("button", { name: "Save observation" }).click();
  }
  await page.getByRole("button", { name: "ALL", exact: true }).click();
  await expect(page.locator(".recharts-line-dot")).toHaveCount(3);
  await expect(page.locator(".record")).toHaveCount(3);
  await expect(page.getByText("Aspirational", { exact: true })).toBeVisible();
});

test("a creative mission can log a custom session without adopting the training template", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Mission settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Create mission" }).click();
  await page
    .getByLabel("Mission name", { exact: true })
    .fill("Write a short story");
  await page
    .getByLabel("Primary objective / destination")
    .fill("Finish a first draft");
  await page.getByRole("button", { name: "Save mission" }).click();
  await page.getByRole("button", { name: "Training", exact: true }).click();
  await expect(page.locator(".session")).toHaveCount(0);
  await page.getByRole("button", { name: "Add session" }).click();
  await page.getByLabel("Activity", { exact: true }).fill("Draft chapter one");
  await page.getByLabel("Duration (min)").fill("45");
  await page.getByLabel("Status", { exact: true }).selectOption("completed");
  await page.getByRole("button", { name: "Save session" }).click();
  await expect(
    page.getByRole("button", { name: /Draft chapter one/ }),
  ).toContainText("Completed");
});
