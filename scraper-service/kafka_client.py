import json
import os
from dotenv import load_dotenv
from kafka import KafkaProducer

load_dotenv()

_producer = None

def _get_producer():
    global _producer
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
            value_serializer=lambda v: json.dumps(v).encode("utf-8")
        )
    return _producer

def publish_job(job: dict):
    _get_producer().send("jobs.new", value=job)
