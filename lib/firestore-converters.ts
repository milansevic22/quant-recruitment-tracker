import type { Job, ScanRun, ScanRunError, TrackedCompany } from "@/types";

type FirestoreDateValue =
  | string
  | Date
  | {
      toDate: () => Date;
    }
  | null
  | undefined;

function toIsoString(value: FirestoreDateValue): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value.toDate().toISOString();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function scanErrors(value: unknown): ScanRunError[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const error = item as Partial<ScanRunError>;

    return {
      companyId: error.companyId,
      companyName: error.companyName,
      url: error.url,
      message: error.message ?? "Unknown scanner error",
    };
  });
}

export function normalizeCompany(id: string, data: Record<string, unknown>): TrackedCompany {
  return {
    id: typeof data.id === "string" ? data.id : id,
    name: typeof data.name === "string" ? data.name : "Unnamed company",
    careersUrl: typeof data.careersUrl === "string" ? data.careersUrl : "",
    keywords: stringArray(data.keywords),
    active: typeof data.active === "boolean" ? data.active : true,
    createdAt: toIsoString(data.createdAt as FirestoreDateValue),
    updatedAt: toIsoString(data.updatedAt as FirestoreDateValue),
  };
}

export function normalizeJob(id: string, data: Record<string, unknown>): Job {
  return {
    id: typeof data.id === "string" ? data.id : id,
    companyId: typeof data.companyId === "string" ? data.companyId : "",
    companyName: typeof data.companyName === "string" ? data.companyName : "Unknown",
    title: typeof data.title === "string" ? data.title : "Untitled role",
    location: typeof data.location === "string" ? data.location : "Location not listed",
    url: typeof data.url === "string" ? data.url : "",
    sourceUrl: typeof data.sourceUrl === "string" ? data.sourceUrl : "",
    firstSeenAt: toIsoString(data.firstSeenAt as FirestoreDateValue),
    lastSeenAt: toIsoString(data.lastSeenAt as FirestoreDateValue),
    status:
      data.status === "seen" ||
      data.status === "applied" ||
      data.status === "ignored" ||
      data.status === "new"
        ? data.status
        : "new",
    keywordsMatched: stringArray(data.keywordsMatched),
    roleType:
      data.roleType === "graduate" ||
      data.roleType === "internship" ||
      data.roleType === "trading" ||
      data.roleType === "quant" ||
      data.roleType === "research" ||
      data.roleType === "engineering" ||
      data.roleType === "other"
        ? data.roleType
        : "other",
  };
}

export function normalizeScanRun(id: string, data: Record<string, unknown>): ScanRun {
  return {
    id: typeof data.id === "string" ? data.id : id,
    startedAt: toIsoString(data.startedAt as FirestoreDateValue),
    completedAt: toIsoString(data.completedAt as FirestoreDateValue),
    status:
      data.status === "completed" || data.status === "partial" || data.status === "failed"
        ? data.status
        : "partial",
    companiesChecked: typeof data.companiesChecked === "number" ? data.companiesChecked : 0,
    jobsFound: typeof data.jobsFound === "number" ? data.jobsFound : 0,
    newJobsAdded: typeof data.newJobsAdded === "number" ? data.newJobsAdded : 0,
    errors: scanErrors(data.errors),
  };
}
