import { expect, test } from "@playwright/test";
import { buildArweaveCollectionHtml } from "../../server/arweaveCollection";
import { decryptArchiveCipher } from "../../src/lib/permanentArchive";

const user = { id:"user-1",name:"Vault Owner",email:"owner@example.com",role:"Vault Owner",authMethod:"Email & Passcode",signedInAt:new Date().toISOString(),securityLevel:"Quantum-Proof AES-GCM" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({user}) }));
  await page.route("**/api/vault/data", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({data:{memories:[],letters:[],memorials:[],heirs:[]},revision:1}) }));
  await page.route("**/api/notifications", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({notifications:[],unread:0}) }));
});

test("keeps legacy, vault, and administrative destinations in the desktop left rail", async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/#storage");
  await expect(page.locator("#side-nav-memorials")).toBeVisible();
  await expect(page.locator("#side-nav-legacy")).toBeVisible();
  await expect(page.locator("#side-nav-locker")).toBeVisible();
  await expect(page.locator("#vault-nav-imports")).toBeVisible();
  await expect(page.locator("#vault-nav-storage")).toBeVisible();
  await expect(page.locator("#vault-nav-account")).toBeVisible();
  await expect(page.locator("#vault-nav-wallet")).toBeVisible();
  await expect(page.locator("#admin-nav-pricing")).toBeVisible();
  await expect(page.locator("#admin-nav-recycle")).toBeVisible();
  await expect(page.getByRole("navigation",{name:"Vault sections"})).toBeVisible();
  await expect(page.locator("#nav-link-memorials")).toBeHidden();
  await expect(page.locator("#nav-link-imports")).toBeHidden();
  await expect(page.locator("#nav-link-storage")).toBeHidden();
  await expect(page.locator("#nav-link-account")).toBeHidden();
  await expect(page.locator("#nav-link-pricing")).toBeHidden();
  await expect(page.locator("#nav-link-recycle")).toBeHidden();
  await expect(page.locator("#btn-wallet-connect")).toBeHidden();
  await page.setViewportSize({width:1800,height:900});
  await expect(page.locator("#side-nav-memorials")).toBeVisible();
  await expect(page.locator("#nav-link-memorials")).toBeHidden();
  await expect(page.locator("#nav-link-dashboard")).toContainText("Dashboard");
});

test("does not overwrite the server vault before hydration completes", async ({ page }) => {
  const syncBodies:any[]=[];
  const memory={id:"preserved-1",title:"Preserved server memory",category:"Family",date:"2026-08-01",description:"Must survive a slow reload.",encryptionLevel:"Level 5 Protected",tags:["preserved"]};
  await page.route("**/api/vault/data", async route => { await new Promise(resolve => setTimeout(resolve,1500)); await route.fulfill({contentType:"application/json",body:JSON.stringify({data:{memories:[memory],letters:[],memorials:[],heirs:[]},revision:8})}); });
  await page.route("**/api/vault/sync", async route => { syncBodies.push(route.request().postDataJSON()); await route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,revision:9})}); });
  await page.goto("/#search");
  await page.waitForTimeout(1200);
  expect(syncBodies).toHaveLength(0);
  await expect(page.getByText("Preserved server memory")).toBeVisible({timeout:5000});
  await page.waitForTimeout(1200);
  expect(syncBodies.length).toBeGreaterThan(0);
  expect(syncBodies.every(body => body.memories?.some((item:any) => item.id === "preserved-1"))).toBe(true);
});

test("shows real Arweave archive metrics on the dashboard", async ({ page }) => {
  await page.route("**/api/media/storage-summary", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({
    totals:{activeBytes:9000000,trashBytes:0,imageCount:2,videoCount:1},
    albums:[],
    arweave:{jobCount:5,confirmed:3,pending:1,failed:1,confirmedBytes:7340032,pendingBytes:2097152,categories:[{type:"photo",count:2,bytes:4194304},{type:"video",count:1,bytes:3145728}]}
  }) }));
  await page.goto("/#storage");
  await page.locator("#nav-link-dashboard").click();
  await expect(page.getByRole("heading",{name:"Arweave Permaweb Storage Dashboard"})).toBeVisible();
  await expect(page.getByText("7 MB",{exact:true}).first()).toBeVisible();
  await expect(page.getByText("(3 transactions)",{exact:true})).toBeVisible();
  await expect(page.getByText("Archive Failures").locator("..")).toContainText("1");
  await expect(page.getByText("Photos & Visuals",{exact:true})).toBeVisible();
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


test("successful import notices auto-dismiss and cap the visible stack", async ({ page }) => {
  const notices = Array.from({length:6}, (_,index) => ({id:"success-" + index,type:"success",title:"Import complete",message:"file-" + index + ".jpg is ready in your vault.",createdAt:new Date().toISOString(),readAt:null}));
  await page.route("**/api/notifications", route => route.fulfill({contentType:"application/json",body:JSON.stringify({notifications:notices,unread:notices.length})}));
  await page.route("**/api/notifications/read", route => route.fulfill({contentType:"application/json",body:"{}"}));
  await page.goto("/#storage");
  await expect(page.getByText("Import complete")).toHaveCount(4);
  await expect(page.getByText("2 hidden")).toBeVisible();
  await expect(page.getByText("Import complete")).toHaveCount(0,{timeout:8000});
});

