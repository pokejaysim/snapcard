/**
 * eBay API URL configuration — switches between sandbox and production
 * based on the EBAY_ENVIRONMENT env var (defaults to "sandbox").
 */

export interface EbayMarketplaceConfig {
  marketplaceId: string;
  siteId: string;
  country: string;
  currency: string;
  label: string;
  categoryDefault: string;
}

export const CANADA_BETA_MARKETPLACE_ID = "EBAY_CA";
export const CANADA_BETA_CURRENCY_CODE = "CAD";

export const EBAY_MARKETPLACES: Record<string, EbayMarketplaceConfig> = {
  EBAY_CA: {
    marketplaceId: "EBAY_CA",
    siteId: "2",
    country: "CA",
    currency: "CAD",
    label: "eBay Canada",
    categoryDefault: "183454",
  },
  EBAY_US: {
    marketplaceId: "EBAY_US",
    siteId: "0",
    country: "US",
    currency: "USD",
    label: "eBay US",
    categoryDefault: "183454",
  },
};

export const SUPPORTED_MARKETPLACES = Object.keys(EBAY_MARKETPLACES);

export function isCanadaBetaMarketplace(marketplaceId?: string | null): boolean {
  return (marketplaceId ?? CANADA_BETA_MARKETPLACE_ID) === CANADA_BETA_MARKETPLACE_ID;
}

export function getEbayUrls() {
  const env = process.env.EBAY_ENVIRONMENT ?? "sandbox";
  return env === "production"
    ? { apiBase: "https://api.ebay.com", authBase: "https://auth.ebay.com" }
    : { apiBase: "https://api.sandbox.ebay.com", authBase: "https://auth.sandbox.ebay.com" };
}

export function isMockMode(): boolean {
  return process.env.EBAY_MOCK_MODE === "true" || !process.env.EBAY_APP_ID;
}

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function requireEnv(name: string, errors: string[]): void {
  if (!process.env[name]) {
    errors.push(`${name} is required in production.`);
  }
}

export function validateProductionEnvironment(): void {
  const isProductionRuntime = process.env.NODE_ENV === "production";
  const isLiveEbay = process.env.EBAY_ENVIRONMENT === "production";

  if (!isProductionRuntime && !isLiveEbay) return;

  const errors: string[] = [];

  const requiredRuntimeEnv = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "FRONTEND_URL",
    "ANTHROPIC_API_KEY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const requiredLiveEbayEnv = [
    "EBAY_APP_ID",
    "EBAY_CERT_ID",
    "EBAY_DEV_ID",
    "EBAY_REDIRECT_URI",
    "OAUTH_STATE_SECRET",
    "EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN",
    "EBAY_MARKETPLACE_DELETION_ENDPOINT",
  ];

  if (isProductionRuntime) {
    requiredRuntimeEnv.forEach((name) => requireEnv(name, errors));
  }

  if (isLiveEbay) {
    requiredLiveEbayEnv.forEach((name) => requireEnv(name, errors));
  }

  if (isLiveEbay && process.env.EBAY_MOCK_MODE === "true") {
    errors.push("EBAY_MOCK_MODE must be false or unset when EBAY_ENVIRONMENT=production.");
  }

  if (
    isLiveEbay &&
    envList("EBAY_ALLOW_LIVE_PUBLISH_USER_IDS").length === 0 &&
    envList("EBAY_ALLOW_LIVE_PUBLISH_EMAILS").length === 0
  ) {
    errors.push("Production eBay controlled beta requires a live publish allowlist.");
  }

  if (errors.length > 0) {
    throw new Error(`Production configuration is unsafe:\n- ${errors.join("\n- ")}`);
  }
}

export function getEbayMarketplaceConfig(marketplaceId?: string): EbayMarketplaceConfig {
  const id = marketplaceId ?? process.env.EBAY_MARKETPLACE_ID ?? getEbayMarketplaceId();
  const config = EBAY_MARKETPLACES[id];
  if (!config) {
    throw new Error(`Unsupported eBay marketplace: ${id}. Supported: ${SUPPORTED_MARKETPLACES.join(", ")}`);
  }
  return config;
}

export function getEbayMarketplaceId(): string {
  if (process.env.EBAY_MARKETPLACE_ID) {
    return process.env.EBAY_MARKETPLACE_ID;
  }

  const siteId = process.env.EBAY_SITE_ID ?? "2";

  switch (siteId) {
    case "0":
      return "EBAY_US";
    case "2":
      return "EBAY_CA";
    case "3":
      return "EBAY_GB";
    case "15":
      return "EBAY_AU";
    default:
      return "EBAY_CA";
  }
}

export function getTradingCardCategoryId(): string {
  return process.env.EBAY_TRADING_CARD_CATEGORY_ID ?? "183454";
}

/**
 * Live publish allowlist — only these user IDs or emails can publish to production eBay.
 * Set EBAY_ALLOW_LIVE_PUBLISH_USER_IDS (comma-separated Supabase user IDs)
 * and/or EBAY_ALLOW_LIVE_PUBLISH_EMAILS (comma-separated emails).
 * If neither is set, all users are allowed (e.g. sandbox mode).
 */
export function isLivePublishAllowed(userId: string, userEmail: string): { allowed: boolean; reason?: string } {
  const env = process.env.EBAY_ENVIRONMENT ?? "sandbox";
  if (env !== "production") {
    // Sandbox: everyone can publish
    return { allowed: true };
  }

  const allowedIds = envList("EBAY_ALLOW_LIVE_PUBLISH_USER_IDS");
  const allowedEmails = envList("EBAY_ALLOW_LIVE_PUBLISH_EMAILS").map((email) =>
    email.toLowerCase(),
  );

  // If no allowlist is configured in production, block everyone
  if (allowedIds.length === 0 && allowedEmails.length === 0) {
    return {
      allowed: false,
      reason: "Live eBay publishing is not yet available. SnapCard is in controlled beta testing.",
    };
  }

  if (allowedIds.includes(userId) || allowedEmails.includes(userEmail.toLowerCase())) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Live eBay publishing is not yet available for your account. SnapCard is in controlled beta testing.",
  };
}
