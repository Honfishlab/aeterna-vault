import { expect, test } from "@playwright/test";
import { buildArweaveCollectionHtml } from "../../server/arweaveCollection";

const user = { id:"user-1",name:"Vault Owner",email:"owner@example.com",role:"Vault Owner",authMethod:"Email & Passcode",signedInAt:new Date().toISOString(),securityLevel:"Quantum-Proof AES-GCM" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({user}) }));
  await page.route("**/api/vault/data", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({data:{memories:[],letters:[],memorials:[],heirs:[]},revision:1}) }));
  await page.route("**/api/notifications", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({notifications:[],unread:0}) }));
});

test("moves legacy destinations into a left rail on narrower desktop screens", async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/#storage");
  await expect(page.locator("#side-nav-memorials")).toBeVisible();
  await expect(page.locator("#side-nav-legacy")).toBeVisible();
  await expect(page.locator("#side-nav-locker")).toBeVisible();
  const railBox=await page.getByRole("navigation",{name:"Legacy sections"}).boundingBox();
  expect(railBox?.y).toBeGreaterThan(250);
  expect(railBox?.y).toBeLessThan(450);
  await expect(page.locator("#nav-link-memorials")).toBeHidden();
  await page.setViewportSize({width:1800,height:900});
  await expect(page.locator("#side-nav-memorials")).toBeHidden();
  await expect(page.locator("#nav-link-memorials")).toBeVisible();
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
  await page.route("**/api/arweave/passphrases", route => route.fulfill({contentType:"application/json",body:JSON.stringify({records:[]})}));
  await page.route("**/api/arweave/archive/jobs", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({configured:false,jobs:[]}) }));
  await page.route("**/api/arweave/albums", route => route.fulfill({contentType:"application/json",body:JSON.stringify({configured:true,albums:[{albumName:"Family Album",itemCount:1,totalBytes:2048,confirmedCount:1,pendingCount:0,failedCount:0,eligibleCount:0,ineligibleCount:0,items:[{memoryId:"memory-1",mediaId:"media-1",name:"family.jpg",contentType:"image/jpeg",sizeBytes:2048,mediaStatus:"ready",archiveStatus:"confirmed",transactionId:job.transactionId}]}]})}));
  await page.route("**/api/arweave/archive/price?**", route => route.fulfill({contentType:"application/json",body:JSON.stringify({ar:"0.00001",winston:"10000000"})}));
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


test("viewer shows database archive state and never invents a transaction", async ({ page }) => {
  const memory={id:"memory-1",mediaId:"media-1",title:"R2 only proof",category:"Family",date:"Aug 18, 2024",imageUrl:"https://example.com/photo.jpg",description:"Private original",encryptionLevel:"Level 5 Protected",tags:[],archiveStatus:"r2_only"};
  await page.route("**/api/vault/data", route => route.fulfill({contentType:"application/json",body:JSON.stringify({data:{memories:[memory],letters:[],memorials:[],heirs:[]},revision:1})}));
  await page.route("**/api/media/status?ids=media-1", route => route.fulfill({contentType:"application/json",body:JSON.stringify({media:[{id:"media-1",archiveStatus:"r2_only",permawebTxId:null}]})}));
  await page.goto("/#search");
  await page.getByText("R2 only proof",{exact:true}).first().click();
  await page.getByTitle("Toggle Details Info Sidebar").click();
  await expect(page.getByText("No Arweave transaction exists for this file.",{exact:false})).toBeVisible();
  await expect(page.getByRole("link",{name:/Open submitted transaction/i})).toHaveCount(0);
  await expect(page.getByText(/ar_9xK2mP1a8f331/i)).toHaveCount(0);
});


