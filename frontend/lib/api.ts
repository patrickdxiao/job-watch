const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  email: string;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  platform: string;
  logoUrl: string;
};

export type WatchlistEntry = {
  id: number;
  company: Company;
  createdAt: string;
};

export type Job = {
  id: number;
  externalId: string;
  title: string;
  location: string;
  url: string;
  updatedAt: string;
  platform: string;
  company: Company;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  return localStorage.getItem("token") ?? "";
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function fetchJobs(categories?: string[], seniorities?: string[], usOnly?: boolean): Promise<Job[]> {
  const params = new URLSearchParams();
  if (categories?.length) categories.forEach((c) => params.append("category", c));
  if (seniorities?.length) seniorities.forEach((s) => params.append("seniority", s));
  if (usOnly) params.set("usOnly", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${BASE_URL}/api/jobs${query}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function fetchWatchlist(): Promise<WatchlistEntry[]> {
  const res = await fetch(`${BASE_URL}/api/watchlist`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function addToWatchlist(companyId: number): Promise<WatchlistEntry> {
  const res = await fetch(`${BASE_URL}/api/watchlist`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ company_id: companyId }),
  });
  return handleResponse(res);
}

export async function removeFromWatchlist(companyId: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/watchlist/${companyId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const res = await fetch(
    `${BASE_URL}/api/watchlist/search?q=${encodeURIComponent(query)}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

// ─── Preferences ──────────────────────────────────────────────────────────────

export async function fetchPreferences(): Promise<{ categories: string[]; seniorities: string[] }> {
  const res = await fetch(`${BASE_URL}/api/preferences`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function savePreferences(categories: string[], seniorities: string[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/preferences`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ categories, seniorities }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export async function subscribeToPush(subscription: PushSubscriptionJSON): Promise<void> {
  const keys = subscription.keys as { p256dh: string; auth: string };
  const res = await fetch(`${BASE_URL}/api/push/subscribe`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
}
