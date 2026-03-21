"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJobs, subscribeToPush, type Job } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return `${months}mo ago`;
}

function JobCard({ job }: { job: Job }) {
  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-8 h-8 flex items-center justify-center">
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={job.company.name}
              className="w-8 h-8 rounded object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-8 h-8 rounded bg-gray-100" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{job.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{job.company.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400">{timeAgo(job.updatedAt || job.createdAt)}</p>
          {job.location && (
            <p className="text-xs text-gray-400 mt-0.5 text-right">{job.location}</p>
          )}
        </div>
      </div>
    </a>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");
  const [category, setCategory] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_category") ?? "" : "");
  const [seniority, setSeniority] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_seniority") ?? "" : "");
  const [usOnly, setUsOnly] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_usOnly") === "true" : false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }

    // Restore notification state from browser permission + localStorage
    if ("Notification" in window) {
      if (Notification.permission === "granted" && localStorage.getItem("notifs") === "on") {
        setNotifStatus("granted");
      } else if (Notification.permission === "denied") {
        setNotifStatus("denied");
      }
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    setError("");
    setShowAll(false);
    fetchJobs(category || undefined, seniority || undefined, usOnly || undefined)
      .then(setJobs)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load jobs.";
        if (msg.includes("401") || msg.includes("403")) {
          localStorage.removeItem("token");
          router.replace("/");
        } else {
          setError(msg);
        }
      })
      .finally(() => setLoading(false));
  }, [router, category, seniority, usOnly]);

  useEffect(() => {
    localStorage.setItem("filter_category", category);
    localStorage.setItem("filter_seniority", seniority);
    localStorage.setItem("filter_usOnly", String(usOnly));
  }, [category, seniority, usOnly]);

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
      localStorage.setItem("notifs", "on");
      setNotifStatus("granted");
    } catch (err) {
      console.error(err);
      setNotifStatus("idle");
    }
  }

  async function handleDisableNotifications() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem("notifs");
    setNotifStatus("idle");
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
              <button
                onClick={handleDisableNotifications}
                className="text-sm text-green-600 hover:text-red-500 font-medium transition-colors"
              >
                Notifications on
              </button>
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

      {/* Filters */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2 flex-wrap">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-gray-400"
          >
            <option value="">All roles</option>
            <option value="technical">Technical</option>
            <option value="product">Product</option>
            <option value="design">Design</option>
            <option value="marketing">Marketing</option>
            <option value="recruiting">Recruiting</option>
            <option value="business">Business</option>
            <option value="leadership">Leadership</option>
            <option value="other">Other</option>
          </select>
          <select
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-gray-400"
          >
            <option value="">All levels</option>
            <option value="intern">Intern</option>
            <option value="early career">Early Career</option>
            <option value="any">Mid-level</option>
            <option value="experienced">Experienced</option>
          </select>
          <button
            onClick={() => setUsOnly(!usOnly)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              usOnly
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            🇺🇸 US only
          </button>
        </div>
      </div>

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
            {(showAll ? jobs : jobs.slice(0, 10)).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {jobs.length > 10 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
              >
                {showAll ? "Show less" : `See ${jobs.length - 10} more`}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
