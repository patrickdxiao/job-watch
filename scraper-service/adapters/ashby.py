import requests

BASE_URL = "https://api.ashbyhq.com/posting-api/job-board/{slug}"

def fetch_jobs(company_slug: str) -> list[dict]:
    url = BASE_URL.format(slug=company_slug)
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    jobs = response.json().get("jobs", [])

    return [
        {
            "id": f"ashby-{job['id']}",
            "title": job["title"],
            "location": job.get("location", "Unknown"),
            "url": job["jobUrl"],
            "updated_at": job.get("publishedAt", "Unknown"),
            "platform": "ashby",
            "company_slug": company_slug,
        }
        for job in jobs
    ]
