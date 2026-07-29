import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/import-jobs?history=true", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ jobs: [
      { id: "done", name: "family.mp4", provider: "google-photos", status: "complete", processingStatus: "ready", progress: 100, bytesTotal: 18_874_368, createdAt: "2026-07-27T00:00:00Z" },
      { id: "working", name: "reunion.mov", provider: "google-drive", status: "complete", processingStatus: "processing", progress: 100, bytesTotal: 92_274_688, createdAt: "2026-07-27T01:00:00Z" },
      { id: "failed", name: "legacy.mov", provider: "google-photos", status: "failed", processingStatus: null, progress: 34, error: "Provider connection interrupted.", bytesTotal: 45_000_000, createdAt: "2026-07-27T02:00:00Z" },
    ] }),
  }));
});

test("shows transfer and transcoding history with filters", async ({ page }) => {
  await page.goto("/#imports");
  await expect(page.getByRole("heading", { name: "Import History" })).toBeVisible();
  await expect(page.getByText("family.mp4")).toBeVisible();
  await expect(page.getByText("reunion.mov")).toBeVisible();
  await expect(page.getByText("legacy.mov")).toBeVisible();
  await page.getByRole("button", { name: "processing" }).click();
  await expect(page.getByText("reunion.mov")).toBeVisible();
  await expect(page.getByText("family.mp4")).not.toBeVisible();
});


test("surfaces provider failures that need attention", async ({ page }) => {
  await page.goto("/#imports");
  await page.getByRole("button", { name: "failed" }).click();
  await expect(page.getByText("legacy.mov")).toBeVisible();
  await expect(page.getByText("Provider connection interrupted.")).toBeVisible();
  await expect(page.getByText("family.mp4")).not.toBeVisible();
});


test("retries a failed import session with one session action", async ({ page }) => {
  let requestBody: any = null;
  await page.route("**/api/import-jobs/session-action", async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ contentType:"application/json",body:JSON.stringify({success:true,count:1}) });
  });
  await page.goto("/#imports");
  await page.getByRole("button",{name:"Retry items"}).click();
  expect(requestBody).toEqual({albumName:"Unassigned import",action:"retry"});
});
