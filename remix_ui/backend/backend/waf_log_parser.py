import os
import re
from collections import Counter
from pathlib import Path


DEFAULT_NGINX_ACCESS_LOG = Path("/var/log/nginx/access.log")
NGINX_LOG_LINE_PATTERN = re.compile(r"^(?P<source_ip>\S+)\s+.*?\s429(?:\s|$)")


def get_blocked_request_threats(log_path: str | Path | None = None) -> list[dict[str, str | int]]:
    path = Path(log_path or os.getenv("NGINX_ACCESS_LOG", DEFAULT_NGINX_ACCESS_LOG))
    try:
        with path.open("r", encoding="utf-8", errors="replace") as access_log:
            blocked_ips = Counter(
                match.group("source_ip")
                for line in access_log
                if (match := NGINX_LOG_LINE_PATTERN.search(line))
            )
    except OSError:
        return []

    return [
        {
            "source_ip": source_ip,
            "total_blocked_attempts": total_blocked_attempts,
            "perceived_threat_rating": "HIGH",
        }
        for source_ip, total_blocked_attempts in blocked_ips.most_common()
    ]