test("Immortal Gateway uses verified archive jobs and gates controls", async ({ page }) => {
  const job={id:"archive-real-1",mediaId:"media-1",name:"family.jpg",sizeBytes:2048,payloadHash:"a".repeat(64),encryptionMetadata:{algorithm:"AES-256-GCM"},contentType:"image/jpeg",status:"confirmed",transactionId:"2V4PelWO5vYz1uKKfirpnQyGajppmHzXQ6acot42u18",blockHeight:1968802,confirmations:8,createdAt:new Date().toISOString()};
  let published=false;
  await page.route("**/api/arweave/archive/jobs", route => route.fulfill({contentType:"application/json",body:JSON.stringify({configured:true,jobs:[job]})}));
  await page.route("**/api/arweave/albums", route => route.fulfill({contentType:"application/json",body:JSON.stringify({configured:true,albums:[{albumName:"Family Album",itemCount:1,totalBytes:2048,confirmedCount:1,pendingCount:0,failedCount:0,eligibleCount:0,ineligibleCount:0,items:[{memoryId:"memory-1",mediaId:"media-1",name:"family.jpg",contentType:"image/jpeg",sizeBytes:2048,mediaStatus:"ready",archiveStatus:"confirmed",transactionId:job.transactionId}]}]})}));
  await page.route("**/api/arweave/archive/price?**", route => route.fulfill({contentType:"application/json",body:JSON.stringify({ar:"0.00001",winston:"10000000"})}));
  await page.route("**/api/arweave/collection", route => route.fulfill({contentType:"application/json",body:JSON.stringify({configured:true,viewers:[{id:"viewer-all",title:"All Permanent Archives",albumName:null,transactionId:"allViewerTx",itemCount:0,status:"confirmed",submittedAt:new Date().toISOString()},...(published?[{id:"viewer-1",title:"Family Forever",albumName:"Family Album",transactionId:"viewerTx123",itemCount:1,status:"submitted",submittedAt:new Date().toISOString()}]:[])]})}));
  await page.route("**/api/arweave/collection/publish", async route => { expect(route.request().postDataJSON()).toMatchObject({acknowledgePermanent:true,albumName:"Family Album"}); published=true; await route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,transactionId:"viewerTx123"})}); });
  await page.route("**/api/arweave/archive/verify/archive-real-1", route => route.fulfill({contentType:"application/json",body:JSON.stringify({verified:true,hash:job.payloadHash,size:2048,gateways:[{gateway:"https://arweave.net",verified:true,status:200,hash:job.payloadHash,size:2048},{gateway:"https://secondary.example",verified:true,status:200,hash:job.payloadHash,size:2048}]})}));
  await page.goto("/#search");
  await page.getByRole("button",{name:"Immortal Gateway"}).click();
  await expect(page.getByRole("heading",{name:"Immortal Arweave Archive"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Archival Passphrase Recovery Vault"})).toBeVisible();
  await expect(page.getByRole("link",{name:/Open Independent Viewer/i})).toHaveAttribute("href","https://arweave.net/allViewerTx");
  await expect(page.getByRole("button",{name:/Publish Updated Viewer/i})).toBeVisible();
  await expect(page.getByText(/published viewer contains 0 of 1 confirmed archives/i)).toBeVisible();
  await expect(page.getByLabel("Vault album")).toHaveValue("Family Album");
  await expect(page.getByText("1 of 1 items permanently confirmed",{exact:false})).toBeVisible();
  await expect(page.getByText(job.transactionId,{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:/Verify, decrypt and download/i})).toBeDisabled();
  await page.getByRole("button",{name:/Verify gateways/i}).click();
  await expect(page.getByText("Ciphertext independently verified.")).toBeVisible();
  await expect(page.getByRole("button",{name:/Verify, decrypt and download/i})).toBeEnabled();
  await expect(page.getByRole("link",{name:/Open gateway/i})).toHaveAttribute("href","https://arweave.net/"+job.transactionId);
  await page.getByLabel(/I understand the collection title/i).check();
  await page.getByPlaceholder("Permanent collection title").fill("Family Forever");
  await page.getByRole("button",{name:/Publish album viewer to Arweave/i}).click();
  await expect(page.getByText("Family Forever",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:/Family Forever/i})).toHaveCount(0);
  await expect(page.getByText(/SmartWeave|Blockweave Height|verified decentralized suite/i)).toHaveCount(0);
});


test("standalone collection page references Arweave and never R2", () => {
  const html=buildArweaveCollectionHtml({title:"Family Forever",createdAt:"2026-07-29T00:00:00.000Z",archives:[{id:"job-1",name:"family.jpg",transactionId:"realTx123",payloadHash:"a".repeat(64),contentType:"image/jpeg",sizeBytes:2048,encryptionMetadata:{algorithm:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:310000,iv:"aXY=",salt:"c2FsdA=="}}]});
  expect(html).toContain("https://arweave.net/");
  expect(html).toContain("realTx123");
  expect(html).toContain("PBKDF2");
  expect(html).not.toContain("/api/media/");
  expect(html).not.toContain("r2.cloudflarestorage.com");
});
