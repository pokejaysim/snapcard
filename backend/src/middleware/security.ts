import type { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import sharp from "sharp";
import type { AuthenticatedRequest } from "./auth.js";

const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function rateLimitResponse(_req: Request, res: Response): void {
  res.status(429).json({
    error: "Too many requests. Please wait a moment and try again.",
    code: "RATE_LIMITED",
  });
}

function ipKey(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown")}`;
}

function userOrIpKey(req: Request): string {
  const authReq = req as Partial<AuthenticatedRequest>;
  return authReq.userId ? `user:${authReq.userId}` : ipKey(req);
}

export const authRateLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  handler: rateLimitResponse,
});

export const uploadRateLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitResponse,
});

export const aiIdentifyMinuteLimiter = rateLimit({
  windowMs: ONE_MINUTE_MS,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitResponse,
});

export const aiIdentifyDailyLimiter = rateLimit({
  windowMs: ONE_DAY_MS,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitResponse,
});

export const pricingRateLimiter = rateLimit({
  windowMs: ONE_DAY_MS,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitResponse,
});

export const publishRateLimiter = rateLimit({
  windowMs: ONE_DAY_MS,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  handler: rateLimitResponse,
});

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const ALLOWED_SHARP_FORMATS = new Set([
  "jpeg",
  "jpg",
  "png",
  "webp",
  "gif",
  "avif",
  "heif",
]);

export async function validateImageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const file = req.file;

  if (!file) {
    next();
    return;
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    res.status(400).json({
      error: "Only image uploads are supported.",
      code: "INVALID_UPLOAD",
    });
    return;
  }

  try {
    const metadata = await sharp(file.buffer, {
      animated: false,
      failOn: "warning",
    }).metadata();

    if (
      !metadata.format ||
      !ALLOWED_SHARP_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height
    ) {
      res.status(400).json({
        error: "Uploaded file is not a supported image.",
        code: "INVALID_UPLOAD",
      });
      return;
    }
  } catch {
    res.status(400).json({
      error: "Uploaded file is not a valid image.",
      code: "INVALID_UPLOAD",
    });
    return;
  }

  next();
}
