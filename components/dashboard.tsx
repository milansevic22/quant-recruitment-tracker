"use client";

import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Clock3,
  Database,
  Play,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type DocumentData,
} from "firebase/firestore";

import { getFirebaseDb, hasFirebaseClientConfig } from "@/lib/firebase/client";
import {
  normalizeCompany,
  normalizeJob,
  normalizeScanRun,
} from "@/lib/firestore-converters";
import { reviewScanJobs, sampleDashboardData } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { SummaryCard } from "@/components/summary-card";
import type {
  DashboardData,
  Job,
  JobStatus,
  RoleType,
  ScanRun,
  TrackedCompany,
} from "@/types";

const JOB_STATUSES: JobStatus[] = ["new", "seen", "applied", "ignored"];
const ROLE_TYPES: RoleType[] = [
  "graduate",
  "internship",
  "trading",
  "quant",
  "research",
  "engineering",
  "other",
];

function formatDateTime(value: string): string {
  if (!value) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Not available";
  }
}

function formatRoleType(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortByNewest<T extends { firstSeenAt?: string; startedAt?: string }>(
  items: T[],
  key: "firstSeenAt" | "startedAt",
): T[] {
  return [...items].sort((first, second) => {
    const firstTime = new Date(first[key] ?? "").getTime();
    const secondTime = new Date(second[key] ?? "").getTime();
    return secondTime - firstTime;
  });
}

async function loadFirebaseDashboardData(): Promise<DashboardData> {
  const db = getFirebaseDb();

  if (!db) {
    return sampleDashboardData;
  }

  const [companiesSnapshot, jobsSnapshot, scanRunsSnapshot] = await Promise.all([
    getDocs(query(collection(db, "companies"), orderBy("name", "asc"))),
    getDocs(query(collection(db, "jobs"), orderBy("firstSeenAt", "desc"), limit(80))),
    getDocs(query(collection(db, "scanRuns"), orderBy("startedAt", "desc"), limit(8))),
  ]);

  const companies = companiesSnapshot.docs.map((doc) =>
    normalizeCompany(doc.id, doc.data() as DocumentData),
  );
  const jobs = jobsSnapshot.docs.map((doc) =>
    normalizeJob(doc.id, doc.data() as DocumentData),
  );
  const scanRuns = scanRunsSnapshot.docs.map((doc) =>
    normalizeScanRun(doc.id, doc.data() as DocumentData),
  );

  return {
    companies,
    jobs,
    scanRuns,
    mode: "firebase",
  };
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-36 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <Search className="h-6 w-6 text-slate-400" aria-hidden="true" />
      <p className="mt-3 font-medium text-slate-800">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-20 rounded-lg border border-slate-200 bg-white shadow-soft" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-36 rounded-lg border border-slate-200 bg-white shadow-soft"
            key={index}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
        <div className="h-96 rounded-lg border border-slate-200 bg-white shadow-soft" />
        <div className="h-96 rounded-lg border border-slate-200 bg-white shadow-soft" />
      </div>
    </main>
  );
}

