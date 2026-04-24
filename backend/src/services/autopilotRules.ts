export interface PhotoPair {
  front_url: string;
  back_url: string | null;
}

export interface AutopilotClassificationInput {
  confidence: number | null;
  price_cad: number | null;
  has_front_photo: boolean;
  has_back_photo: boolean;
  card_type: "raw" | "graded";
  condition: string | null;
  grading_company: string | null;
  grade: string | null;
  readiness_ready: boolean;
  readiness_missing: string[];
}

export const AUTOPILOT_CONFIDENCE_THRESHOLD = 0.85;

export function pairPhotoUrls(photoUrls: string[]): PhotoPair[] {
  const pairs: PhotoPair[] = [];

  for (let index = 0; index < photoUrls.length; index += 2) {
    const front = photoUrls[index];
    if (!front) continue;
    pairs.push({
      front_url: front,
      back_url: photoUrls[index + 1] ?? null,
    });
  }

  return pairs;
}

export function smartRoundCadPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;

  if (price < 20) {
    return Math.max(0.5, Math.round(price * 2) / 2);
  }

  if (price < 100) {
    return Math.max(0.99, Math.ceil(price) - 0.01);
  }

  return Math.max(5, Math.round(price / 5) * 5);
}

export function classifyAutopilotItem(
  input: AutopilotClassificationInput,
): { status: "ready" | "needs_review"; reasons: string[] } {
  const reasons: string[] = [];

  if (input.confidence == null || input.confidence < AUTOPILOT_CONFIDENCE_THRESHOLD) {
    reasons.push("AI identification confidence is below 85%; review the card details.");
  }

  if (!input.has_front_photo) {
    reasons.push("Front photo is missing.");
  }

  if (!input.has_back_photo) {
    reasons.push("Back photo is missing.");
  }

  if (input.price_cad == null || input.price_cad <= 0) {
    reasons.push("No usable pricing source was found; enter a CAD price.");
  }

  if (input.card_type === "graded") {
    if (!input.grading_company) {
      reasons.push("Grading company is missing for this graded card.");
    }
    if (!input.grade) {
      reasons.push("Grade is missing for this graded card.");
    }
  } else if (!input.condition) {
    reasons.push("Raw card condition is missing.");
  }

  if (!input.readiness_ready) {
    reasons.push(...input.readiness_missing);
  }

  return {
    status: reasons.length === 0 ? "ready" : "needs_review",
    reasons: Array.from(new Set(reasons)),
  };
}
