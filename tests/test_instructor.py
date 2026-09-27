from __future__ import annotations

import pytest

from pfefferminzia import instructor
from pfefferminzia.scenarios import SCENARIOS, scenarios_for


class FakeKeys:
    def create(self, inbox_id, *, name):
        return {"api_key": f"key-for-{inbox_id}", "name": name}


class FakeMessages:
    def __init__(self):
        self.sent = []
        self.inbox = []

    def send(self, inbox_id, *, to, subject, text, idempotency_key):
        self.sent.append((inbox_id, to[0], subject, idempotency_key))
        return {"message_id": f"m{len(self.sent)}"}

    def list(self, inbox_id, *, limit, page_token=None):
        return {"messages": self.inbox}


class FakeInboxes:
    def __init__(self):
        self.created = []
        self.api_keys = FakeKeys()
        self.messages = FakeMessages()

    def create(self, *, request):
        self.created.append(request)
        return {"inbox_id": f"{request['username']}@agentmail.to", "email": f"{request['username']}@agentmail.to"}


class FakeClient:
    def __init__(self):
        self.inboxes = FakeInboxes()


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    monkeypatch.delenv("INSTRUCTOR_AGENTMAIL_API_KEY", raising=False)
    monkeypatch.delenv("INSTRUCTOR_INBOX_ID", raising=False)
    (tmp_path / ".env").write_text("INSTRUCTOR_AGENTMAIL_API_KEY=org-key\nINSTRUCTOR_INBOX_ID=dozent@agentmail.to\n")
    return tmp_path


def test_scenarios_cover_the_operational_drills():
    assert [len(scenarios_for(drill)) for drill in (6, 7, 8, 9)] == [1, 1, 2, 3]
    assert len({item["key"] for item in SCENARIOS}) == len(SCENARIOS)


def test_provision_is_a_dry_run_until_confirmed_and_then_idempotent(workspace):
    client = FakeClient()
    plan = instructor.provision(2, "pfm", directory=workspace, client=client)
    assert plan["execute"] is False and plan["slotsToCreate"] == ["01", "02"]
    assert not client.inboxes.created
    instructor.provision(2, "pfm", directory=workspace, client=client, execute=True)
    roster = instructor.read_roster(workspace)
    assert [row["email"] for row in roster] == ["pfm-01@agentmail.to", "pfm-02@agentmail.to"]
    assert roster[0]["api_key"] == "key-for-pfm-01@agentmail.to"
    assert oct((workspace / "roster.csv").stat().st_mode)[-3:] == "600"
    instructor.provision(3, "pfm", directory=workspace, client=client, execute=True)
    assert [request["username"] for request in client.inboxes.created] == ["pfm-01", "pfm-02", "pfm-03"]


def test_handouts_contain_the_three_values_and_start_prompt(workspace):
    with (workspace / ".env").open("a") as env:
        env.write("INSTRUCTOR_EXTRA_ALLOWED=dozent@gmail.example\n")
    instructor.provision(1, "pfm", directory=workspace, client=FakeClient(), execute=True)
    instructor.handouts(workspace)
    text = (workspace / "handouts" / "platz-01.txt").read_text()
    assert "AGENTMAIL_INBOX_ID=pfm-01@agentmail.to" in text
    assert "WORKSHOP_ALLOWED_RECIPIENTS=dozent@agentmail.to,dozent@gmail.example" in text
    assert "Ich bin in Drill 6" in text


def test_send_needs_yes_and_never_sends_twice(workspace):
    client = FakeClient()
    instructor.provision(2, "pfm", directory=workspace, client=client, execute=True)
    plan = instructor.send_scenarios("8", directory=workspace, client=client)
    assert plan["execute"] is False and plan["mails"] == 4
    assert not client.inboxes.messages.sent
    instructor.send_scenarios("8", directory=workspace, client=client, execute=True, pause_seconds=0)
    assert len(client.inboxes.messages.sent) == 4
    assert {sender for sender, *_ in client.inboxes.messages.sent} == {"dozent@agentmail.to"}
    again = instructor.send_scenarios("8", directory=workspace, client=client, execute=True, pause_seconds=0)
    assert again["sent"] == 0 and again["skippedAlreadySent"] == 4
    instructor.send_scenarios("7", slots=["02"], directory=workspace, client=client, execute=True, pause_seconds=0)
    assert client.inboxes.messages.sent[-1][1] == "pfm-02@agentmail.to"


