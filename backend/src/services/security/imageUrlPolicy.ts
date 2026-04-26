const LOCAL_DATA_URL_RE = /^data:image\/(?:jpeg|jpg|png|webp|gif|avif|heic|heif);base64,/i;

function getAllowedCloudNames(): string[] {
  return [
    process.env.CLOUDINARY_CLOUD_NAME,
    ...((process.env.ALLOWED_IMAGE_CLOUDINARY_CLOUDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)),
  ].filter((value): value is string => Boolean(value));
}

export function isAllowedIdentifyImageUrl(imageUrl: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return imageUrl.startsWith("http://localhost:") ||
      imageUrl.startsWith("http://127.0.0.1:") ||
      imageUrl.startsWith("https://") ||
      LOCAL_DATA_URL_RE.test(imageUrl);
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const allowedCloudNames = getAllowedCloudNames();
  const cloudinaryHosts = new Set([
    "res.cloudinary.com",
    "assets.snapcard.ca",
  ]);

  if (!cloudinaryHosts.has(parsed.hostname)) return false;

  if (parsed.hostname === "res.cloudinary.com") {
    const cloudName = parsed.pathname.split("/").filter(Boolean)[0];
    if (!cloudName || !allowedCloudNames.includes(cloudName)) {
      return false;
    }
  }

  return parsed.pathname.includes("/snapcard/");
}
