"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  fetchJobs,
  subscribeToPush,
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  searchCompanies,
  fetchPreferences,
  savePreferences,
  toggleMuteCompany,
  type Job,
  type Company,
  type WatchlistEntry,
} from "@/lib/api";

function Dropdown({ values, onChange, options, placeholder }: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function toggle(v: string) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  }

  const label = values.length === 0
    ? placeholder
    : values.length === 1
    ? options.find((o) => o.value === values[0])?.label ?? placeholder
    : `${values.length} selected`;

  const active = values.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 text-xs font-medium border rounded-full px-3 py-1.5 bg-white dark:bg-gray-800 focus:outline-none transition-colors ${active ? "border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-100" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"}`}
      >
        {label}
        <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md py-1 min-w-[148px]">
          {options.map((o) => {
            const selected = values.includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => toggle(o.value)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${selected ? "text-blue-500 font-semibold" : "text-gray-700 dark:text-gray-300"}`}
              >
                <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600"}`}>
                  {selected && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
      className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-7 h-7 flex items-center justify-center">
          {job.company.logoUrl ? (
            <img
              src={job.company.logoUrl}
              alt={job.company.name}
              className="w-7 h-7 rounded object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug line-clamp-2">{job.title}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{job.company.name}</p>
        </div>
        <div className="shrink-0 text-right space-y-0.5">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(job.updatedAt || job.createdAt)}</p>
          {job.location && (() => {
            const locs = job.location.split("; ");
            const display = locs.length > 3
              ? locs.slice(0, 2).join("; ") + `; +${locs.length - 2} more`
              : job.location;
            return <p className="text-[11px] text-gray-400 dark:text-gray-500">{display}</p>;
          })()}
        </div>
      </div>
    </a>
  );
}

function WatchlistCard({
  entry,
  removing,
  muted,
  jobCount,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  selectMode,
  selected,
  onSelect,
  onEnterSelectMode,
}: {
  entry: WatchlistEntry;
  removing: boolean;
  muted: boolean;
  jobCount: number;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  isDragOver: boolean;
  selectMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onEnterSelectMode: () => void;
}) {
  function handleClick() {
    if (selectMode) {
      onSelect();
    } else {
      onEnterSelectMode();
    }
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 select-none transition-colors cursor-pointer ${isDragOver ? "border-t-2 border-blue-400" : ""} ${selected ? "bg-blue-50 dark:bg-blue-950" : ""}`}
      onClick={handleClick}
      draggable={!selectMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"} ${selectMode ? "" : "invisible"}`}>
        {selected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {entry.company.logoUrl ? (
        <img
          src={entry.company.logoUrl}
          alt={entry.company.name}
          className={`w-5 h-5 rounded object-contain shrink-0 ${muted ? "opacity-40" : ""}`}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 shrink-0" />
      )}
      <p className={`text-xs flex-1 truncate ${muted ? "text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"}`}>
        {entry.company.name}
      </p>
      <span className={`text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded-full ${muted ? "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
        {jobCount}
      </span>
    </div>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  function toggle() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <button
      onClick={toggle}
      className={`relative flex items-center w-12 h-6 rounded-full transition-colors shrink-0 ${dark ? "bg-gray-700" : "bg-gray-200"}`}
      aria-label="Toggle dark mode"
    >
      <span className={`absolute flex items-center justify-center w-5 h-5 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-6" : "translate-x-0.5"}`}>
        {dark ? (
          <svg className="w-3 h-3 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        )}
      </span>
    </button>
  );
}

function LoadingDots() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, []);
  return <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-16">Loading jobs{".".repeat(dots)}</p>;
}

export default function JobsPage() {
  const router = useRouter();

  // ── Jobs state ──────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("filter_categories") ?? "[]"); } catch { return []; }
  });
  const [seniorities, setSeniorities] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("filter_seniorities") ?? "[]"); } catch { return []; }
  });
  const [usOnly, setUsOnly] = useState(() => typeof window !== "undefined" ? localStorage.getItem("filter_usOnly") === "true" : false);
  const [showAll, setShowAll] = useState(false);
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "granted" | "denied">("idle");

  // ── Watchlist state ─────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [mutedSlugs, setMutedSlugs] = useState<Set<string>>(new Set());
  const mutedIds = new Set(watchlist.filter((e) => mutedSlugs.has(e.company.slug)).map((e) => e.company.id));
  const watchlistedIds = new Set(watchlist.map((e) => e.company.id));
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }

  function enterSelectModeWith(companyId: number) {
    setSelectMode(true);
    setSelectedIds(new Set([companyId]));
  }

  function toggleSelectOne(companyId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  const allSelected = watchlist.length > 0 && selectedIds.size === watchlist.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(watchlist.map((e) => e.company.id)));
    }
  }

  async function handleBulkHide() {
    const toMute = watchlist.filter((e) => selectedIds.has(e.company.id) && !mutedIds.has(e.company.id));
    for (const entry of toMute) {
      await toggleMuteCompany(entry.company.id).then((prefs) => {
        setMutedSlugs(new Set(prefs.mutedCompanies));
      }).catch(() => {});
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleBulkShow() {
    const toUnmute = watchlist.filter((e) => selectedIds.has(e.company.id) && mutedIds.has(e.company.id));
    for (const entry of toUnmute) {
      await toggleMuteCompany(entry.company.id).then((prefs) => {
        setMutedSlugs(new Set(prefs.mutedCompanies));
      }).catch(() => {});
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function handleBulkRemove() {
    for (const companyId of Array.from(selectedIds)) {
      await handleRemove(companyId);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex.current === null || dragIndex.current === index) {
      setDragOverIndex(null);
      return;
    }
    const next = [...watchlist];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(index, 0, moved);
    setWatchlist(next);
    localStorage.setItem("watchlist_order", JSON.stringify(next.map((e) => e.company.id)));
    dragIndex.current = null;
    setDragOverIndex(null);
  }

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

    fetchPreferences().then((prefs) => {
      if (prefs.categories.length) setCategories(prefs.categories);
      if (prefs.seniorities.length) setSeniorities(prefs.seniorities);
      if (prefs.mutedCompanies?.length) setMutedSlugs(new Set(prefs.mutedCompanies));
    }).catch(() => {});

    fetchWatchlist().then((entries) => {
      const saved = localStorage.getItem("watchlist_order");
      if (saved) {
        const order: number[] = JSON.parse(saved);
        entries.sort((a, b) => {
          const ai = order.indexOf(a.company.id);
          const bi = order.indexOf(b.company.id);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
      }
      setWatchlist(entries);
    }).catch(() => {});
  }, [router]);

  // ── Fetch jobs when filters change ──────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setJobsLoading(true);
    setJobsError("");
    setShowAll(false);
    fetchJobs(categories.length ? categories : undefined, seniorities.length ? seniorities : undefined, usOnly || undefined)
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
  }, [router, categories, seniorities, usOnly]);

  // ── Persist filters ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("filter_categories", JSON.stringify(categories));
    localStorage.setItem("filter_seniorities", JSON.stringify(seniorities));
    localStorage.setItem("filter_usOnly", String(usOnly));
    savePreferences(categories, seniorities).catch(() => {});
  }, [categories, seniorities, usOnly]);

  function handleToggleMute(companyId: number) {
    toggleMuteCompany(companyId).then((prefs) => {
      setMutedSlugs(new Set(prefs.mutedCompanies));
    }).catch(() => {});
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
      fetchJobs(categories.length ? categories : undefined, seniorities.length ? seniorities : undefined, usOnly || undefined).then(setJobs);
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(companyId: number) {
    setActionLoading(companyId);
    try {
      await removeFromWatchlist(companyId);
      setWatchlist((prev) => prev.filter((e) => e.company.id !== companyId));
      fetchJobs(categories.length ? categories : undefined, seniorities.length ? seniorities : undefined, usOnly || undefined).then(setJobs);
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

  function jobCountForCompany(companyId: number): number {
    return jobs.filter((j) => j.company.id === companyId).length;
  }
  const visibleJobs = showAll ? filteredJobs : filteredJobs.slice(0, 10);

  const jobsListRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = jobsListRef.current;
    if (!el) return;
    setPanelHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => {
      setPanelHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleJobs]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 shrink-0">JobWatch</h1>
          <div className="flex items-center gap-2 flex-1">
            <Dropdown
              values={categories}
              onChange={setCategories}
              placeholder="All roles"
              options={[
                { label: "Technical", value: "technical" },
                { label: "Product", value: "product" },
                { label: "Design", value: "design" },
                { label: "Marketing", value: "marketing" },
                { label: "Recruiting", value: "recruiting" },
                { label: "Business", value: "business" },
                { label: "Leadership", value: "leadership" },
                { label: "Other", value: "other" },
              ]}
            />
            <Dropdown
              values={seniorities}
              onChange={setSeniorities}
              placeholder="All levels"
              options={[
                { label: "Intern", value: "intern" },
                { label: "Early Career", value: "early career" },
                { label: "Mid-level", value: "mid-level" },
                { label: "Experienced", value: "experienced" },
              ]}
            />
            <button
              onClick={() => setUsOnly(!usOnly)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${usOnly ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"}`}
            >
              🇺🇸 US only
            </button>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {notifStatus === "granted" ? (
              <button onClick={handleDisableNotifications} className="text-xs font-medium text-green-600 hover:text-red-500 transition-colors">
                Notifications on
              </button>
            ) : (
              <button onClick={handleEnableNotifications} disabled={notifStatus === "loading" || notifStatus === "denied"} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors">
                {notifStatus === "loading" ? "Enabling…" : notifStatus === "denied" ? "Blocked" : "Enable notifications"}
              </button>
            )}
            <button onClick={handleLogout} className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Log out
            </button>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-8">
        {/* Job count */}
        <div className="max-w-2xl mb-3 min-h-[1.25rem]">
          {!jobsLoading && !jobsError && filteredJobs.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} from your watchlist</p>
          )}
        </div>

        <div className="flex gap-6 items-start">

        {/* ── Left: Jobs feed ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 max-w-2xl">

          {/* States */}
          {jobsLoading && <LoadingDots />}
          {!jobsLoading && jobsError && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-xl px-5 py-4 text-xs text-red-700 dark:text-red-400">{jobsError}</div>
          )}
          {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
            <div className="text-center py-20">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">No jobs yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Add companies to your watchlist and check back soon.</p>
            </div>
          )}

          {/* Job cards */}
          {!jobsLoading && !jobsError && filteredJobs.length > 0 && (
            <div className="space-y-1.5">
              <div ref={jobsListRef} className="space-y-1.5">
                {visibleJobs.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
              {filteredJobs.length > 10 && (
                <button onClick={() => setShowAll(!showAll)} className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  {showAll ? "Show less" : `See ${filteredJobs.length - 10} more`}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Watchlist panel ──────────────────────────────────────── */}
        <div className="w-60 shrink-0 sticky top-16 flex flex-col overflow-hidden" style={panelHeight ? { height: `${panelHeight}px` } : {}}>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Watchlist</p>
            </div>

            {/* Search */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Add a company…"
              className="w-full px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 mb-2 placeholder:text-gray-400 dark:placeholder:text-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />

            {/* Select all + bulk actions */}
            {selectMode && (
              <div className="mb-2 space-y-1">
                <div className="flex items-center justify-between px-1 py-1">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-left"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${allSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"}`}>
                      {allSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[11px] text-gray-600 dark:text-gray-400">Select all</span>
                  </button>
                  <button
                    onClick={toggleSelectMode}
                    className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex gap-2 px-1 pt-1 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleBulkHide}
                      className="text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      Hide jobs
                    </button>
                    <span className="text-gray-200 dark:text-gray-700">|</span>
                    <button
                      onClick={handleBulkShow}
                      className="text-[11px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                      Show jobs
                    </button>
                    <span className="text-gray-200 dark:text-gray-700">|</span>
                    <button
                      onClick={handleBulkRemove}
                      className="text-[11px] text-red-500 hover:text-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Search results */}
            {searchLoading && <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 mb-2">Searching…</p>}
            {!searchLoading && searchResults.length > 0 && (
              <div className="border border-gray-100 dark:border-gray-800 rounded-lg mb-2 overflow-hidden">
                {searchResults.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => !watchlistedIds.has(company.id) && handleAdd(company)}
                    disabled={watchlistedIds.has(company.id) || actionLoading === company.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-5 h-5 rounded object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-5 h-5 rounded bg-gray-100 dark:bg-gray-800 shrink-0" />
                    )}
                    <span className="truncate text-xs text-gray-700 dark:text-gray-300">{company.name}</span>
                    {watchlistedIds.has(company.id) && <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Added</span>}
                  </button>
                ))}
              </div>
            )}
            {!searchLoading && query.trim() && searchResults.length === 0 && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-1 mb-2">Not found — try exact slug (e.g. "figma")</p>
            )}

            {/* Watchlist companies */}
            <div className="space-y-0.5 overflow-y-auto flex-1">
              {watchlist.length === 0 && !query && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 px-2 py-2">No companies yet.</p>
              )}
              {watchlist.map((entry, index) => (
                <WatchlistCard
                  key={entry.id}
                  entry={entry}
                  removing={actionLoading === entry.company.id}
                  muted={mutedIds.has(entry.company.id)}
                  jobCount={jobCountForCompany(entry.company.id)}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  isDragOver={dragOverIndex === index}
                  selectMode={selectMode}
                  selected={selectedIds.has(entry.company.id)}
                  onSelect={() => toggleSelectOne(entry.company.id)}
                  onEnterSelectMode={() => enterSelectModeWith(entry.company.id)}
                />
              ))}
            </div>
          </div>
        </div>

        </div> {/* end flex row */}
      </div>
    </main>
  );
}