def test_status_matches_replies_to_participants(workspace):
    client = FakeClient()
    instructor.provision(1, "pfm", directory=workspace, client=client, execute=True)
    instructor.send_scenarios("9", directory=workspace, client=client, execute=True, pause_seconds=0)
    client.inboxes.messages.inbox = [
        {"from": "Pfefferminzia 01 <pfm-01@agentmail.to>", "subject": "Re: E-Bike des Nachbarn beschädigt — VTR-00000101"},
        {"from": "stranger@example.test", "subject": "Re: Wasserschaden und Teilzahlung — VTR-00000301"},
    ]
    result = instructor.progress(workspace, client)
    row = result["participants"][0]
    assert row["answered"] == ["haftpflicht-laufen-lassen"]
    assert "haftpflicht-stoppen" in row["received"]
    assert "✔ Antwort" in instructor.format_progress(result)


def test_retag_maps_reference_commits_to_checkpoint_tags(tmp_path):
    import subprocess

    def git(*args):
        return subprocess.run(["git", *args], cwd=tmp_path, check=True, capture_output=True, text=True).stdout.strip()

    git("init", "-q", "-b", "main")
    git("config", "user.email", "t@example.test")
    git("config", "user.name", "Test")
    git("commit", "-q", "--allow-empty", "-m", "Base")
    git("switch", "-q", "-c", "reference")
    for name in ("drill-07-start", "drill-08-start", "drill-09-start", "drill-10-start", "drill-10-complete"):
        git("commit", "-q", "--allow-empty", "-m", f"Reference {name}: solution")
    plan = instructor.retag(root=tmp_path)
    assert plan["missing"] == [] and plan["execute"] is False
    assert not git("tag")
    instructor.retag(root=tmp_path, execute=True)
    assert git("rev-parse", "checkpoint/drill-06-start^{commit}") == git("rev-parse", "main")
    assert git("rev-parse", "checkpoint/drill-10-complete^{commit}") == git("rev-parse", "reference")


def test_roster_mail_needs_confirmation_and_lists_every_slot(workspace):
    client = FakeClient()
    instructor.provision(2, "pfm", directory=workspace, client=client, execute=True)
    assert instructor.roster_email("dozent@example.test", directory=workspace, client=client)["execute"] is False
    assert not client.inboxes.messages.sent
    sent = []
    client.inboxes.messages.send = lambda inbox, *, to, subject, text: sent.append((inbox, to, text)) or {"message_id": "x"}
    instructor.roster_email("dozent@example.test", directory=workspace, client=client, execute=True)
    inbox, to, text = sent[0]
    assert inbox == "dozent@agentmail.to" and to == ["dozent@example.test"]
    assert "Platz 01" in text and "Platz 02" in text and "key-for-pfm-02@agentmail.to" in text
    assert "pfm-01@agentmail.to, pfm-02@agentmail.to" in text


def test_provision_stops_cleanly_at_the_plan_limit(workspace):
    client = FakeClient()
    original = client.inboxes.create

    def limited(*, request):
        if len(client.inboxes.created) >= 2:
            raise RuntimeError("status_code: 403, body: {'code': 'limit_exceeded'}")
        return original(request=request)

    client.inboxes.create = limited
    result = instructor.provision(4, "pfm", directory=workspace, client=client, execute=True)
    assert result["limitReached"] and result["created"] == ["01", "02"] and result["missingSlots"] == ["03", "04"]
    assert [row["slot"] for row in instructor.read_roster(workspace)] == ["01", "02"]


def test_roster_mail_can_contain_a_single_slot(workspace):
    client = FakeClient()
    instructor.provision(2, "pfm", directory=workspace, client=client, execute=True)
    sent = []
    client.inboxes.messages.send = lambda inbox, *, to, subject, text: sent.append(text) or {"message_id": "x"}
    instructor.roster_email("dozent@example.test", slots=["02"], directory=workspace, client=client, execute=True)
    assert "Platz 02" in sent[0] and "Platz 01" not in sent[0]
