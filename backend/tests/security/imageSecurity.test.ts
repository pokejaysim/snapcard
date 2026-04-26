import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateImageUpload } from "../../src/middleware/security.js";
import { isAllowedIdentifyImageUrl } from "../../src/services/security/imageUrlPolicy.js";

const originalNodeEnv = process.env.NODE_ENV;
const originalCloudName = process.env.CLOUDINARY_CLOUD_NAME;

describe("AI identify image URL policy", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.CLOUDINARY_CLOUD_NAME = "snapcard-test";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.CLOUDINARY_CLOUD_NAME = originalCloudName;
  });

  it("allows SnapCard Cloudinary image URLs in production", () => {
    expect(
      isAllowedIdentifyImageUrl(
        "https://res.cloudinary.com/snapcard-test/image/upload/v1/snapcard/batch/user/card.jpg",
      ),
    ).toBe(true);
  });

  it("rejects data URLs and external image URLs in production", () => {
    expect(isAllowedIdentifyImageUrl("data:image/png;base64,abc")).toBe(false);
    expect(isAllowedIdentifyImageUrl("https://example.com/card.jpg")).toBe(false);
  });

  it("allows local data URLs outside production for development workflows", () => {
    process.env.NODE_ENV = "development";
    expect(isAllowedIdentifyImageUrl("data:image/png;base64,abc")).toBe(true);
  });
});

describe("upload image validation", () => {
  it("allows real image buffers", async () => {
    const buffer = await sharp({
      create: {
        width: 8,
        height: 8,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg()
      .toBuffer();
    const next = vi.fn();

    await validateImageUpload(
      {
        file: {
          buffer,
          mimetype: "image/jpeg",
        },
      } as never,
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects non-image MIME types", async () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await validateImageUpload(
      {
        file: {
          buffer: Buffer.from("hello"),
          mimetype: "text/plain",
        },
      } as never,
      response as never,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_UPLOAD" }),
    );
  });

  it("rejects fake images with image MIME types", async () => {
    const response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await validateImageUpload(
      {
        file: {
          buffer: Buffer.from("not an image"),
          mimetype: "image/png",
        },
      } as never,
      response as never,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "INVALID_UPLOAD" }),
    );
  });
});
