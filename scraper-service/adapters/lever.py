import requests
from datetime import datetime, timezone

BASE_URL = "https://api.lever.co/v0/postings/{slug}"

def fetch_jobs(company_slug: str) -> list[dict]:
    url = BASE_URL.format(slug=company_slug)
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    jobs = response.json()

    return [
        {
            "id": f"lever-{job['id']}",
            "title": job["text"],
            "location": job.get("categories", {}).get("location", "Unknown"),
            "url": job["hostedUrl"],
            "updated_at": datetime.fromtimestamp(job["createdAt"] / 1000, tz=timezone.utc).isoformat(),
            "platform": "lever",
            "company_slug": company_slug,
        }
        for job in jobs
    ]
