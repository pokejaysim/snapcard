import crypto from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  userId: string;
  nonce: string;
  exp: number;
}

function getStateSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("OAUTH_STATE_SECRET is required in production.");
  }

  return "snapcard-local-oauth-state-secret";
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getStateSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateOAuthState(userId: string, now = Date.now()): string {
  const payload: OAuthStatePayload = {
    userId,
    nonce: crypto.randomBytes(16).toString("base64url"),
    exp: now + STATE_TTL_MS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyOAuthState(
  state: string | undefined,
  expectedUserId: string,
  now = Date.now(),
): boolean {
  if (!state) return false;

  const [encodedPayload, signature, extra] = state.split(".");
  if (!encodedPayload || !signature || extra !== undefined) return false;

  if (!safeEqual(signature, signPayload(encodedPayload))) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as
      Partial<OAuthStatePayload>;

    return (
      payload.userId === expectedUserId &&
      typeof payload.exp === "number" &&
      payload.exp > now
    );
  } catch {
    return false;
  }
}
