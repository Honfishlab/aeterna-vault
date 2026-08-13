import { expect, test } from '@playwright/test';

test('signup uses labelled owner-only fields and hides prototype login methods', async ({ page }) => {
  await page.goto('/');
  await page.locator('#landing-create-vault').click();
  await expect(page.getByRole('heading',{name:'Create your family vault'})).toBeVisible();
  await expect(page.getByLabel('Your name')).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByText(/You will be the vault owner/i)).toBeVisible();
  await expect(page.getByText('JWK File',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Heir Access',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Web3',{exact:true})).toHaveCount(0);
});

test('dashboard cards are keyboard-accessible actions with familiar labels', async ({ page }) => {
  const user={id:'demo',name:'Demo Owner',email:'demo@example.com',role:'Vault Owner',authMethod:'Email & Passcode',signedInAt:new Date().toISOString(),securityLevel:'Quantum-Proof AES-GCM'};
  await page.route('**/api/auth/me',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({user})}));
  await page.route('**/api/vault/data',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:{memories:[],letters:[],memorials:[],heirs:[]}})}));
  await page.route('**/api/notifications',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({notifications:[],unread:0})}));
  await page.goto('/#dashboard');
  await expect(page.getByRole('heading',{name:'Your Vault'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Memories Photos, videos/i})).toBeVisible();
  await expect(page.getByRole('button',{name:/Family Access Invite trusted people/i})).toBeVisible();
  await expect(page.getByText(/Permanent archive status is shown only when it can be verified/i)).toBeVisible();
});

test('memories separates albums from tag filters', async ({ page }) => {
  await page.goto('/#search');
  await expect(page.getByRole('tab', { name: /All memories/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Albums/ })).toBeVisible();
  await expect(page.getByText('Filter memories by tag')).toBeVisible();

  await page.getByRole('tab', { name: /Albums/ }).click();
  await expect(page.getByRole('heading', { name: 'Albums', exact: true })).toBeVisible();
  await expect(page.getByText('Filter memories by tag')).toHaveCount(0);
  await expect(page.getByText(/Tags narrow the memory list/)).toHaveCount(0);
});
