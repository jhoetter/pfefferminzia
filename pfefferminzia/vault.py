"""Password-protected copy of the Git-ignored `.instructor/` folder.

`instructor lock` packs the folder into `instructor.vault` (scrypt key derivation,
AES-256-GCM), which may be committed. `instructor unlock` restores it on another
machine. The repository is public: only a long, random password keeps the
organization key safe. Rotate the AgentMail key after the workshop.
"""

from __future__ import annotations

import io
import os
import secrets
import tarfile
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

from .constants import ROOT

MAGIC = b"PFMVAULT1"
VAULT_FILE = ROOT / "instructor.vault"
MIN_PASSWORD_LENGTH = 16


def _key(password: str, salt: bytes) -> bytes:
    return Scrypt(salt=salt, length=32, n=2**17, r=8, p=1).derive(password.encode("utf-8"))


def lock(password: str, source: Path, vault: Path = VAULT_FILE) -> dict[str, int | str]:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Passwort zu kurz: mindestens {MIN_PASSWORD_LENGTH} Zeichen (das Repo ist öffentlich)")
    if not (source / ".env").is_file():
        raise ValueError(f"{source} enthält keine .env – nichts zu verschlüsseln")
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for path in sorted(source.rglob("*")):
            if path.is_file():
                archive.add(path, arcname=str(path.relative_to(source)))
    salt, nonce = secrets.token_bytes(16), secrets.token_bytes(12)
    sealed = AESGCM(_key(password, salt)).encrypt(nonce, buffer.getvalue(), MAGIC)
    vault.write_bytes(MAGIC + salt + nonce + sealed)
    return {"vault": str(vault), "files": sum(1 for path in source.rglob("*") if path.is_file())}


def unlock(password: str, target: Path, vault: Path = VAULT_FILE, *, overwrite: bool = False) -> dict[str, int | str]:
    data = vault.read_bytes() if vault.is_file() else b""
    if not data.startswith(MAGIC):
        raise ValueError(f"Kein Tresor gefunden: {vault}")
    salt, nonce, sealed = data[len(MAGIC):len(MAGIC) + 16], data[len(MAGIC) + 16:len(MAGIC) + 28], data[len(MAGIC) + 28:]
    try:
        payload = AESGCM(_key(password, salt)).decrypt(nonce, sealed, MAGIC)
    except Exception as error:
        raise ValueError("Falsches Passwort oder beschädigter Tresor") from error
    if (target / ".env").exists() and not overwrite:
        raise ValueError(f"{target} existiert schon; mit --force überschreiben")
    target.mkdir(parents=True, exist_ok=True)
    target.chmod(0o700)
    count = 0
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as archive:
        for member in archive.getmembers():
            if not member.isfile():
                continue
            destination = (target / member.name).resolve()
            if not destination.is_relative_to(target.resolve()):
                raise ValueError(f"Unzulässiger Pfad im Tresor: {member.name}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.extractfile(member).read())  # type: ignore[union-attr]
            destination.chmod(0o600)
            count += 1
    return {"restored": str(target), "files": count}


def password_from_environment() -> str | None:
    return os.getenv("PFEFFERMINZIA_VAULT_PASSWORD")
