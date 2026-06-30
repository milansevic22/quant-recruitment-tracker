import { ROLE_KEYWORDS } from "@/lib/mock-data";
import type { RoleType } from "@/types";

export function matchKeywords(
  value: string,
  keywords: readonly string[] = ROLE_KEYWORDS,
): string[] {
  const normalized = value.toLowerCase();

  return keywords.filter((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escapedKeyword}\\b`, "i").test(normalized);
  });
}

export function inferRoleType(title: string, matchedKeywords: readonly string[]): RoleType {
  const normalizedTitle = title.toLowerCase();
  const normalizedKeywords = new Set(matchedKeywords.map((keyword) => keyword.toLowerCase()));

  if (
    normalizedKeywords.has("intern") ||
    normalizedKeywords.has("internship") ||
    normalizedTitle.includes("summer")
  ) {
    return "internship";
  }

  if (normalizedKeywords.has("graduate") || normalizedTitle.includes("new grad")) {
    return "graduate";
  }

  if (normalizedKeywords.has("software") || normalizedKeywords.has("engineer")) {
    return "engineering";
  }

  if (normalizedKeywords.has("research") || normalizedKeywords.has("researcher")) {
    return "research";
  }

  if (normalizedKeywords.has("trading") || normalizedKeywords.has("trader")) {
    return "trading";
  }

  if (normalizedKeywords.has("quant") || normalizedKeywords.has("quantitative")) {
    return "quant";
  }

  return "other";
}
