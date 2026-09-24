from __future__ import annotations

import hashlib
import os
from pathlib import Path

from dotenv import dotenv_values

from .constants import ROOT


ENV_PATH = ROOT / ".env"
AGENTMAIL_SETTINGS = ("AGENTMAIL_API_KEY", "AGENTMAIL_INBOX_ID", "WORKSHOP_ALLOWED_RECIPIENTS")


def _signature(path: Path) -> str | None:
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


_last_signature = _signature(ENV_PATH)
_last_file_keys = set(dotenv_values(ENV_PATH)) & set(AGENTMAIL_SETTINGS) if ENV_PATH.is_file() else set()


def reload_agentmail_environment_if_changed() -> bool:
    """Hot-reload only inbox settings; never change checkpoint or auto-send policy.

    The MCP tool registry and background dispatch policy are fixed for a
    worktree. AgentMail credentials are safe to refresh after editing `.env`.
    """
    global _last_signature, _last_file_keys

    current_signature = _signature(ENV_PATH)
    if current_signature == _last_signature:
        return False

    values = dotenv_values(ENV_PATH) if ENV_PATH.is_file() else {}
    new_keys = set(values) & set(AGENTMAIL_SETTINGS)
    for name in AGENTMAIL_SETTINGS:
        if name in new_keys:
            os.environ[name] = values[name] or ""
        elif name in _last_file_keys:
            os.environ.pop(name, None)
    _last_file_keys = new_keys
    _last_signature = current_signature
    return True
