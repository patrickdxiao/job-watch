import time
import logging
import os
import requests
import schedule
from dotenv import load_dotenv
from adapters.greenhouse import fetch_jobs as greenhouse_fetch
from adapters.lever import fetch_jobs as lever_fetch
from adapters.ashby import fetch_jobs as ashby_fetch
from redis_client import is_new_job, pop_priority_slugs
from classifier import classify_job

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", 60))
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:8081")

ADAPTERS = {
    "greenhouse": greenhouse_fetch,
    "lever": lever_fetch,
    "ashby": ashby_fetch,
}

def fetch_companies():
    try:
        response = requests.get(f"{API_BASE_URL}/internal/companies", timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logging.error(f"Failed to fetch companies: {e}")
        return []

def has_subscribers(slug: str) -> bool:
    try:
        response = requests.get(f"{API_BASE_URL}/api/push/internal/subscriptions?companySlug={slug}", timeout=5)
        return len(response.json()) > 0
    except Exception:
        return True  # if check fails, default to scraping

def ingest_job(job: dict, category: str, seniority: str):
    try:
        response = requests.post(
            f"{API_BASE_URL}/internal/jobs",
            json={
                "externalId": job["id"],
                "title": job["title"],
                "location": job["location"],
                "url": job["url"],
                "updatedAt": job["updated_at"],
                "platform": job["platform"],
                "companySlug": job["company_slug"],
                "category": category,
                "seniority": seniority,
            },
            timeout=5
        )
        response.raise_for_status()
    except Exception as e:
        logging.error(f"Failed to ingest job {job['id']}: {e}")

def notify_new_job(company_slug: str, company_name: str, company_logo: str, job_title: str, job_url: str, category: str, seniority: str):
    try:
        requests.post(
            f"{NOTIFICATION_SERVICE_URL}/internal/notify",
            json={
                "companySlug": company_slug,
                "companyName": company_name,
                "companyLogo": company_logo,
                "jobTitle": job_title,
                "jobUrl": job_url,
                "category": category,
                "seniority": seniority,
            },
            timeout=5
        )
    except Exception as e:
        logging.error(f"Failed to notify for {company_slug}: {e}")

def scrape_company(company: dict):
    slug = company["slug"]
    platform = company["platform"]
    company_name = company.get("name", slug)
    company_logo = company.get("logoUrl", "")
    fetch_jobs = ADAPTERS[platform]
    logging.info(f"Scraping {slug} ({platform})...")
    try:
        jobs = fetch_jobs(slug)
        new_count = 0
        for job in jobs:
            if is_new_job(job["id"]):
                classification = classify_job(job["title"])
                ingest_job(job, classification["category"], classification["seniority"])
                notify_new_job(slug, company_name, company_logo, job["title"], job["url"], classification["category"], classification["seniority"])
                new_count += 1
        logging.info(f"{slug}: {new_count} new jobs published out of {len(jobs)} total")
    except Exception as e:
        logging.error(f"Failed to scrape {slug}: {e}")

def scrape_all():
    companies = fetch_companies()
    company_by_slug = {c["slug"]: c for c in companies}

    priority_slugs = pop_priority_slugs()
    for slug in priority_slugs:
        if slug in company_by_slug:
            logging.info(f"Priority scrape: {slug}")
            scrape_company(company_by_slug[slug])

    for company in companies:
        if not has_subscribers(company["slug"]):
            logging.info(f"Skipping {company['slug']} — no subscribers")
            continue
        scrape_company(company)

def cleanup_stale_jobs():
    logging.info("Running weekly stale job cleanup...")
    companies = fetch_companies()
    for company in companies:
        slug = company["slug"]
        platform = company["platform"]
        fetch_jobs = ADAPTERS[platform]
        try:
            live_jobs = fetch_jobs(slug)
            live_ids = [job["id"] for job in live_jobs]

            stored_response = requests.get(
                f"{API_BASE_URL}/internal/jobs/external-ids",
                params={"companySlug": slug},
                timeout=5
            )
            stored_response.raise_for_status()
            stored_ids = stored_response.json()

            stale_ids = [id for id in stored_ids if id not in set(live_ids)]
            if stale_ids:
                requests.delete(
                    f"{API_BASE_URL}/internal/jobs/stale",
                    params={"companySlug": slug},
                    json=live_ids,
                    timeout=5
                ).raise_for_status()
                logging.info(f"{slug}: removed {len(stale_ids)} stale jobs")
            else:
                logging.info(f"{slug}: no stale jobs")
        except Exception as e:
            logging.error(f"Stale cleanup failed for {slug}: {e}")
    logging.info("Stale job cleanup complete.")

if __name__ == "__main__":
    logging.info("Scraper started")

    # Saturday 10pm EST = Sunday 03:00 UTC (server runs UTC)
    schedule.every().sunday.at("03:00").do(cleanup_stale_jobs)

    while True:
        schedule.run_pending()
        scrape_all()
        logging.info(f"Sleeping {POLL_INTERVAL_SECONDS}s...")
        time.sleep(POLL_INTERVAL_SECONDS)
