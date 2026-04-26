import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateOAuthState,
  verifyOAuthState,
} from "../../src/services/security/oauthState.js";

const originalSecret = process.env.OAUTH_STATE_SECRET;

describe("OAuth state tokens", () => {
  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = "test-oauth-state-secret";
  });

  afterEach(() => {
    process.env.OAUTH_STATE_SECRET = originalSecret;
  });

  it("verifies a generated state for the same user", () => {
    const state = generateOAuthState("user-1", 1_000);
    expect(verifyOAuthState(state, "user-1", 1_001)).toBe(true);
  });

  it("rejects states for a different user", () => {
    const state = generateOAuthState("user-1", 1_000);
    expect(verifyOAuthState(state, "user-2", 1_001)).toBe(false);
  });

  it("rejects expired states", () => {
    const state = generateOAuthState("user-1", 1_000);
    expect(verifyOAuthState(state, "user-1", 11 * 60 * 1000 + 1_001)).toBe(false);
  });

  it("rejects tampered states", () => {
    const state = generateOAuthState("user-1", 1_000);
    expect(verifyOAuthState(`${state}tampered`, "user-1", 1_001)).toBe(false);
  });
});