function JobsTable({
  jobs,
  onStatusChange,
}: {
  jobs: Job[];
  onStatusChange: (jobId: string, status: JobStatus) => void;
}) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No matching roles"
        detail="Adjust the search or filters, seed Firestore, or run a scan to populate discovered roles."
      />
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table className="min-w-[860px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">First seen</th>
            <th className="px-4 py-3">Keywords</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => (
            <tr className="align-top hover:bg-slate-50" key={job.id}>
              <td className="px-4 py-4">
                <a
                  className="inline-flex max-w-[320px] items-start gap-1.5 font-semibold text-slate-950 hover:text-teal-700"
                  href={job.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{job.title}</span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs text-slate-500">{job.location}</p>
              </td>
              <td className="px-4 py-4 text-slate-700">{job.companyName}</td>
              <td className="px-4 py-4 text-slate-700">{formatRoleType(job.roleType)}</td>
              <td className="px-4 py-4">
                <div className="flex flex-col items-start gap-2">
                  <StatusBadge label={job.status} variant={job.status} />
                  <select
                    aria-label={`Update status for ${job.title}`}
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm"
                    onChange={(event) =>
                      onStatusChange(job.id, event.target.value as JobStatus)
                    }
                    value={job.status}
                  >
                    {JOB_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="px-4 py-4 text-slate-600">{formatDateTime(job.firstSeenAt)}</td>
              <td className="px-4 py-4">
                <div className="flex max-w-[260px] flex-wrap gap-1.5">
                  {job.keywordsMatched.slice(0, 4).map((keyword) => (
                    <span
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                      key={keyword}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface JobFiltersProps {
  companies: TrackedCompany[];
  companyFilter: string;
  resultCount: number;
  roleFilter: string;
  searchQuery: string;
  statusFilter: string;
  totalCount: number;
  onCompanyFilterChange: (value: string) => void;
  onReset: () => void;
  onRoleFilterChange: (value: string) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

function JobFilters({
  companies,
  companyFilter,
  resultCount,
  roleFilter,
  searchQuery,
  statusFilter,
  totalCount,
  onCompanyFilterChange,
  onReset,
  onRoleFilterChange,
  onSearchQueryChange,
  onStatusFilterChange,
}: JobFiltersProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(140px,0.7fr))_auto]">
        <label className="relative block">
          <span className="sr-only">Search roles</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search title, company, keyword, location"
            type="search"
            value={searchQuery}
          />
        </label>

        <label className="block">
          <span className="sr-only">Filter by company</span>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => onCompanyFilterChange(event.target.value)}
            value={companyFilter}
          >
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by role type</span>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => onRoleFilterChange(event.target.value)}
            value={roleFilter}
          >
            <option value="all">All role types</option>
            {ROLE_TYPES.map((roleType) => (
              <option key={roleType} value={roleType}>
                {formatRoleType(roleType)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="sr-only">Filter by status</span>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            onChange={(event) => onStatusFilterChange(event.target.value)}
            value={statusFilter}
          >
            <option value="all">All statuses</option>
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <button
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Showing {resultCount} of {totalCount} roles. Status changes update this
        review session locally.
      </p>
    </div>
  );
}

function CompaniesList({ companies }: { companies: TrackedCompany[] }) {
  if (companies.length === 0) {
    return (
      <EmptyState
        title="No companies tracked"
        detail="Seed the initial company list or add company records in Firestore."
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {companies.map((company) => (
        <article className="flex gap-3 px-4 py-4" key={company.id}>
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-950">{company.name}</h3>
              <StatusBadge
                label={company.active ? "active" : "paused"}
                variant={company.active ? "active" : "paused"}
              />
            </div>
            <a
              className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-teal-700 hover:text-teal-900"
              href={company.careersUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="truncate">{company.careersUrl}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {company.keywords.slice(0, 5).map((keyword) => (
                <span
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                  key={keyword}
                >
                  {keyword}
                </span>
              ))}
              {company.keywords.length > 5 ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
                  +{company.keywords.length - 5}
                </span>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ScanRunPanel({ scanRuns }: { scanRuns: ScanRun[] }) {
  const latestScan = scanRuns[0];

  if (!latestScan) {
    return (
      <EmptyState
        title="No scan history"
        detail="Run the protected scan route to create the first scan-run record."
      />
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Latest scan</h2>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusBadge label={latestScan.status} variant={latestScan.status} />
          <span className="text-sm text-slate-500">
            {formatDateTime(latestScan.completedAt)}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-slate-500">Checked</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {latestScan.companiesChecked}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-slate-500">Found</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {latestScan.jobsFound}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-slate-500">New</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950">
              {latestScan.newJobsAdded}
            </dd>
          </div>
        </dl>
        {latestScan.errors.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800">Scanner notes</p>
            <ul className="mt-2 space-y-1 text-sm text-amber-800">
              {latestScan.errors.slice(0, 3).map((error) => (
                <li key={`${error.companyId}-${error.message}`}>
                  {error.companyName ?? "Unknown"}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AutomationPanel({
  companies,
  jobs,
  latestScan,
  onRunReviewScan,
}: {
  companies: TrackedCompany[];
  jobs: Job[];
  latestScan?: ScanRun;
  onRunReviewScan: () => void;
}) {
  const activeCompanies = companies.filter((company) => company.active);
  const uniqueLocations = new Set(jobs.map((job) => job.location).filter(Boolean));
  const latestErrors = latestScan?.errors.length ?? 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">Automation center</h2>
            <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
              Vercel Cron ready
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Safe public-page monitoring with review-mode scan simulation.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-700 px-3 text-sm font-semibold text-white shadow-soft hover:bg-teal-800"
          onClick={onRunReviewScan}
          type="button"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Run review scan
        </button>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Radar className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Sources watched
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {activeCompanies.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Public careers pages in scope</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BriefcaseBusiness className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Postings indexed
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{jobs.length}</p>
          <p className="mt-1 text-xs text-slate-500">Current dashboard records</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarClock className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Scan cadence
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950">Daily</p>
          <p className="mt-1 text-xs text-slate-500">Manual now, Cron-ready later</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
            Safe scanner
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {latestErrors === 0 ? "Clean" : `${latestErrors} note${latestErrors > 1 ? "s" : ""}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">No bypassing or login scraping</p>
        </div>
      </div>

      <div className="grid gap-4 border-t border-slate-200 px-5 py-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-slate-800">Pipeline</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <span className="block text-xs font-semibold uppercase text-slate-400">
                1. Fetch
              </span>
              Public careers pages
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <span className="block text-xs font-semibold uppercase text-slate-400">
                2. Match
              </span>
              Quant and early-career keywords
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <span className="block text-xs font-semibold uppercase text-slate-400">
                3. Record
              </span>
              Firestore jobs and scan runs
            </div>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Coverage snapshot</p>
          <p className="mt-3 text-sm text-slate-600">
            Current sample index spans {uniqueLocations.size} location groups and{" "}
            {new Set(jobs.map((job) => job.roleType)).size} role categories. The review
            scan adds newly detected records locally so the demo shows the automation loop.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(sampleDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!hasFirebaseClientConfig()) {
        setData(sampleDashboardData);
        setMessage("Firebase is not configured. Showing sample dashboard data.");
        return;
      }

      const firebaseData = await loadFirebaseDashboardData();
      setData(firebaseData);
      setMessage(null);
    } catch (loadError) {
      setData(sampleDashboardData);
      setError(
        loadError instanceof Error
          ? `Could not read Firestore: ${loadError.message}`
          : "Could not read Firestore.",
      );
      setMessage("Showing sample dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const jobs = useMemo(() => sortByNewest(data.jobs, "firstSeenAt"), [data.jobs]);
  const filteredJobs = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          job.title,
          job.companyName,
          job.location,
          job.roleType,
          job.status,
          ...job.keywordsMatched,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesCompany = companyFilter === "all" || job.companyId === companyFilter;
      const matchesRole = roleFilter === "all" || job.roleType === roleFilter;
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;

      return matchesSearch && matchesCompany && matchesRole && matchesStatus;
    });
  }, [companyFilter, jobs, roleFilter, searchQuery, statusFilter]);
  const scanRuns = useMemo(() => sortByNewest(data.scanRuns, "startedAt"), [data.scanRuns]);
  const activeCompanies = data.companies.filter((company) => company.active);
  const newJobs = jobs.filter((job) => job.status === "new");
  const latestScan = scanRuns[0];

  const updateJobStatus = useCallback((jobId: string, status: JobStatus) => {
    setData((currentData) => ({
      ...currentData,
      jobs: currentData.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status,
            }
          : job,
      ),
    }));
    setMessage(
      "Status updated for this review session. Persisted status updates are available through the protected admin API route.",
    );
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setCompanyFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
  }, []);

  const runReviewScan = useCallback(() => {
    const existingJobIds = new Set(data.jobs.map((job) => job.id));
    const newlyDetectedJobs = reviewScanJobs.filter((job) => !existingJobIds.has(job.id));
    const now = new Date().toISOString();

    setData((currentData) => ({
      ...currentData,
      jobs: [...newlyDetectedJobs, ...currentData.jobs],
      scanRuns: [
        {
          id: `review-scan-${Date.now()}`,
          startedAt: now,
          completedAt: now,
          status: "completed",
          companiesChecked: currentData.companies.filter((company) => company.active).length,
          jobsFound: currentData.jobs.length + newlyDetectedJobs.length,
          newJobsAdded: newlyDetectedJobs.length,
          errors: [],
        },
        ...currentData.scanRuns,
      ],
    }));

    setMessage(
      newlyDetectedJobs.length > 0
        ? `Review scan completed. Added ${newlyDetectedJobs.length} newly detected roles locally.`
        : "Review scan completed. No duplicate roles were added.",
    );
    setStatusFilter("all");
    setSearchQuery("");
  }, [data.jobs]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                Quant Recruitment Tracker
              </h1>
              <StatusBadge
                label={data.mode === "firebase" ? "Firebase live" : "Sample data"}
                variant={data.mode}
              />
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Public careers-page monitoring for graduate, internship, quant,
              trading, research, and software roles.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-soft hover:bg-slate-50"
            onClick={() => void loadData()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
      </header>

      {message ? (
        <section className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{message}</p>
        </section>
      ) : null}

      {error ? (
        <section className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Summary">
        <SummaryCard
          detail={`${activeCompanies.length} active sources`}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
          label="Tracked companies"
          value={data.companies.length.toString()}
        />
        <SummaryCard
          detail={`${jobs.length} total visible records`}
          icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
          label="Discovered roles"
          value={jobs.length.toString()}
        />
        <SummaryCard
          detail="Marked for first review"
          icon={<Database className="h-5 w-5" aria-hidden="true" />}
          label="New roles"
          value={newJobs.length.toString()}
        />
        <SummaryCard
          detail={latestScan ? latestScan.status : "No run recorded"}
          icon={<Clock3 className="h-5 w-5" aria-hidden="true" />}
          label="Last scan"
          value={latestScan ? formatDateTime(latestScan.completedAt) : "None"}
        />
      </section>

      <AutomationPanel
        companies={data.companies}
        jobs={jobs}
        latestScan={latestScan}
        onRunReviewScan={runReviewScan}
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Discovered roles</h2>
              <p className="mt-1 text-sm text-slate-500">Newest records first</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {filteredJobs.length}
            </span>
          </div>
          <JobFilters
            companies={data.companies}
            companyFilter={companyFilter}
            onCompanyFilterChange={setCompanyFilter}
            onReset={resetFilters}
            onRoleFilterChange={setRoleFilter}
            onSearchQueryChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            resultCount={filteredJobs.length}
            roleFilter={roleFilter}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            totalCount={jobs.length}
          />
          <JobsTable jobs={filteredJobs} onStatusChange={updateJobStatus} />
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Tracked companies</h2>
                <p className="mt-1 text-sm text-slate-500">Initial quant recruitment watchlist</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {data.companies.length}
              </span>
            </div>
            <CompaniesList companies={data.companies} />
          </section>

          <ScanRunPanel scanRuns={scanRuns} />
        </div>
      </section>
    </main>
  );
}
