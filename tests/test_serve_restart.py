import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

from pfefferminzia.cli import _port_in_use, _stop_running_pfefferminzia
from pfefferminzia.constants import _state_root

# A stand-in for a copy left running by an earlier session.
FAKE_SERVER = """
import json, os, sys
from http.server import BaseHTTPRequestHandler, HTTPServer
service = sys.argv[2]
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({"ok": True, "service": service, "root": "/old/copy", "pid": os.getpid()}).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args): pass
HTTPServer(("127.0.0.1", int(sys.argv[1])), Handler).serve_forever()
"""


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _start(service: str) -> tuple[subprocess.Popen, int]:
    port = _free_port()
    process = subprocess.Popen([sys.executable, "-c", FAKE_SERVER, str(port), service])
    for _ in range(50):
        if _port_in_use("127.0.0.1", port):
            return process, port
        time.sleep(0.1)
    process.kill()
    raise RuntimeError("fake server did not start")


def test_serve_replaces_an_older_pfefferminzia_on_the_port():
    process, port = _start("pfefferminzia")
    try:
        assert _stop_running_pfefferminzia("127.0.0.1", port) == "/old/copy"
        assert not _port_in_use("127.0.0.1", port)
        assert process.wait(timeout=5) is not None
    finally:
        process.kill()


def test_serve_never_stops_a_foreign_program():
    process, port = _start("something-else")
    try:
        with pytest.raises(RuntimeError, match="anderen Programm"):
            _stop_running_pfefferminzia("127.0.0.1", port)
        assert process.poll() is None
    finally:
        process.kill()


def test_a_free_port_needs_nothing():
    assert _stop_running_pfefferminzia("127.0.0.1", _free_port()) is None


def test_claude_app_session_copies_share_key_and_cases_with_their_folder(tmp_path: Path):
    main = tmp_path / "pfefferminzia"
    (main / ".git").mkdir(parents=True)
    session_copy = main / ".claude" / "worktrees" / "drill-6-c39fd3"
    session_copy.mkdir(parents=True)
    assert _state_root(session_copy) == main
    # Checkpoint folders sit next to the main folder and keep their own state.
    checkpoint_folder = tmp_path / "pfefferminzia-drill-07-start-20260929-abc123"
    checkpoint_folder.mkdir()
    assert _state_root(checkpoint_folder) == checkpoint_folder
    assert _state_root(main) == main
