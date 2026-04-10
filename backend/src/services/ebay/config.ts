/**
 * eBay API URL configuration — switches between sandbox and production
 * based on the EBAY_ENVIRONMENT env var (defaults to "sandbox").
 */
export function getEbayUrls() {
  const env = process.env.EBAY_ENVIRONMENT ?? "sandbox";
  return env === "production"
    ? { apiBase: "https://api.ebay.com", authBase: "https://auth.ebay.com" }
    : { apiBase: "https://api.sandbox.ebay.com", authBase: "https://auth.sandbox.ebay.com" };
}

export function isMockMode(): boolean {
  return process.env.EBAY_MOCK_MODE === "true" || !process.env.EBAY_APP_ID;
}