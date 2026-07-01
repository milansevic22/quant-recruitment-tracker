export type JobStatus = "new" | "seen" | "applied" | "ignored";

export type RoleType =
  | "graduate"
  | "internship"
  | "trading"
  | "quant"
  | "research"
  | "engineering"
  | "other";

export type ScanRunStatus = "completed" | "partial" | "failed";

export interface TrackedCompany {
  id: string;
  name: string;
  careersUrl: string;
  keywords: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  location: string;
  url: string;
  sourceUrl: string;
  firstSeenAt: string;
  lastSeenAt: string;
  updatedAt?: string;
  status: JobStatus;
  keywordsMatched: string[];
  roleType: RoleType;
}

export interface ScanRunError {
  companyId?: string;
  companyName?: string;
  url?: string;
  message: string;
}

export interface ScanRun {
  id: string;
  startedAt: string;
  completedAt: string;
  status: ScanRunStatus;
  companiesChecked: number;
  jobsFound: number;
  newJobsAdded: number;
  errors: ScanRunError[];
}

export interface DashboardData {
  companies: TrackedCompany[];
  jobs: Job[];
  scanRuns: ScanRun[];
  mode: "firebase" | "sample";
}
