import { supabase } from "../../lib/supabase.js";
import { getEbayUrls } from "./config.js";

/**
 * Returns a valid eBay access token for the given user.
 * If the stored token expires within 5 minutes, refreshes it first.
 */
export async function getValidEbayToken(userId: string): Promise<string> {
  const { data: account, error } = await supabase
    .from("ebay_accounts")
    .select("ebay_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !account) {
    throw new Error(`No eBay account found for user ${userId}`);
  }

  const expiresAt = new Date(account.token_expires_at).getTime();
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

  // Token still valid for more than 5 minutes
  if (expiresAt > fiveMinutesFromNow) {
    return account.ebay_token as string;
  }

  // Token expired or about to expire — refresh it
  if (!account.refresh_token) {
    throw new Error(`No refresh token available for user ${userId}`);
  }

  const { apiBase } = getEbayUrls();
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    throw new Error("eBay OAuth not configured (EBAY_APP_ID / EBAY_CERT_ID missing)");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const tokenRes = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: account.refresh_token as string,
      scope: [
        "https://api.ebay.com/oauth/api_scope",
        "https://api.ebay.com/oauth/api_scope/sell.inventory",
        "https://api.ebay.com/oauth/api_scope/sell.account",
        "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
      ].join(" "),
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    console.error(`[eBay] Token refresh failed (${tokenRes.status}):`, errorBody.substring(0, 200));

    // Detect invalid/expired refresh token — user needs to reconnect
    if (tokenRes.status === 400 || tokenRes.status === 401) {
      throw Object.assign(
        new Error("eBay connection expired. Please reconnect your eBay account."),
        { code: "EBAY_RECONNECT_REQUIRED" },
      );
    }

    throw new Error(`eBay token refresh failed: ${errorBody.substring(0, 200)}`);
  }

  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const updateData: Record<string, unknown> = {
    ebay_token: tokenData.access_token,
    token_expires_at: newExpiresAt,
    refreshed_at: new Date().toISOString(),
  };

  if (tokenData.refresh_token) {
    updateData.refresh_token = tokenData.refresh_token;
  }

  const { error: updateErr } = await supabase
    .from("ebay_accounts")
    .update(updateData)
    .eq("user_id", userId);

  if (updateErr) {
    console.error("Failed to update refreshed eBay token:", updateErr);
    // Still return the fresh token — DB update is non-critical
  }

  return tokenData.access_token;
}