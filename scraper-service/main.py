import time
import logging
import os
import requests
from dotenv import load_dotenv
from adapters.greenhouse import fetch_jobs as greenhouse_fetch
from adapters.lever import fetch_jobs as lever_fetch
from adapters.ashby import fetch_jobs as ashby_fetch
from redis_client import is_new_job

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

def ingest_job(job: dict):
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
            },
            timeout=5
        )
        response.raise_for_status()
    except Exception as e:
        logging.error(f"Failed to ingest job {job['id']}: {e}")

def notify_new_job(company_slug: str):
    try:
        requests.post(
            f"{NOTIFICATION_SERVICE_URL}/internal/notify",
            json={"companySlug": company_slug},
            timeout=5
        )
    except Exception as e:
        logging.error(f"Failed to notify for {company_slug}: {e}")

def scrape_all():
    for company in fetch_companies():
        slug = company["slug"]
        platform = company["platform"]
        fetch_jobs = ADAPTERS[platform]
        logging.info(f"Scraping {slug} ({platform})...")
        try:
            jobs = fetch_jobs(slug)
            new_count = 0
            for job in jobs:
                if is_new_job(job["id"]):
                    ingest_job(job)
                    notify_new_job(slug)
                    new_count += 1
            logging.info(f"{slug}: {new_count} new jobs published out of {len(jobs)} total")
        except Exception as e:
            logging.error(f"Failed to scrape {slug}: {e}")

if __name__ == "__main__":
    logging.info("Scraper started")
    while True:
        scrape_all()
        logging.info(f"Sleeping {POLL_INTERVAL_SECONDS}s...")
        time.sleep(POLL_INTERVAL_SECONDS)
