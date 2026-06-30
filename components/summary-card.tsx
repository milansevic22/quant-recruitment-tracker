import type { ReactNode } from "react";

interface SummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}

export function SummaryCard({ icon, label, value, detail }: SummaryCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-teal-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 min-h-5 text-sm text-slate-500">{detail}</p>
    </section>
  );
}
