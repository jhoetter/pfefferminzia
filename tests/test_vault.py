from __future__ import annotations

import pytest

from pfefferminzia import vault


def test_vault_round_trip_and_wrong_password(tmp_path):
    source = tmp_path / "src"
    (source / "handouts").mkdir(parents=True)
    (source / ".env").write_text("INSTRUCTOR_AGENTMAIL_API_KEY=secret\n")
    (source / "handouts" / "platz-01.txt").write_text("Platz 01")
    sealed = tmp_path / "instructor.vault"
    vault.lock("a-long-random-passphrase", source, sealed)
    assert b"secret" not in sealed.read_bytes()

    with pytest.raises(ValueError, match="Falsches Passwort"):
        vault.unlock("wrong-password-123456", tmp_path / "x", sealed)
    target = tmp_path / "restored"
    assert vault.unlock("a-long-random-passphrase", target, sealed)["files"] == 2
    assert (target / ".env").read_text() == "INSTRUCTOR_AGENTMAIL_API_KEY=secret\n"
    assert oct((target / ".env").stat().st_mode)[-3:] == "600"
    with pytest.raises(ValueError, match="existiert schon"):
        vault.unlock("a-long-random-passphrase", target, sealed)


def test_vault_refuses_short_passwords(tmp_path):
    (tmp_path / ".env").write_text("X=1\n")
    with pytest.raises(ValueError, match="zu kurz"):
        vault.lock("short", tmp_path, tmp_path / "v")
