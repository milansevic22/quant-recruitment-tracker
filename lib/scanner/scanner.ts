import type { Firestore } from "firebase-admin/firestore";

import { createJobId } from "@/lib/ids";
import { normalizeCompany } from "@/lib/firestore-converters";
import { initialCompanies } from "@/lib/mock-data";
import { parsedLinkToJob, parseCareersPage } from "@/lib/scanner/parser";
import { inferRoleType, matchKeywords } from "@/lib/scanner/role-utils";
import type { Job, ScanRun, ScanRunError, TrackedCompany } from "@/types";

const REQUEST_TIMEOUT_MS = 12_000;
const GREENHOUSE_SOURCES: Record<string, string> = {
  "jane-street": "https://boards-api.greenhouse.io/v1/boards/janestreet/jobs",
  optiver: "https://boards-api.greenhouse.io/v1/boards/optiverus/jobs",
};

interface CompanyScanResult {
  jobs: Job[];
  error?: ScanRunError;
}

interface PersistJobsResult {
  newJobs: Job[];
  newJobsAdded: number;
}

export interface CareersScanResult {
  scanRun: ScanRun;
  jobsFound: number;
  newJobsAdded: number;
  companiesChecked: number;
  errors: ScanRunError[];
  notificationsSent: number;
}

interface GreenhouseJob {
  absolute_url?: string;
  departments?: Array<{ name?: string }>;
  location?: {
    name?: string;
  };
  title?: string;
}

interface GreenhouseJobsResponse {
  jobs?: GreenhouseJob[];
}

async function fetchWithTimeout(
  url: string,
  accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        accept,
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

function greenhouseJobToJob(
  company: TrackedCompany,
  sourceUrl: string,
  greenhouseJob: GreenhouseJob,
  now: string,
): Job | null {
  const title = greenhouseJob.title?.trim();
  const url = greenhouseJob.absolute_url?.trim();

  if (!title || !url) {
    return null;
  }

  const departments = greenhouseJob.departments
    ?.map((department) => department.name)
    .filter(Boolean)
    .join(" ");
  const combinedText = [title, greenhouseJob.location?.name, departments, url].join(" ");
  const keywordsMatched = matchKeywords(combinedText, company.keywords);

  if (keywordsMatched.length === 0) {
    return null;
  }

  return {
    id: createJobId(company.id, title, url),
    companyId: company.id,
    companyName: company.name,
    title,
    location: greenhouseJob.location?.name ?? "Location not listed",
    url,
    sourceUrl,
    firstSeenAt: now,
    lastSeenAt: now,
    status: "new",
    keywordsMatched,
    roleType: inferRoleType(title, keywordsMatched),
  };
}

async function scanGreenhouseCompany(
  company: TrackedCompany,
  sourceUrl: string,
): Promise<CompanyScanResult> {
  const response = await fetchWithTimeout(sourceUrl, "application/json");

  if (!response.ok) {
    return {
      jobs: [],
      error: {
        companyId: company.id,
        companyName: company.name,
        url: sourceUrl,
        message: `Greenhouse API returned HTTP ${response.status}.`,
      },
    };
  }

  const payload = (await response.json()) as GreenhouseJobsResponse;
  const now = new Date().toISOString();
  const jobs =
    payload.jobs
      ?.map((greenhouseJob) => greenhouseJobToJob(company, sourceUrl, greenhouseJob, now))
      .filter((job): job is Job => Boolean(job)) ?? [];

  return { jobs };
}

async function scanCompany(company: TrackedCompany): Promise<CompanyScanResult> {
  try {
    const greenhouseSource = GREENHOUSE_SOURCES[company.id];

    if (greenhouseSource) {
      return await scanGreenhouseCompany(company, greenhouseSource);
    }

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

async function persistJobs(db: Firestore, jobs: Job[]): Promise<PersistJobsResult> {
  const newJobs: Job[] = [];

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
    newJobs.push(job);
  }

  return {
    newJobs,
    newJobsAdded: newJobs.length,
  };
}

function buildAlertHtml(newJobs: Job[]): string {
  const jobItems = newJobs
    .slice(0, 12)
    .map(
      (job) => `
        <li>
          <strong>${job.companyName}</strong>: <a href="${job.url}">${job.title}</a>
          <br />
          <span>${job.location} · ${job.roleType} · ${job.keywordsMatched.join(", ")}</span>
        </li>
      `,
    )
    .join("");

  return `
    <h2>New quant recruitment roles detected</h2>
    <p>${newJobs.length} new role${newJobs.length === 1 ? "" : "s"} were added to Firestore.</p>
    <ul>${jobItems}</ul>
    <p>Open the Quant Recruitment Tracker dashboard to review and update statuses.</p>
  `;
}

async function sendNewJobAlert(newJobs: Job[]): Promise<number> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const alertTo = process.env.ALERT_EMAIL_TO;
  const alertFrom =
    process.env.ALERT_EMAIL_FROM ?? "Quant Recruitment Tracker <onboarding@resend.dev>";

  if (!resendApiKey || !alertTo || newJobs.length === 0) {
    return 0;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: alertFrom,
      to: [alertTo],
      subject: `${newJobs.length} new quant recruitment role${newJobs.length === 1 ? "" : "s"}`,
      html: buildAlertHtml(newJobs),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Resend alert failed with HTTP ${response.status}: ${responseText}`);
  }

  return 1;
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

  const { newJobs, newJobsAdded } = await persistJobs(db, allJobs);
  let notificationsSent = 0;

  try {
    notificationsSent = await sendNewJobAlert(newJobs);
  } catch (error) {
    errors.push({
      message: error instanceof Error ? error.message : "Unknown notification failure.",
    });
  }

  const completedAt = new Date().toISOString();
  const scanRun: ScanRun = {
    id: `scan-${Date.now()}`,
    startedAt,
    completedAt,
    status: getScanStatus(errors, companies.length),
    companiesChecked: companies.length,
    jobsFound: allJobs.length,
    newJobsAdded,
    notificationsSent,
    errors,
  };

  await db.collection("scanRuns").doc(scanRun.id).set(scanRun);

  return {
    scanRun,
    jobsFound: allJobs.length,
    newJobsAdded,
    companiesChecked: companies.length,
    errors,
    notificationsSent,
  };
}
