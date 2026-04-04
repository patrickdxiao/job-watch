import redis
import os
from dotenv import load_dotenv                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                            
load_dotenv()   

client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True
)

def is_new_job(job_id: str) -> bool:
    return client.set(job_id, 1, nx=True, ex=7776000)  # 90 days

def pop_priority_slugs() -> list[str]:
    slugs = []
    while True:
        slug = client.lpop("priority_scrape_queue")
        if slug is None:
            break
        slugs.append(slug)
    return slugs