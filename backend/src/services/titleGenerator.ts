interface TitleInput {
  card_name: string;
  card_number: string | null;
  set_name: string | null;
  rarity: string | null;
  condition: string | null;
  language: string | null;
  card_type?: "raw" | "graded" | null;
  grading_company?: string | null;
  grade?: string | null;
}

const MAX_TITLE_LENGTH = 80;

export function generateTitle(input: TitleInput): string {
  const isGraded = input.card_type === "graded";

  // Build parts in priority order for eBay search visibility
  const parts: string[] = [];

  parts.push(input.card_name);

  if (input.card_number) {
    parts.push(input.card_number);
  }

  if (input.set_name) {
    parts.push(input.set_name);
  }

  // For graded cards: company + grade before rarity
  if (isGraded) {
    if (input.grading_company) parts.push(input.grading_company);
    if (input.grade) parts.push(input.grade);
  }

  if (input.rarity) {
    parts.push(input.rarity);
  }

  // Only add condition for raw cards
  if (!isGraded && input.condition) {
    parts.push(input.condition);
  }

  // Only add language if not English (saves title space)
  if (input.language && input.language !== "English") {
    parts.push(input.language);
  }

  // Join and truncate to 80 chars
  let title = parts.join(" ");

  if (title.length > MAX_TITLE_LENGTH) {
    // Drop parts from the end until it fits
    while (parts.length > 1 && title.length > MAX_TITLE_LENGTH) {
      parts.pop();
      title = parts.join(" ");
    }

    // Hard truncate as last resort
    if (title.length > MAX_TITLE_LENGTH) {
      title = title.slice(0, MAX_TITLE_LENGTH).trim();
    }
  }

  return title;
}
