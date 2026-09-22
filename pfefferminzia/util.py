from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def nullable(value: Any) -> str | None:
    return None if value is None or value == "" else str(value)


def as_bool(value: Any) -> bool:
    return value is True or value == 1 or str(value).lower() == "true"


def camelize_dict(data: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    return {mapping.get(key, key): value for key, value in data.items()}
