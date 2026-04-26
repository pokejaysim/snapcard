import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../../src/services/ebay/config.js";

const REQUIRED_ENV = [
  "NODE_ENV",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FRONTEND_URL",
  "ANTHROPIC_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "EBAY_APP_ID",
  "EBAY_CERT_ID",
  "EBAY_DEV_ID",
  "EBAY_REDIRECT_URI",
  "EBAY_ENVIRONMENT",
  "EBAY_MOCK_MODE",
  "OAUTH_STATE_SECRET",
  "EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN",
  "EBAY_MARKETPLACE_DELETION_ENDPOINT",
  "EBAY_ALLOW_LIVE_PUBLISH_EMAILS",
  "EBAY_ALLOW_LIVE_PUBLISH_USER_IDS",
] as const;

const originalEnv = new Map<string, string | undefined>();

describe("production environment guard", () => {
  beforeEach(() => {
    for (const key of REQUIRED_ENV) {
      originalEnv.set(key, process.env[key]);
    }

    process.env.NODE_ENV = "production";
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    process.env.FRONTEND_URL = "https://snapcard.ca";
    process.env.ANTHROPIC_API_KEY = "anthropic";
    process.env.CLOUDINARY_CLOUD_NAME = "cloud";
    process.env.CLOUDINARY_API_KEY = "cloud-key";
    process.env.CLOUDINARY_API_SECRET = "cloud-secret";
    process.env.EBAY_APP_ID = "app";
    process.env.EBAY_CERT_ID = "cert";
    process.env.EBAY_DEV_ID = "dev";
    process.env.EBAY_REDIRECT_URI = "runame";
    process.env.EBAY_ENVIRONMENT = "production";
    process.env.EBAY_MOCK_MODE = "false";
    process.env.OAUTH_STATE_SECRET = "state-secret";
    process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN = "deletion-token";
    process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT =
      "https://api.snapcard.ca/api/marketplace-account-deletion";
    process.env.EBAY_ALLOW_LIVE_PUBLISH_EMAILS = "beta@snapcard.ca";
    process.env.EBAY_ALLOW_LIVE_PUBLISH_USER_IDS = "";
  });

  afterEach(() => {
    for (const key of REQUIRED_ENV) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    originalEnv.clear();
  });

  it("allows a configured production environment", () => {
    expect(() => validateProductionEnvironment()).not.toThrow();
  });

  it("fails production startup when mock mode is enabled", () => {
    process.env.EBAY_MOCK_MODE = "true";
    expect(() => validateProductionEnvironment()).toThrow(/EBAY_MOCK_MODE/);
  });

  it("fails production startup when the live publish allowlist is empty", () => {
    process.env.EBAY_ALLOW_LIVE_PUBLISH_EMAILS = "";
    process.env.EBAY_ALLOW_LIVE_PUBLISH_USER_IDS = "";
    expect(() => validateProductionEnvironment()).toThrow(/allowlist/);
  });

  it("does not require live eBay webhook secrets for a production sandbox deployment", () => {
    process.env.EBAY_ENVIRONMENT = "sandbox";
    delete process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN;
    delete process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT;
    delete process.env.OAUTH_STATE_SECRET;

    expect(() => validateProductionEnvironment()).not.toThrow();
  });
});
