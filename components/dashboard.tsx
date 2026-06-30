"use client";

import {
  AlertCircle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Database,
  RefreshCw,
  Search,
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
import { sampleDashboardData } from "@/lib/mock-data";
import { StatusBadge } from "@/components/status-badge";
import { SummaryCard } from "@/components/summary-card";
import type { DashboardData, Job, ScanRun, TrackedCompany } from "@/types";

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

function JobsTable({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No roles found"
        detail="Seed Firestore or run a scan to populate discovered roles."
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
                <StatusBadge label={job.status} variant={job.status} />
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

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(sampleDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  const scanRuns = useMemo(() => sortByNewest(data.scanRuns, "startedAt"), [data.scanRuns]);
  const activeCompanies = data.companies.filter((company) => company.active);
  const newJobs = jobs.filter((job) => job.status === "new");
  const latestScan = scanRuns[0];

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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Discovered roles</h2>
              <p className="mt-1 text-sm text-slate-500">Newest records first</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {jobs.length}
            </span>
          </div>
          <JobsTable jobs={jobs} />
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
