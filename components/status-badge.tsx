import clsx from "clsx";

import type { JobStatus, ScanRunStatus } from "@/types";

const jobStatusStyles: Record<JobStatus, string> = {
  new: "border-emerald-200 bg-emerald-50 text-emerald-700",
  seen: "border-sky-200 bg-sky-50 text-sky-700",
  applied: "border-violet-200 bg-violet-50 text-violet-700",
  ignored: "border-slate-200 bg-slate-50 text-slate-600",
};

const scanStatusStyles: Record<ScanRunStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  partial: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

interface StatusBadgeProps {
  label: string;
  variant: JobStatus | ScanRunStatus | "active" | "paused" | "sample" | "firebase";
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  const variantStyles =
    variant === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : variant === "paused"
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : variant === "sample"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : variant === "firebase"
            ? "border-teal-200 bg-teal-50 text-teal-700"
            : variant in jobStatusStyles
              ? jobStatusStyles[variant as JobStatus]
              : scanStatusStyles[variant as ScanRunStatus];

  return (
    <span
      className={clsx(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
        variantStyles,
      )}
    >
      {label}
    </span>
  );
}
