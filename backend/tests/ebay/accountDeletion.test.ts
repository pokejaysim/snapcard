import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDeletionChallengeResponse,
  verifyEbayDeletionNotification,
} from "../../src/services/ebay/accountDeletion.js";

const originalToken = process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN;
const originalEndpoint = process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT;

describe("eBay marketplace deletion notifications", () => {
  beforeEach(() => {
    process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN = "delete-token";
    process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT =
      "https://api.snapcard.ca/api/marketplace-account-deletion";
  });

  afterEach(() => {
    process.env.EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN = originalToken;
    process.env.EBAY_MARKETPLACE_DELETION_ENDPOINT = originalEndpoint;
  });

  it("builds the challenge response eBay expects", () => {
    const expected = crypto
      .createHash("sha256")
      .update("challenge-code")
      .update("delete-token")
      .update("https://api.snapcard.ca/api/marketplace-account-deletion")
      .digest("hex");

    expect(buildDeletionChallengeResponse("challenge-code")).toBe(expected);
  });

  it("rejects unsigned notification POSTs", async () => {
    await expect(
      verifyEbayDeletionNotification(undefined, Buffer.from("{}")),
    ).resolves.toBe(false);
  });

  it("rejects notifications without a raw body", async () => {
    const header = Buffer.from(
      JSON.stringify({ kid: "kid-1", signature: "signature" }),
    ).toString("base64");

    await expect(verifyEbayDeletionNotification(header, undefined)).resolves.toBe(false);
  });
});
