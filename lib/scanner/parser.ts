import * as cheerio from "cheerio";

import { createJobId } from "@/lib/ids";
import { inferRoleType, matchKeywords } from "@/lib/scanner/role-utils";
import type { Job, TrackedCompany } from "@/types";

interface ParsedLink {
  title: string;
  url: string;
  keywordsMatched: string[];
}

const GENERIC_LINK_TEXT = new Set([
  "apply",
  "apply now",
  "careers",
  "find out more",
  "job search",
  "jobs",
  "learn more",
  "open roles",
  "read more",
  "see jobs",
  "view job",
  "view jobs",
  "view role",
]);

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isUsefulTitle(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    value.length >= 4 &&
    value.length <= 160 &&
    !GENERIC_LINK_TEXT.has(normalized) &&
    !normalized.includes("privacy") &&
    !normalized.includes("cookie") &&
    !normalized.includes("terms of use")
  );
}

function absoluteUrl(href: string, sourceUrl: string): string | null {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return null;
  }
}

export function parseCareersPage(html: string, company: TrackedCompany): ParsedLink[] {
  const $ = cheerio.load(html);
  const candidates = new Map<string, ParsedLink>();

  $("a[href]").each((_, element) => {
    const link = $(element);
    const href = link.attr("href") ?? "";
    const url = absoluteUrl(href, company.careersUrl);

    if (!url || url.startsWith("mailto:") || url.startsWith("tel:")) {
      return;
    }

    const linkText = cleanText(link.text());
    const ariaLabel = cleanText(link.attr("aria-label") ?? "");
    const titleAttr = cleanText(link.attr("title") ?? "");
    const parentText = cleanText(link.closest("li, article, section, div").text());
    const combinedText = [linkText, ariaLabel, titleAttr, href, parentText]
      .filter(Boolean)
      .join(" ");
    const keywordsMatched = matchKeywords(combinedText, company.keywords);

    if (keywordsMatched.length === 0) {
      return;
    }

    const title =
      [linkText, ariaLabel, titleAttr, parentText]
        .map(cleanText)
        .find((candidate) => isUsefulTitle(candidate)) ?? "";

    if (!title) {
      return;
    }

    const key = `${title.toLowerCase()}|${url}`;

    if (!candidates.has(key)) {
      candidates.set(key, {
        title,
        url,
        keywordsMatched,
      });
    }
  });

  return [...candidates.values()].slice(0, 60);
}

export function parsedLinkToJob(company: TrackedCompany, parsedLink: ParsedLink, now: string): Job {
  return {
    id: createJobId(company.id, parsedLink.title, parsedLink.url),
    companyId: company.id,
    companyName: company.name,
    title: parsedLink.title,
    location: "Location not listed",
    url: parsedLink.url,
    sourceUrl: company.careersUrl,
    firstSeenAt: now,
    lastSeenAt: now,
    status: "new",
    keywordsMatched: parsedLink.keywordsMatched,
    roleType: inferRoleType(parsedLink.title, parsedLink.keywordsMatched),
  };
}
