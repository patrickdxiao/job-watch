import requests

BASE_URL = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs"

def fetch_jobs(company_slug: str) -> list[dict]:
    url = BASE_URL.format(slug=company_slug)
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    jobs = response.json().get("jobs", [])

    return [
        {
            "id": f"greenhouse-{job['id']}",
            "title": job["title"],
            "location": _resolve_location(job),
            "url": job["absolute_url"],
            "updated_at": job["updated_at"],
            "platform": "greenhouse",
            "company_slug": company_slug,
        }
        for job in jobs
    ]

def _resolve_location(job: dict) -> str:
    display = job.get("location", {}).get("name", "Unknown")
    vague = {"hybrid", "remote", "unknown", ""}
    if display.lower().strip() in vague:
        for meta in job.get("metadata", []):
            if meta.get("name") == "Job Posting Location" and meta.get("value"):
                locations = [_shorten(loc) for loc in meta["value"]]
                return "; ".join(locations)
    return display

def _shorten(location: str) -> str:
    return location.replace(", United States", "").replace(", US", ", US").strip()
