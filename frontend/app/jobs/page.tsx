"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJobs, type Job } from "@/lib/api";

// Maps a platform string to a short badge label and color
const PLATFORM_STYLES: Record<string, { label: string; classes: string }> = {
  greenhouse: { label: "Greenhouse", classes: "bg-green-100 text-green-700" },
  lever:      { label: "Lever",      classes: "bg-purple-100 text-purple-700" },
  ashby:      { label: "Ashby",      classes: "bg-orange-100 text-orange-700" },
};

function PlatformBadge({ platform }: { platform: string }) {
  const style = PLATFORM_STYLES[platform.toLowerCase()] ?? {
    label: platform,
    classes: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.classes}`}>
      {style.label}
    </span>
  );
}

function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 leading-snug">{job.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{job.company.name}</p>
        </div>
        <PlatformBadge platform={job.platform} />
      </div>

      {job.location && (
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {job.location}
        </p>
      )}

      <a
        href={job.url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        View posting →
      </a>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }

    fetchJobs()
      .then(setJobs)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load jobs.";
        // Treat auth errors as session expired
        if (msg.includes("401") || msg.includes("403")) {
          localStorage.removeItem("token");
          router.replace("/");
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("token");
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">JobWatch</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/watchlist"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Watchlist
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-gray-400 text-sm py-16">Loading jobs…</p>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-500 mb-1">No jobs yet</p>
            <p className="text-sm mb-6">
              Add companies to your watchlist and check back soon.
            </p>
            <Link
              href="/watchlist"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Manage Watchlist
            </Link>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {jobs.length} {jobs.length === 1 ? "job" : "jobs"} from your watchlist
            </p>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
