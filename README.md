# JobWatch

Real-time job alert platform. Watchlist companies and get push notifications within 60 seconds of a new posting on Greenhouse, Lever, or Ashby.

**Live:** https://jobwatch.duckdns.org

---

## Stack & Structure

Java · Spring Boot · Python · Next.js · TypeScript · PostgreSQL · Redis · Docker · AWS EC2

```
job-watch/
├── api-service/          # Java / Spring Boot — REST API, JWT auth, watchlist, job storage
├── scraper-service/      # Python — polls ATS APIs every 60s, deduplicates via Redis
├── notification-service/ # Java / Spring Boot — sends Web Push notifications
├── frontend/             # Next.js — auth, watchlist UI, jobs feed
├── docker-compose.yml    # Orchestrates all services + Redis + PostgreSQL
└── docs/                 # Architecture decisions, data model, service breakdown
```

---

## Features

- Push notifications within 60 seconds of a new job posting, even when the browser tab is closed
- Covers companies hiring on Greenhouse, Lever, or Ashby
- Watchlist — add/remove companies, drag to reorder, mute individual companies
- Jobs feed — browse all postings from your watched companies in one place
- Filters — by job category, seniority level, and US-only; saved and restored across sessions
- Notifications respect your filters — only get alerted for roles that match your preferences

---

## Running Locally

**Prerequisites:** Docker, Docker Compose

```bash
git clone https://github.com/Patrick57761/job-watch.git
cd job-watch
docker-compose up --build
```

Frontend → http://localhost:3000 · API → http://localhost:8080

> Push notifications require HTTPS and will not work on localhost.
