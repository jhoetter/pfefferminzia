"""List AgentMail inboxes and print a short preview of their newest messages."""

from __future__ import annotations

import argparse
import os
from collections.abc import Mapping
from typing import Any

from agentmail import AgentMail
from dotenv import load_dotenv


def as_mapping(value: Any) -> Mapping[str, Any]:
    """Convert SDK response models to mappings without depending on one SDK version."""
    if isinstance(value, Mapping):
        return value
    if hasattr(value, "model_dump"):
        return value.model_dump(by_alias=True)
    if hasattr(value, "dict"):
        return value.dict(by_alias=True)
    raise TypeError(f"Unsupported AgentMail response type: {type(value).__name__}")


def compact(value: Any, width: int = 300) -> str:
    text = " ".join(str(value or "").split())
    return text if len(text) <= width else f"{text[: width - 1]}…"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inbox", help="Only read this inbox ID/email address")
    parser.add_argument("--limit", type=int, default=10, help="Messages per inbox (default: 10)")
    args = parser.parse_args()

    load_dotenv()
    api_key = os.getenv("AGENTMAIL_API_KEY")
    if not api_key:
        raise SystemExit("AGENTMAIL_API_KEY is missing; copy .env.example to .env and set it.")
    if args.limit < 1 or args.limit > 100:
        raise SystemExit("--limit must be between 1 and 100")

    client = AgentMail(api_key=api_key)
    inbox_response = client.inboxes.list(limit=100)
    inboxes = list(as_mapping(inbox_response).get("inboxes", []))

    if args.inbox:
        inboxes = [item for item in inboxes if as_mapping(item).get("inbox_id") == args.inbox]
        if not inboxes:
            raise SystemExit(f"Inbox not found or not accessible: {args.inbox}")

    if not inboxes:
        print("No AgentMail inboxes found for this API key.")
        return

    print(f"Found {len(inboxes)} inbox(es).")
    for inbox in inboxes:
        inbox_data = as_mapping(inbox)
        inbox_id = str(inbox_data["inbox_id"])
        print(f"\nInbox: {inbox_data.get('display_name') or inbox_id} <{inbox_data.get('email') or inbox_id}>")

        message_response = client.inboxes.messages.list(inbox_id=inbox_id, limit=args.limit)
        messages = list(as_mapping(message_response).get("messages", []))
        print(f"Messages returned: {len(messages)}")

        for index, message in enumerate(messages, start=1):
            data = as_mapping(message)
            body = data.get("extracted_text") or data.get("text") or data.get("preview") or ""
            print(f"\n  {index}. {data.get('subject') or '(no subject)'}")
            print(f"     From: {data.get('from') or '(unknown)'}")
            print(f"     Date: {data.get('timestamp') or data.get('created_at') or '(unknown)'}")
            if body:
                print(f"     Preview: {compact(body)}")


if __name__ == "__main__":
    main()
