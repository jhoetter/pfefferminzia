from __future__ import annotations

import pytest

from pfefferminzia import inbox_setup


class FakeInboxes:
    def __init__(self, inboxes):
        self._inboxes = inboxes

    def list(self, limit):
        return {"inboxes": self._inboxes}


class FakeClient:
    def __init__(self, inboxes):
        self.inboxes = FakeInboxes(inboxes)


def test_one_pasted_key_is_enough(tmp_path):
    example = tmp_path / ".env.example"
    example.write_text("AGENTMAIL_API_KEY=\nAGENTMAIL_INBOX_ID=\nWORKSHOP_ALLOWED_RECIPIENTS=dozent@agentmail.to\nWORKSHOP_CHECKPOINT=drill-06-start\n")
    env = tmp_path / ".env"
    pasted = "AGENTMAIL_INBOX_ID=egal\n  AGENTMAIL_API_KEY=am_us_inbox_0123456789abcdef0123\n"
    client = FakeClient([{"inbox_id": "pfm-07@agentmail.to", "email": "pfm-07@agentmail.to"}])
    result = inbox_setup.connect_inbox(pasted, env, example, client)
    assert result == {"connected": True, "inbox": "pfm-07@agentmail.to"}
    text = env.read_text()
    assert "AGENTMAIL_API_KEY=am_us_inbox_0123456789abcdef0123\n" in text
    assert "AGENTMAIL_INBOX_ID=pfm-07@agentmail.to\n" in text
    assert "WORKSHOP_ALLOWED_RECIPIENTS=dozent@agentmail.to" in text
    assert "WORKSHOP_CHECKPOINT=drill-06-start" in text
    assert oct(env.stat().st_mode)[-3:] == "600"


def test_organisation_keys_and_garbage_are_rejected(tmp_path):
    example = tmp_path / ".env.example"
    example.write_text("WORKSHOP_ALLOWED_RECIPIENTS=d@agentmail.to\n")
    with pytest.raises(ValueError, match="am_"):
        inbox_setup.connect_inbox("hallo", tmp_path / ".env", example, FakeClient([]))
    many = FakeClient([{"inbox_id": "a"}, {"inbox_id": "b"}])
    with pytest.raises(ValueError, match="genau eine Inbox"):
        inbox_setup.connect_inbox("am_us_0123456789abcdef0123", tmp_path / ".env", example, many)
