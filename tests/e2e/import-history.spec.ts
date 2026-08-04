import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/audit/files", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ rows: [
      { id:"done",name:"family.mp4",mediaId:"media-done",hasThumbnail:true,r2AlbumName:"Family Reunion",arweaveAlbumName:"Family Reunion",contentType:"video/mp4",status:"complete",processingStatus:"ready",archiveStatus:"confirmed",arweaveId:"abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG",bytesTotal:18874368,r2UploadedAt:"2026-07-27T00:05:00Z",permanentArchiveDate:"2026-07-27T00:10:00Z" },
      { id:"working",name:"reunion.jpg",mediaId:"media-working",r2AlbumName:"Family Reunion",arweaveAlbumName:"Family Reunion",contentType:"image/jpeg",status:"complete",processingStatus:"ready",archiveStatus:"submitted",bytesTotal:2274688,r2UploadedAt:"2026-07-27T01:05:00Z",permanentArchiveDate:null },
      { id:"failed",name:"legacy.mov",mediaId:null,r2AlbumName:null,arweaveAlbumName:null,contentType:"video/quicktime",status:"failed",archiveStatus:null,error:"Provider connection interrupted.",bytesTotal:45000000,r2UploadedAt:null,permanentArchiveDate:null }
    ] }),
  }));
});

test("shows the import audit as a plain file ledger", async ({ page }) => {
  await page.goto("/#imports");
  await expect(page.getByRole("heading",{name:"Audit"})).toBeVisible();
  for (const heading of ["Preview","File","R2 album","Arweave album","Type","Size","Status","Arweave ID","Upload to R2 date","Permanent archive date"]) {
    await expect(page.getByRole("columnheader",{name:heading,exact:true})).toBeVisible();
  }
  const permanentRow=page.getByRole("row").filter({hasText:"family.mp4"});
  await expect(permanentRow).toContainText("Family Reunion");
  await expect(permanentRow).toContainText("video/mp4");
  await expect(permanentRow).toContainText("18.0 MB");
  await expect(permanentRow).toContainText("Permanent");
  await expect(permanentRow.getByRole("link",{name:"family.mp4"})).toHaveAttribute("href","/api/media/media-done");
  await expect(permanentRow.locator("a[href=\"https://arweave.net/abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG\"]")).toHaveAttribute("href","https://arweave.net/abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG");
  await expect(permanentRow.getByRole("button",{name:"Family Reunion"})).toBeVisible();
  await expect(permanentRow.locator("img")).toHaveAttribute("src","/api/media/media-done/thumbnail?size=small");
  await expect(permanentRow.getByRole("cell").last()).not.toHaveText("—");

  const submittedRow=page.getByRole("row").filter({hasText:"reunion.jpg"});
  await expect(submittedRow).toContainText("R2 ready · submitted");
  await expect(submittedRow.getByRole("cell").last()).toHaveText("—");

  const failedRow=page.getByRole("row").filter({hasText:"legacy.mov"});
  await expect(failedRow).toContainText("Import failed");
  await expect(failedRow).toContainText("—");
});
