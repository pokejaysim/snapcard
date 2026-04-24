import { describe, expect, it } from "vitest";
import {
  classifyAutopilotItem,
  pairPhotoUrls,
  smartRoundCadPrice,
} from "../src/services/autopilotRules.js";

describe("autopilotRules", () => {
  it("pairs uploaded photos by order with odd uploads allowed", () => {
    expect(pairPhotoUrls(["front-1", "back-1", "front-2"])).toEqual([
      { front_url: "front-1", back_url: "back-1" },
      { front_url: "front-2", back_url: null },
    ]);
  });

  it("applies smart CAD rounding bands", () => {
    expect(smartRoundCadPrice(12.24)).toBe(12);
    expect(smartRoundCadPrice(12.26)).toBe(12.5);
    expect(smartRoundCadPrice(48.12)).toBe(48.99);
    expect(smartRoundCadPrice(101.2)).toBe(100);
    expect(smartRoundCadPrice(103)).toBe(105);
  });

  it("marks fully resolved raw cards as ready", () => {
    expect(
      classifyAutopilotItem({
        confidence: 0.91,
        price_cad: 24.99,
        has_front_photo: true,
        has_back_photo: true,
        card_type: "raw",
        condition: "NM",
        grading_company: null,
        grade: null,
        readiness_ready: true,
        readiness_missing: [],
      }),
    ).toEqual({ status: "ready", reasons: [] });
  });

  it("requires review for low confidence, missing back, missing price, and readiness blockers", () => {
    const result = classifyAutopilotItem({
      confidence: 0.7,
      price_cad: null,
      has_front_photo: true,
      has_back_photo: false,
      card_type: "graded",
      condition: null,
      grading_company: null,
      grade: null,
      readiness_ready: false,
      readiness_missing: ["Set a positive price before publishing."],
    });

    expect(result.status).toBe("needs_review");
    expect(result.reasons).toContain("AI identification confidence is below 85%; review the card details.");
    expect(result.reasons).toContain("Back photo is missing.");
    expect(result.reasons).toContain("No usable pricing source was found; enter a CAD price.");
    expect(result.reasons).toContain("Grading company is missing for this graded card.");
    expect(result.reasons).toContain("Grade is missing for this graded card.");
    expect(result.reasons).toContain("Set a positive price before publishing.");
  });
});
