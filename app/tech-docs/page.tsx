import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  Braces,
  CalendarClock,
  Database,
  GitBranch,
  LockKeyhole,
  Radar,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

const systemSteps = [
  "Dashboard loads browser-safe Firebase config.",
  "Client reads companies, jobs, and scanRuns from Firestore.",
  "If Firebase reads fail, the dashboard falls back to sample data.",
  "Admin actions call protected server routes with x-admin-secret.",
  "Server routes use Firebase Admin SDK for privileged writes.",
  "Vercel Cron can run the same scanner every day without manual action.",
];

const scannerSteps = [
  "Load active tracked companies from Firestore.",
  "Use verified ATS APIs first, currently Greenhouse feeds for Jane Street and Optiver US.",
  "Fall back to a safe public careers-page fetch for companies without a stable feed.",
  "Match early-career, quant, trading, research, and software keywords.",
  "Create deterministic job IDs so duplicate postings are skipped.",
  "Write scan results, new jobs, errors, and notification counts back to Firestore.",
];

const routes = [
  {
    route: "POST /api/seed",
    purpose: "Seeds Firebase with the tracked company list and initial sample roles.",
    protection: "Requires x-admin-secret matching ADMIN_API_SECRET.",
  },
  {
    route: "POST /api/scan",
    purpose: "Runs the live careers scanner and stores new results.",
    protection: "Requires x-admin-secret matching ADMIN_API_SECRET.",
  },
  {
    route: "GET /api/cron/scan",
    purpose: "Runs the scheduled scanner from Vercel Cron.",
    protection: "Requires Authorization: Bearer CRON_SECRET.",
  },
  {
    route: "PATCH /api/jobs/:jobId/status",
    purpose: "Persists review status changes such as seen, applied, or ignored.",
    protection: "Requires x-admin-secret matching ADMIN_API_SECRET.",
  },
];

const envVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "ADMIN_API_SECRET",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "ALERT_EMAIL_TO",
  "ALERT_EMAIL_FROM",
];

function SectionCard({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-700">
          {icon}
        </span>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CodePill({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
      {children}
    </code>
  );
}

export default function TechDocsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
              href="/"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Technical documentation
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
              How the Quant Recruitment Tracker works
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This page explains the production data flow, scanner architecture,
              Firebase boundaries, protected routes, scheduled automation, email
              alerts, and current limitations.
            </p>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Live app: Vercel + Firebase + Resend
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Frontend
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">Next.js dashboard</p>
          <p className="mt-1 text-sm text-slate-600">
            Reads Firebase data, renders review controls, and exposes admin actions.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Backend
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">Protected API routes</p>
          <p className="mt-1 text-sm text-slate-600">
            Server routes handle privileged Firebase writes and scanner execution.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Automation
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-950">Cron + alerts</p>
          <p className="mt-1 text-sm text-slate-600">
            Vercel Cron runs scheduled scans; Resend emails new-role alerts.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard icon={<GitBranch className="h-5 w-5" />} title="System Flow">
          <ol className="space-y-3 text-sm text-slate-700">
            {systemSteps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard icon={<Database className="h-5 w-5" />} title="Firestore Model">
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              <CodePill>companies</CodePill> stores tracked firms, careers URLs,
              keywords, and active state.
            </p>
            <p>
              <CodePill>jobs</CodePill> stores discovered roles, source URLs,
              matched keywords, role type, review status, and timestamps.
            </p>
            <p>
              <CodePill>scanRuns</CodePill> stores each run status, checked
              company count, found job count, new job count, alerts sent, and
              per-company errors.
            </p>
          </div>
        </SectionCard>
      </section>

      <SectionCard icon={<Radar className="h-5 w-5" />} title="Scanner Behavior">
        <div className="grid gap-4 lg:grid-cols-2">
          <ol className="space-y-3 text-sm text-slate-700">
            {scannerSteps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-700 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Important limitation</p>
            <p className="mt-2">
              The tracker watches known companies and public sources. It does
              not crawl the entire web, bypass logins, bypass CAPTCHAs, or
              guarantee that every careers page resolves to an exact job-post
              URL. Verified ATS feeds are more reliable than generic HTML pages.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={<ServerCog className="h-5 w-5" />} title="Protected Routes">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Protection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((route) => (
                <tr key={route.route}>
                  <td className="px-4 py-4 font-semibold text-slate-950">
                    <CodePill>{route.route}</CodePill>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{route.purpose}</td>
                  <td className="px-4 py-4 text-slate-700">{route.protection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={<LockKeyhole className="h-5 w-5" />} title="Security Boundaries">
          <ul className="space-y-3 text-sm text-slate-700">
            <li>Browser-safe Firebase variables use the <CodePill>NEXT_PUBLIC_</CodePill> prefix.</li>
            <li>Firebase Admin credentials stay server-side in Vercel environment variables.</li>
            <li>Dashboard admin actions require the session-entered admin secret.</li>
            <li>Firestore rules allow public dashboard reads but block direct client writes.</li>
            <li>Admin secrets are accepted through headers, not query strings.</li>
          </ul>
        </SectionCard>

        <SectionCard icon={<Bell className="h-5 w-5" />} title="Email Alerts">
          <p className="text-sm leading-6 text-slate-700">
            Resend sends an email only when a scan inserts at least one new job.
            Existing jobs are deduplicated, so repeated scans should usually add
            zero jobs and send zero emails unless a genuinely new role appears.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Required variables: <CodePill>RESEND_API_KEY</CodePill>,{" "}
            <CodePill>ALERT_EMAIL_TO</CodePill>, and{" "}
            <CodePill>ALERT_EMAIL_FROM</CodePill>.
          </div>
        </SectionCard>
      </section>

      <SectionCard icon={<Braces className="h-5 w-5" />} title="Environment Variables">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {envVars.map((envVar) => (
            <code
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              key={envVar}
            >
              {envVar}
            </code>
          ))}
        </div>
      </SectionCard>

      <section className="grid gap-6 lg:grid-cols-2">
        <SectionCard icon={<CalendarClock className="h-5 w-5" />} title="Deployment">
          <ul className="space-y-3 text-sm text-slate-700">
            <li>GitHub stores the source code and triggers Vercel deployments.</li>
            <li>Vercel hosts the dashboard and serverless API routes.</li>
            <li><CodePill>vercel.json</CodePill> schedules <CodePill>/api/cron/scan</CodePill> daily.</li>
            <li>Firebase stores the tracker state and scan history.</li>
            <li>Resend sends alerts after new jobs are inserted.</li>
          </ul>
        </SectionCard>

        <SectionCard icon={<ShieldCheck className="h-5 w-5" />} title="Current Tradeoffs">
          <ul className="space-y-3 text-sm text-slate-700">
            <li>The scanner is strongest for verified ATS APIs and weaker for dynamic careers pages.</li>
            <li>Keyword matching can include senior roles if the title contains tracked terms.</li>
            <li>Some generic careers pages resolve to a broader careers URL rather than a specific posting.</li>
            <li>The next improvement is company-specific adapters plus stricter entry-level classification.</li>
          </ul>
        </SectionCard>
      </section>
    </main>
  );
}
