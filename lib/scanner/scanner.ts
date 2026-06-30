import type { Firestore } from "firebase-admin/firestore";

import { normalizeCompany } from "@/lib/firestore-converters";
import { initialCompanies } from "@/lib/mock-data";
import { parsedLinkToJob, parseCareersPage } from "@/lib/scanner/parser";
import type { Job, ScanRun, ScanRunError, TrackedCompany } from "@/types";

const REQUEST_TIMEOUT_MS = 12_000;

interface CompanyScanResult {
  jobs: Job[];
  error?: ScanRunError;
}

export interface CareersScanResult {
  scanRun: ScanRun;
  jobsFound: number;
  newJobsAdded: number;
  companiesChecked: number;
  errors: ScanRunError[];
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent":
          "QuantRecruitmentTrackerMVP/0.1 (+https://example.com; public careers page monitor)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadCompanies(db: Firestore): Promise<TrackedCompany[]> {
  const snapshot = await db.collection("companies").where("active", "==", true).get();

  if (snapshot.empty) {
    return initialCompanies.filter((company) => company.active);
  }

  return snapshot.docs.map((doc) => normalizeCompany(doc.id, doc.data()));
}

async function scanCompany(company: TrackedCompany): Promise<CompanyScanResult> {
  try {
    const response = await fetchWithTimeout(company.careersUrl);

    if (!response.ok) {
      return {
        jobs: [],
        error: {
          companyId: company.id,
          companyName: company.name,
          url: company.careersUrl,
          message: `HTTP ${response.status} while reading careers page.`,
        },
      };
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return {
        jobs: [],
        error: {
          companyId: company.id,
          companyName: company.name,
          url: company.careersUrl,
          message: `Unsupported content type: ${contentType || "unknown"}.`,
        },
      };
    }

    const html = await response.text();
    const now = new Date().toISOString();
    const parsedLinks = parseCareersPage(html, company);
    const jobs = parsedLinks.map((parsedLink) => parsedLinkToJob(company, parsedLink, now));

    return { jobs };
  } catch (error) {
    return {
      jobs: [],
      error: {
        companyId: company.id,
        companyName: company.name,
        url: company.careersUrl,
        message: error instanceof Error ? error.message : "Unknown scanner failure.",
      },
    };
  }
}

async function persistJobs(db: Firestore, jobs: Job[]): Promise<number> {
  let newJobsAdded = 0;

  for (const job of jobs) {
    const jobRef = db.collection("jobs").doc(job.id);
    const existingJob = await jobRef.get();

    if (existingJob.exists) {
      await jobRef.set(
        {
          lastSeenAt: job.lastSeenAt,
          keywordsMatched: job.keywordsMatched,
          roleType: job.roleType,
          sourceUrl: job.sourceUrl,
        },
        { merge: true },
      );
      continue;
    }

    await jobRef.set(job);
    newJobsAdded += 1;
  }

  return newJobsAdded;
}

function getScanStatus(errors: ScanRunError[], companiesChecked: number): ScanRun["status"] {
  if (errors.length === 0) {
    return "completed";
  }

  return errors.length >= companiesChecked ? "failed" : "partial";
}

export async function runCareersScan(db: Firestore): Promise<CareersScanResult> {
  const startedAt = new Date().toISOString();
  const companies = await loadCompanies(db);
  const allJobs: Job[] = [];
  const errors: ScanRunError[] = [];

  for (const company of companies) {
    const result = await scanCompany(company);
    allJobs.push(...result.jobs);

    if (result.error) {
      errors.push(result.error);
    }
  }

  const newJobsAdded = await persistJobs(db, allJobs);
  const completedAt = new Date().toISOString();
  const scanRun: ScanRun = {
    id: `scan-${Date.now()}`,
    startedAt,
    completedAt,
    status: getScanStatus(errors, companies.length),
    companiesChecked: companies.length,
    jobsFound: allJobs.length,
    newJobsAdded,
    errors,
  };

  await db.collection("scanRuns").doc(scanRun.id).set(scanRun);

  return {
    scanRun,
    jobsFound: allJobs.length,
    newJobsAdded,
    companiesChecked: companies.length,
    errors,
  };
}
