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
            "location": _resolve_location(job),
            "url": job["jobUrl"],
            "updated_at": job.get("publishedAt", "Unknown"),
            "platform": "ashby",
            "company_slug": company_slug,
        }
        for job in jobs
    ]

def _resolve_location(job: dict) -> str:
    workplace = job.get("workplaceType", "")
    is_remote = job.get("isRemote")

    address = job.get("address", {}).get("postalAddress", {})
    city = address.get("addressLocality", "")
    region = address.get("addressRegion", "")
    country = address.get("addressCountry", "")

    if is_remote or workplace == "Remote":
        if country:
            return f"Remote, {country}"
        return "Remote"

    parts = [p for p in [city, region, country] if p]
    if parts:
        location = ", ".join(parts)
        if workplace == "Hybrid":
            return f"{location} (Hybrid)"
        return location

    return job.get("location", "Unknown")
