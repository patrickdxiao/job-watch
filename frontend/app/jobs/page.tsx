"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchJobs,
  subscribeToPush,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  searchCompanies,
  type Job,
  type Company,
  type WatchlistEntry,
} from "@/lib/api";

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
      className="block bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all"
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

function WatchlistCard({
  entry,
  onRemove,
  removing,
  muted,
  onToggleMute,
}: {
  entry: WatchlistEntry;
  onRemove: () => void;
  removing: boolean;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  function handleContextMenu(e: React.MouseEvent) {
    setMenu({ x: e.clientX, y: e.clientY });
  }

  useEffect(() => {
    if (!menu) return;
    function close() { setMenu(null); }
    const timer = setTimeout(() => window.addEventListener("click", close), 0);
    return () => { clearTimeout(timer); window.removeEventListener("click", close); };
  }, [menu]);

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none"
        onClick={handleContextMenu}
      >
        {entry.company.logoUrl ? (
          <img
            src={entry.company.logoUrl}
            alt={entry.company.name}
            className={`w-6 h-6 rounded object-contain shrink-0 ${muted ? "opacity-40" : ""}`}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-6 h-6 rounded bg-gray-100 shrink-0" />
        )}
        <p className={`text-sm flex-1 truncate ${muted ? "text-gray-400" : "text-gray-800"}`}>
          {entry.company.name}
        </p>
      </div>

      {menu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] text-sm"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            onClick={() => { onToggleMute(); setMenu(null); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700"
          >
            {muted ? "Show jobs" : "Hide jobs"}
          </button>
          <button
            onClick={() => { onRemove(); setMenu(null); }}
            disabled={removing}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500 disabled:opacity-50"
          >
            Remove from watchlist
          </button>
        </div>
      )}
    </>
  );
}

