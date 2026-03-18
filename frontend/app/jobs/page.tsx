"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJobs, subscribeToPush, type Job } from "@/lib/api";

function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 leading-snug truncate">{job.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{job.company.name}</p>
          {job.location && (
            <p className="text-xs text-gray-400 mt-1 truncate">{job.location}</p>
          )}
        </div>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
        >
          View posting →
        </a>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

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

  async function handleEnableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }
    setNotifStatus("loading");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setNotifStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BIp3kUetAw4oPNGzTPGE3Cm-q706uOKf23Kvf-ZV8n_47pbHKu9VXjOMr4O0n1IGZkIolJG6HczKBLqWqVA6rqc",
      });
      await subscribeToPush(sub.toJSON() as PushSubscriptionJSON);
      setNotifStatus("granted");
    } catch (err) {
      console.error(err);
      setNotifStatus("idle");
    }
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
            {notifStatus === "granted" ? (
              <span className="text-sm text-green-600 font-medium">Notifications on</span>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={notifStatus === "loading" || notifStatus === "denied"}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {notifStatus === "loading" ? "Enabling…" : notifStatus === "denied" ? "Blocked" : "Enable Notifications"}
              </button>
            )}
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
