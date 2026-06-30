import type { Firestore } from "firebase-admin/firestore";

import { initialCompanies, sampleJobs } from "@/lib/mock-data";

export interface SeedResult {
  companiesUpserted: number;
  jobsAdded: number;
  jobsSkipped: number;
  scanRunId: string;
}

export async function seedInitialData(db: Firestore): Promise<SeedResult> {
  const now = new Date().toISOString();
  const companiesCollection = db.collection("companies");
  const jobsCollection = db.collection("jobs");
  const scanRunsCollection = db.collection("scanRuns");
  const jobRefs = sampleJobs.map((job) => jobsCollection.doc(job.id));
  const existingJobSnapshots = await db.getAll(...jobRefs);

  const batch = db.batch();
  let jobsAdded = 0;
  let jobsSkipped = 0;

  for (const company of initialCompanies) {
    batch.set(
      companiesCollection.doc(company.id),
      {
        ...company,
        updatedAt: now,
      },
      { merge: true },
    );
  }

  sampleJobs.forEach((job, index) => {
    const existingSnapshot = existingJobSnapshots[index];

    if (existingSnapshot.exists) {
      jobsSkipped += 1;
      return;
    }

    jobsAdded += 1;
    batch.set(jobRefs[index], job);
  });

  const scanRunId = "seed-initial";

  batch.set(
    scanRunsCollection.doc(scanRunId),
    {
      id: scanRunId,
      startedAt: now,
      completedAt: now,
      status: "completed",
      companiesChecked: initialCompanies.length,
      jobsFound: sampleJobs.length,
      newJobsAdded: jobsAdded,
      errors: [],
    },
    { merge: true },
  );

  await batch.commit();

  return {
    companiesUpserted: initialCompanies.length,
    jobsAdded,
    jobsSkipped,
    scanRunId,
  };
}
