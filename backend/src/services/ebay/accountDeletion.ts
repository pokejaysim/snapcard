import crypto from "node:crypto";
import { getEbayUrls } from "./config.js";
import { getAppAccessToken } from "./metadata.js";

interface EbaySignatureHeader {
  alg?: string;
  kid?: string;
  signature?: string;
  digest?: string;
}

interface EbayPublicKeyResponse {
  key?: string;
  publicKey?: string;
}

interface CachedPublicKey {
  expiresAt: number;
  key: string;
}

const PUBLIC_KEY_TTL_MS = 60 * 60 * 1000;
const publicKeyCache = new Map<string, CachedPublicKey>();

function requireDeletionEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for eBay marketplace deletion notifications.`);
  }
  return value;
}

export function buildDeletionChallengeResponse(challengeCode: string): string {
  const verificationToken = requireDeletionEnv("EBAY_MARKETPLACE_DELETION_VERIFICATION_TOKEN");
  const endpoint = requireDeletionEnv("EBAY_MARKETPLACE_DELETION_ENDPOINT");

  return crypto
    .createHash("sha256")
    .update(challengeCode)
    .update(verificationToken)
    .update(endpoint)
    .digest("hex");
}

function decodeSignatureHeader(signatureHeader: string | undefined): EbaySignatureHeader | null {
  if (!signatureHeader) return null;

  try {
    const decoded = Buffer.from(signatureHeader, "base64").toString("utf8");
    return JSON.parse(decoded) as EbaySignatureHeader;
  } catch {
    return null;
  }
}

function normalizePublicKey(publicKey: string): crypto.KeyObject {
  if (publicKey.includes("BEGIN PUBLIC KEY")) {
    return crypto.createPublicKey(publicKey);
  }

  return crypto.createPublicKey({
    key: Buffer.from(publicKey, "base64"),
    format: "der",
    type: "spki",
  });
}

async function getNotificationPublicKey(kid: string): Promise<string> {
  const cached = publicKeyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const token = await getAppAccessToken();
  const { apiBase } = getEbayUrls();
  const response = await fetch(
    `${apiBase}/commerce/notification/v1/public_key/${encodeURIComponent(kid)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch eBay notification public key: ${errorText}`);
  }

  const data = (await response.json()) as EbayPublicKeyResponse;
  const publicKey = data.key ?? data.publicKey;
  if (!publicKey) {
    throw new Error("eBay notification public key response did not include a key.");
  }

  publicKeyCache.set(kid, {
    key: publicKey,
    expiresAt: Date.now() + PUBLIC_KEY_TTL_MS,
  });

  return publicKey;
}

export async function verifyEbayDeletionNotification(
  signatureHeader: string | undefined,
  rawBody: Buffer | undefined,
): Promise<boolean> {
  if (!rawBody) return false;

  const decodedHeader = decodeSignatureHeader(signatureHeader);
  if (!decodedHeader?.kid || !decodedHeader.signature) {
    return false;
  }

  try {
    const publicKey = normalizePublicKey(await getNotificationPublicKey(decodedHeader.kid));
    const verifier = crypto.createVerify("sha1");
    verifier.update(rawBody);
    verifier.end();
    return verifier.verify(publicKey, Buffer.from(decodedHeader.signature, "base64"));
  } catch (error) {
    console.error("[eBay] Marketplace deletion signature verification failed:", error);
    return false;
  }
}
