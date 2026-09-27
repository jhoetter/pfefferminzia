"""Connect a participant's personal inbox from one value: the inbox-scoped key.

The key sees exactly one inbox, so the inbox address follows from it. The
reply allowlist is the same for everyone and comes from the repository default.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .agentmail_service import _mapping, _value
from .constants import ROOT
from .runtime_config import reload_agentmail_environment_if_changed

ENV_PATH = ROOT / ".env"
EXAMPLE_PATH = ROOT / ".env.example"
KEY_PATTERN = re.compile(r"am_[A-Za-z0-9_]{16,}")


def ensure_env_file(env_path: Path = ENV_PATH, example_path: Path = EXAMPLE_PATH) -> bool:
    """Create `.env` from `.env.example` (mode 600) when it does not exist yet."""
    if env_path.exists():
        return False
    env_path.write_text(example_path.read_text(encoding="utf-8"), encoding="utf-8")
    env_path.chmod(0o600)
    return True


def _set_values(env_path: Path, values: dict[str, str]) -> None:
    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    seen: set[str] = set()
    updated = []
    for line in lines:
        name = line.strip().partition("=")[0].strip()
        if name in values and not line.lstrip().startswith("#"):
            if name not in seen:
                updated.append(f"{name}={values[name]}")
                seen.add(name)
            continue
        updated.append(line)
    updated += [f"{name}={value}" for name, value in values.items() if name not in seen]
    env_path.write_text("\n".join(updated) + "\n", encoding="utf-8")
    env_path.chmod(0o600)


def connect_inbox(text: str, env_path: Path = ENV_PATH, example_path: Path = EXAMPLE_PATH, client: Any = None) -> dict[str, Any]:
    """Accept the pasted key (or the whole pasted block), find its inbox and write `.env`."""
    match = KEY_PATTERN.search(text or "")
    if not match:
        raise ValueError("Kein Workshop-Schlüssel gefunden – er beginnt mit „am_“.")
    api_key = match.group(0)
    if client is None:
        from agentmail import AgentMail

        client = AgentMail(api_key=api_key)
    try:
        inboxes = _value(_mapping(client.inboxes.list(limit=10)), "inboxes", default=[]) or []
    except Exception as error:
        raise ValueError("Der Schlüssel wurde von AgentMail nicht angenommen. Bitte genau vom Zettel kopieren.") from error
    if len(inboxes) != 1:
        raise ValueError("Das ist kein persönlicher Workshop-Schlüssel (er sieht nicht genau eine Inbox).")
    inbox = _mapping(inboxes[0])
    inbox_id = str(_value(inbox, "inbox_id", "inboxId"))
    ensure_env_file(env_path, example_path)
    values = {"AGENTMAIL_API_KEY": api_key, "AGENTMAIL_INBOX_ID": inbox_id}
    from dotenv import dotenv_values

    if not (dotenv_values(env_path).get("WORKSHOP_ALLOWED_RECIPIENTS") or "").strip():
        values["WORKSHOP_ALLOWED_RECIPIENTS"] = dotenv_values(example_path).get("WORKSHOP_ALLOWED_RECIPIENTS") or ""
    _set_values(env_path, values)
    reload_agentmail_environment_if_changed()
    return {"connected": True, "inbox": str(_value(inbox, "email", default=inbox_id))}