test("encrypts a small archive before staging and queues it for Arweave", async ({ page }) => {
  await page.route("**/api/account", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({account:{...user,plan:"starter",emailVerifiedAt:new Date().toISOString()},sessions:[],providers:[]}) }));
  await page.route("**/api/arweave/passphrases", route => route.fulfill({contentType:"application/json",body:JSON.stringify({records:[]})}));
  await page.route("**/api/arweave/archive/jobs", route => route.fulfill({ contentType:"application/json",body:JSON.stringify({configured:false,jobs:[]}) }));
  await page.route("**/api/arweave/albums", route => route.fulfill({contentType:"application/json",body:JSON.stringify({configured:true,albums:[{albumName:"Family Album",itemCount:1,totalBytes:2048,confirmedCount:1,pendingCount:0,failedCount:0,eligibleCount:0,ineligibleCount:0,items:[{memoryId:"memory-1",mediaId:"media-1",name:"family.jpg",contentType:"image/jpeg",sizeBytes:2048,mediaStatus:"ready",archiveStatus:"confirmed",transactionId:job.transactionId}]}]})}));
  await page.route("**/api/arweave/archive/price?**", route => route.fulfill({contentType:"application/json",body:JSON.stringify({ar:"0.00001",winston:"10000000"})}));
  let stagedBytes=0; let stagedPayload=Buffer.alloc(0); let authorization:any=null;
  await page.route("**/api/arweave/archive/presign", async route => { authorization=route.request().postDataJSON(); await route.fulfill({contentType:"application/json",body:JSON.stringify({jobId:"archive-1",uploadUrl:"http://127.0.0.1:4173/staging-upload"})}); });
  await page.route("**/staging-upload", async route => { stagedPayload=route.request().postDataBuffer()||Buffer.alloc(0); stagedBytes=stagedPayload.byteLength; await route.fulfill({status:200,body:""}); });
  await page.route("**/api/arweave/archive/complete", route => route.fulfill({contentType:"application/json",body:JSON.stringify({success:true,jobId:"archive-1"})}));
  await page.goto("/#account");
  await page.locator("input[type=file]").setInputFiles({name:"proof.txt",mimeType:"text/plain",buffer:Buffer.from("private family archive proof")});
  await page.getByPlaceholder(/Archival passphrase/).fill("correct horse archive");
  await page.getByRole("button",{name:/Encrypt and queue test archive/i}).click();
  await expect(page.getByText(/Encrypted archive queued/i)).toBeVisible();
  expect(authorization.payloadHash).toHaveLength(64);
  expect([...authorization.payloadHash].every((character:string) => "abcdef0123456789".includes(character))).toBe(true);
  expect(authorization.encryptionMetadata.algorithm).toBe("AES-256-GCM");
  expect(authorization.encryptionMetadata.keyManagement).toBe("envelope-v1");
  expect(authorization.encryptionMetadata.keyWrap.ciphertext.length).toBeGreaterThan(40);
  expect(stagedBytes).toBeGreaterThan(Buffer.byteLength("private family archive proof"));
  const decrypted=await decryptArchiveCipher(new Uint8Array(stagedPayload).buffer,authorization.encryptionMetadata,"correct horse archive");
  expect(new TextDecoder().decode(decrypted)).toBe("private family archive proof");
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
  await expect(page.getByRole("heading",{name:"Permanent Vault Master Security"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Archival Passphrase Recovery Vault"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Unify legacy archive security"})).toBeVisible();
  await expect(page.getByRole("link",{name:/Open Independent Viewer/i})).toHaveAttribute("href","https://arweave.net/allViewerTx");
  await expect(page.getByRole("button",{name:/Publish Updated Viewer/i})).toBeVisible();
  await expect(page.getByText(/published viewer uses the older format/i)).toBeVisible();
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


test("standalone collection page references Arweave and never R2", async ({ page }) => {
  const html=buildArweaveCollectionHtml({title:"Family Forever",createdAt:"2026-07-29T00:00:00.000Z",archives:[{id:"job-1",name:"family.jpg",albumName:"Family Album",transactionId:"realTx123",payloadHash:"a".repeat(64),contentType:"image/jpeg",sizeBytes:2048,encryptionMetadata:{algorithm:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:310000,iv:"aXY=",salt:"c2FsdA=="}}]});
  expect(html).toContain("https://arweave.net/");
  expect(html).toContain("realTx123");
  expect(html).toContain("PBKDF2");
  expect(html).toContain("envelope-v1");
  expect(html).toContain("Collection archival passphrase");
  expect(html).toContain("Verify & decrypt all");
  expect(html).toContain("Full-size image");
  expect(html).toContain("Family Album");
  expect(html).not.toContain("/api/media/");
  expect(html).not.toContain("r2.cloudflarestorage.com");
  await page.setContent(html);
  await expect(page.getByRole("heading",{name:"Family Album"})).toBeVisible();
  await expect(page.getByPlaceholder("Collection archival passphrase")).toHaveCount(1);
  await expect(page.getByRole("button",{name:"Verify & decrypt all"})).toBeVisible();
});
