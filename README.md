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

## Running Locally

**Prerequisites:** Docker, Docker Compose

```bash
git clone https://github.com/Patrick57761/job-watch.git
cd job-watch
docker-compose up --build
```

Frontend → http://localhost:3000 · API → http://localhost:8080

> Push notifications require HTTPS and will not work on localhost.