export default function JobsPage() {
  const router = useRouter();

  // ── Jobs state ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [category, setCategory] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_category") ?? "" : "");
  const [seniority, setSeniority] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_seniority") ?? "" : "");
  const [usOnly, setUsOnly] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_usOnly") === "true" : false);
  const [showAll, setShowAll] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  // ── Watchlist state ─────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [mutedIds, setMutedIds] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = localStorage.getItem("muted_companies");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const watchlistedIds = new Set(watchlist.map((e) => e.company.id));

  // ── Auth + initial load ─────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/"); return; }

    if ("Notification" in window) {
      if (Notification.permission === "granted" && localStorage.getItem("notifs") === "on") {
        setNotifStatus("granted");
      } else if (Notification.permission === "denied") {
        setNotifStatus("denied");
      }
    }

    fetchWatchlist().then(setWatchlist).catch(() => {});
  }, [router]);

  // ── Fetch jobs when filters change ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setJobsLoading(true);
    setJobsError("");
    setShowAll(false);
    fetchJobs(category || undefined, seniority || undefined, usOnly || undefined)
      .then(setJobs)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load jobs.";
        if (msg.includes("401") || msg.includes("403")) {
          localStorage.removeItem("token");
          router.replace("/");
        } else {
          setJobsError(msg);
        }
      })
      .finally(() => setJobsLoading(false));
  }, [router, category, seniority, usOnly]);

  // ── Persist filters ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("filter_category", category);
    localStorage.setItem("filter_seniority", seniority);
    localStorage.setItem("filter_usOnly", String(usOnly));
  }, [category, seniority, usOnly]);

  useEffect(() => {
    localStorage.setItem("muted_companies", JSON.stringify([...mutedIds]));
  }, [mutedIds]);

  function handleToggleMute(companyId: number) {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      setSearchResults(await searchCompanies(q));
    } catch { /* ignore */ } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // ── Add / Remove ────────────────────────────────────────────────────────
  async function handleAdd(company: Company) {
    setActionLoading(company.id);
    try {
      const entry = await addToWatchlist(company.id);
      setWatchlist((prev) => [...prev, entry]);
      setQuery("");
      setSearchResults([]);
      fetchJobs(category || undefined, seniority || undefined, usOnly || undefined).then(setJobs);
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(companyId: number) {
    setActionLoading(companyId);
    try {
      await removeFromWatchlist(companyId);
      setWatchlist((prev) => prev.filter((e) => e.company.id !== companyId));
      fetchJobs(category || undefined, seniority || undefined, usOnly || undefined).then(setJobs);
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  }

  // ── Notifications ───────────────────────────────────────────────────────
  async function handleEnableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push notifications are not supported in this browser.");
      return;
    }
    setNotifStatus("loading");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setNotifStatus("denied"); return; }
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
    } catch { /* ignore */ }
    localStorage.removeItem("notifs");
    setNotifStatus("idle");
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.replace("/");
  }

  const filteredJobs = jobs.filter((j) => !mutedIds.has(j.company.id));
  const visibleJobs = showAll ? filteredJobs : filteredJobs.slice(0, 10);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">JobWatch</h1>
          <div className="flex items-center gap-3">
            {notifStatus === "granted" ? (
              <button onClick={handleDisableNotifications} className="text-sm text-green-600 hover:text-red-500 font-medium transition-colors">
                Notifications on
              </button>
            ) : (
              <button onClick={handleEnableNotifications} disabled={notifStatus === "loading" || notifStatus === "denied"} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">
                {notifStatus === "loading" ? "Enabling…" : notifStatus === "denied" ? "Blocked" : "Enable Notifications"}
              </button>
            )}
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 flex gap-6 items-start">

        {/* ── Left: Jobs feed ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 max-w-2xl">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap mb-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-gray-400">
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
            <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-white focus:outline-none focus:border-gray-400">
              <option value="">All levels</option>
              <option value="intern">Intern</option>
              <option value="early career">Early Career</option>
              <option value="mid-level">Mid-level</option>
              <option value="experienced">Experienced</option>
            </select>
            <button onClick={() => setUsOnly(!usOnly)} className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${usOnly ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
              🇺🇸 US only
            </button>
          </div>

          {/* Job count */}
          {!jobsLoading && !jobsError && filteredJobs.length > 0 && (
            <p className="text-sm text-gray-500 mb-3">{filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} from your watchlist</p>
          )}

          {/* States */}
          {jobsLoading && <p className="text-center text-gray-400 text-sm py-16">Loading jobs…</p>}
          {!jobsLoading && jobsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{jobsError}</div>
          )}
          {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-medium text-gray-500 mb-1">No jobs yet</p>
              <p className="text-sm">Add companies to your watchlist and check back soon.</p>
            </div>
          )}

          {/* Job cards */}
          {!jobsLoading && !jobsError && filteredJobs.length > 0 && (
            <div className="space-y-1.5">
              {visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}
              {filteredJobs.length > 10 && (
                <button onClick={() => setShowAll(!showAll)} className="w-full text-sm text-gray-500 hover:text-gray-700 py-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                  {showAll ? "Show less" : `See ${filteredJobs.length - 10} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Watchlist panel ──────────────────────────────────────── */}
        <div className="w-64 shrink-0 sticky top-20">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Watchlist</p>

            {/* Search */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add a company…"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 mb-2"
            />

            {/* Search results */}
            {searchLoading && <p className="text-xs text-gray-400 px-1 mb-2">Searching…</p>}
            {!searchLoading && searchResults.length > 0 && (
              <div className="border border-gray-100 rounded-lg mb-2 overflow-hidden">
                {searchResults.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => !watchlistedIds.has(company.id) && handleAdd(company)}
                    disabled={watchlistedIds.has(company.id) || actionLoading === company.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 text-sm"
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-5 h-5 rounded object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-5 h-5 rounded bg-gray-100 shrink-0" />
                    )}
                    <span className="truncate">{company.name}</span>
                    {watchlistedIds.has(company.id) && <span className="ml-auto text-xs text-gray-400">Added</span>}
                  </button>
                ))}
              </div>
            )}
            {!searchLoading && query.trim() && searchResults.length === 0 && (
              <p className="text-xs text-gray-400 px-1 mb-2">Not found — try exact slug (e.g. "figma")</p>
            )}

            {/* Watchlist companies */}
            <div className="space-y-0.5">
              {watchlist.length === 0 && !query && (
                <p className="text-xs text-gray-400 px-3 py-2">No companies yet.</p>
              )}
              {watchlist.map((entry) => (
                <WatchlistCard
                  key={entry.id}
                  entry={entry}
                  onRemove={() => handleRemove(entry.company.id)}
                  removing={actionLoading === entry.company.id}
                  muted={mutedIds.has(entry.company.id)}
                  onToggleMute={() => handleToggleMute(entry.company.id)}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
