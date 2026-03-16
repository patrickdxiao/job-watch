import time
import logging
import os
from dotenv import load_dotenv
from adapters.greenhouse import fetch_jobs as greenhouse_fetch
from adapters.lever import fetch_jobs as lever_fetch
from adapters.ashby import fetch_jobs as ashby_fetch
from redis_client import is_new_job
from kafka_client import publish_job

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

POLL_INTERVAL_SECONDS = int(os.getenv("POLL_INTERVAL_SECONDS", 60))

ADAPTERS = {
    "greenhouse": greenhouse_fetch,
    "lever": lever_fetch,
    "ashby": ashby_fetch,
}

COMPANIES = [
    {"slug": "stripe", "platform": "greenhouse"},
    {"slug": "airbnb", "platform": "greenhouse"},
    {"slug": "reddit", "platform": "greenhouse"},
    {"slug": "notion", "platform": "ashby"},
    {"slug": "ramp", "platform": "ashby"},
]

def scrape_all():
    for company in COMPANIES:
        slug = company["slug"]
        platform = company["platform"]
        fetch_jobs = ADAPTERS[platform]
        logging.info(f"Scraping {slug} ({platform})...")
        try:
            jobs = fetch_jobs(slug)
            new_count = 0
            for job in jobs:
                if is_new_job(job["id"]):
                    publish_job(job)
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
