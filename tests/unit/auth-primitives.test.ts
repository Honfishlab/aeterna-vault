import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, normalizeEmail, sha256, validEmail, validPassword, verifyPassword } from "../../server/authPrimitives.ts";

test("password hashes are salted and verify only the original password", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("incorrect password", first), false);
});

test("malformed password hashes fail closed", async () => {
  assert.equal(await verifyPassword("anything", "not-a-hash"), false);
  assert.equal(await verifyPassword("anything", "1000001$c2FsdA$hash"), false);
  assert.equal(await verifyPassword("anything", "210000$%%%$hash"), false);
});

test("email and password policy handles boundaries", () => {
  assert.equal(normalizeEmail("  Owner@Example.COM "), "owner@example.com");
  assert.equal(validEmail("owner@example.com"), true);
  assert.equal(validEmail("owner @example.com"), false);
  assert.equal(validPassword("twelve-chars"), true);
  assert.equal(validPassword("too-short"), false);
  assert.equal(validPassword("x".repeat(201)), false);
});

test("token hashes are deterministic, URL-safe, and do not expose the token", async () => {
  const token = "private reset token";
  const first = await sha256(token);
  assert.equal(first, await sha256(token));
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(first.includes(token), false);
});
