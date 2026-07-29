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


test("encrypts a small archive before staging and queues it for Arweave", async ({ page }) => {
  await page.route("**/api/account", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({account:{...user,plan:"starter",emailVerifiedAt:new Date().toISOString()},sessions:[],providers:[]}) }));
  await page.route("**/api/arweave/archive/jobs", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({configured:false,jobs:[]}) }));
  let stagedBytes=0; let authorization:any=null;
  await page.route("**/api/arweave/archive/presign", async route => { authorization=route.request().postDataJSON(); await route.fulfill({contentType:"application/json",body:JSON.stringify({jobId:"archive-1",uploadUrl:"http://127.0.0.1:4173/staging-upload"})}); });
  await page.route("**/staging-upload", async route => { stagedBytes=route.request().postDataBuffer()?.byteLength||0; await route.fulfill({status:200,body:""}); });
  await page.route("**/api/arweave/archive/complete", route => route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,jobId:"archive-1"})}));
  await page.goto("/#account");
  await page.locator("input[type=file]").setInputFiles({name:"proof.txt",mimeType:"text/plain",buffer:Buffer.from("private family archive proof")});
  await page.getByPlaceholder(/Archival passphrase/).fill("correct horse archive");
  await page.getByRole("button",{name:/Encrypt and queue test archive/i}).click();
  await expect(page.getByText(/Encrypted archive queued/i)).toBeVisible();
  expect(authorization.payloadHash).toHaveLength(64);
  expect([...authorization.payloadHash].every((character:string) => "abcdef0123456789".includes(character))).toBe(true);
  expect(authorization.encryptionMetadata.algorithm).toBe("AES-256-GCM");
  expect(stagedBytes).toBeGreaterThan(Buffer.byteLength("private family archive proof"));
});
