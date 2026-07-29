import { expect, test } from "@playwright/test";

const user = { id:"user-1",name:"Vault Owner",email:"owner@example.com",role:"Vault Owner",authMethod:"Email & Passcode",signedInAt:new Date().toISOString(),securityLevel:"Quantum-Proof AES-GCM" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({user}) }));
  await page.route("**/api/vault/data", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({data:{memories:[],letters:[],memorials:[],heirs:[]},revision:1}) }));
  await page.route("**/api/notifications", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({notifications:[],unread:0}) }));
});

test("shows quota warning and storage plan usage", async ({ page }) => {
  await page.route("**/api/media/storage-summary", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({
    totals:{activeBytes:4_900_000_000,trashBytes:0,imageCount:10,videoCount:2},albums:[],plan:"starter",quotaBytes:5_368_709_120,estimatedMonthlyStorageUsd:0.07,
  }) }));
  await page.goto("/#storage");
  await expect(page.getByRole("heading",{name:"Storage Management"})).toBeVisible();
  await expect(page.getByText(/approaching its storage limit/i)).toBeVisible();
});

test("account management exposes sessions providers export and recovery", async ({ page }) => {
  await page.route("**/api/account", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({
    account:{...user,plan:"starter",quotaBytes:5_368_709_120,emailVerifiedAt:null},
    sessions:[{id:7,userAgent:"Chromium test device",lastSeenAt:new Date().toISOString(),ipAddress:"127.0.0.1"}],
    providers:[{provider:"google-drive",email:"owner@example.com"}],
  }) }));
  await page.goto("/#account");
  await expect(page.getByRole("heading",{name:"Account Management"})).toBeVisible();
  await expect(page.getByText("Chromium test device")).toBeVisible();
  await expect(page.getByText("google-drive")).toBeVisible();
  await expect(page.getByRole("button",{name:/Download account export/i})).toBeVisible();
  await expect(page.getByRole("button",{name:/Send verification email/i})).toBeVisible();
});

test("persistent notifications appear and can be dismissed", async ({ page }) => {
  await page.route("**/api/notifications", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({notifications:[{id:"notice-1",type:"warning",title:"Storage nearly full",message:"Your vault is at 90%.",createdAt:new Date().toISOString(),readAt:null}],unread:1}) }));
  await page.route("**/api/notifications/read", route => route.fulfill({ contentType:"application/json",body:"{}" }));
  await page.goto("/#storage");
  await expect(page.getByText("Storage nearly full")).toBeVisible();
  await page.getByTitle("Dismiss notification").click();
  await expect(page.getByText("Storage nearly full")).not.toBeVisible();
});
