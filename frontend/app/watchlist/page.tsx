"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  searchCompanies,
  type Company,
  type WatchlistEntry,
} from "@/lib/api";

// ─── Small sub-components ────────────────────────────────────────────────────

function CompanyRow({
  company,
  actionLabel,
  actionClasses,
  onAction,
  loading,
}: {
  company: Company;
  actionLabel: string;
  actionClasses: string;
  onAction: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{company.name}</p>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${actionClasses}`}
      >
        {loading ? "…" : actionLabel}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const router = useRouter();

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [searchResults, setSearchResults] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState("");

  // IDs already on the watchlist — used to hide "Add" for companies already added
  const watchlistedIds = new Set(watchlist.map((e) => e.company.id));

  // ── Load watchlist on mount ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/");
      return;
    }

    fetchWatchlist()
      .then(setWatchlist)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load watchlist.";
        if (msg.includes("401") || msg.includes("403")) {
          localStorage.removeItem("token");
          router.replace("/");
        } else {
          setError(msg);
        }
      })
      .finally(() => setPageLoading(false));
  }, [router]);

  // ── Search ───────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchCompanies(q);
      setSearchResults(results);
    } catch {
      // silently ignore search errors
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  // ── Add ──────────────────────────────────────────────────────────────────
  async function handleAdd(company: Company) {
    setActionLoading(company.id);
    try {
      const entry = await addToWatchlist(company.id);
      setWatchlist((prev) => [...prev, entry]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add company.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Remove ───────────────────────────────────────────────────────────────
  async function handleRemove(companyId: number) {
    setActionLoading(companyId);
    try {
      await removeFromWatchlist(companyId);
      setWatchlist((prev) => prev.filter((e) => e.company.id !== companyId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove company.");
    } finally {
      setActionLoading(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/jobs" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Watchlist</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Search section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Add companies
          </h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by company slug (e.g. stripe, figma, notion)…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
          />

          {searchLoading && (
            <p className="text-sm text-gray-400 px-1">Searching…</p>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 divide-y divide-gray-100">
              {searchResults.map((company) => {
                const alreadyAdded = watchlistedIds.has(company.id);
                return alreadyAdded ? (
                  <div
                    key={company.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-medium px-3 py-1">
                      Added
                    </span>
                  </div>
                ) : (
                  <CompanyRow
                    key={company.id}
                    company={company}
                    actionLabel="Add"
                    actionClasses="bg-blue-600 hover:bg-blue-700 text-white"
                    onAction={() => handleAdd(company)}
                    loading={actionLoading === company.id}
                  />
                );
              })}
            </div>
          )}

          {!searchLoading && query.trim() && searchResults.length === 0 && (
            <p className="text-sm text-gray-400 px-1">
              Not supported — try a different slug (e.g. &quot;figma&quot; not &quot;Figma Inc&quot;).
            </p>
          )}
        </section>

        {/* Current watchlist */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Your watchlist
          </h2>

          {pageLoading && (
            <p className="text-sm text-gray-400">Loading…</p>
          )}

          {!pageLoading && watchlist.length === 0 && (
            <p className="text-sm text-gray-400">
              You are not watching any companies yet. Search above to add one.
            </p>
          )}

          {!pageLoading && watchlist.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-4">
              {watchlist.map((entry) => (
                <CompanyRow
                  key={entry.id}
                  company={entry.company}
                  actionLabel="Remove"
                  actionClasses="text-red-600 hover:bg-red-50 border border-red-200"
                  onAction={() => handleRemove(entry.company.id)}
                  loading={actionLoading === entry.company.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
