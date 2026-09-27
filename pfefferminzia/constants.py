from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _state_root(code_root: Path) -> Path:
    """Where the key (.env) and the cases (.data) live.

    The Claude app may run a session in its own copy under
    `<folder>/.claude/worktrees/<name>`. That copy has the code but not the
    participant's key or cases, and it disappears when the session is cleaned
    up, so it shares both with the folder it was made from. Checkpoint folders
    (siblings such as `pfefferminzia-drill-07-…`) keep their own state.
    """
    if code_root.parent.name == "worktrees" and code_root.parent.parent.name == ".claude":
        main = code_root.parent.parent.parent
        if (main / ".git").exists():
            return main
    return code_root


STATE_ROOT = _state_root(ROOT)
DEFAULT_DB_PATH = STATE_ROOT / ".data" / "pfefferminzia.db"

TICKET_STATUSES = ("new", "in_progress", "awaiting_human", "scheduled", "sent", "closed")
PRODUCT_LINES = ("unknown", "liability", "life")
CATEGORIES = (
    "unknown",
    "general_question",
    "coverage_question",
    "claim",
    "contract_change",
    "cancellation",
    "complaint",
)
PRIORITIES = ("low", "normal", "high", "urgent")
CLAIM_STATUSES = (
    "new",
    "triage",
    "awaiting_information",
    "awaiting_human",
    "investigation",
    "approved",
    "settled",
    "closed",
)
CLAIM_ACTIONS = ("PAY", "DENY", "REQUEST_INFORMATION", "ESCALATE_COMPLEX", "REFER_SIU")
RISK_LEVELS = ("low", "medium", "high", "critical")
TICKET_ROLES = ("CORRESPONDENT", "VERSICHERUNGSNEHMER", "VERSICHERTE_PERSON", "GESCHAEDIGTER", "VERTRETER")
