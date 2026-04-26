import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/lib/supabase.js", () => ({
  supabase: {},
}));

import { findDescriptor } from "../../src/services/ebay/readiness.js";
import type { EbayConditionDescriptor } from "../../src/services/ebay/metadata.js";

function descriptor(name: string): EbayConditionDescriptor {
  return {
    id: name,
    name,
    helpText: null,
    required: true,
    multiple: false,
    mode: "select",
    values: [],
  };
}

describe("eBay readiness descriptor matching", () => {
  it("does not match grade to Professional Grader", () => {
    const descriptors = [
      descriptor("Professional Grader"),
      descriptor("Grade"),
    ];

    expect(findDescriptor(descriptors, ["grader"])?.name).toBe(
      "Professional Grader",
    );
    expect(findDescriptor(descriptors, ["grade"])?.name).toBe("Grade");
  });
});
