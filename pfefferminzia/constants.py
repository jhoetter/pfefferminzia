from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT / ".data" / "pfefferminzia.db"

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
