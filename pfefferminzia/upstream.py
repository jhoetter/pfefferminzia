from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any

from .constants import ROOT
from .database import get_database
from .util import utc_now

FALK_DATASET_ID = "falk-pfefferminzia-S"
FALK_UPSTREAM_COMMIT = "53a80bf49176a5066b80f0d4d509f096c16f57e7"
FALK_ATTRIBUTION = "Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0"
FALK_ROOT = ROOT / "vendor" / "falk-pfefferminzia"
MANIFEST_PATH = FALK_ROOT / "data" / "manifest_S.json"


def ensure_falk_submodule() -> bool:
    """Fetch only the pinned teaching submodule when a clone omitted it.

    Return True if this call had to initialize the submodule. Never update an
    already-present checkout, so participant edits inside it stay untouched.
    """
    if MANIFEST_PATH.is_file():
        return False
    print("Pfefferminzia: Falk-Datensatz fehlt; initialisiere das Git-Submodul …", file=sys.stderr)
    command = ["git", "submodule", "update", "--init", "--recursive", "--", "vendor/falk-pfefferminzia"]
    try:
        subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(
            "Der Falk-Datensatz konnte nicht geladen werden. Prüfe Git und die Internetverbindung, "
            "dann starte `uv run pfefferminzia setup` erneut. "
            f"Technische Ursache: {error}"
        ) from error
    if not MANIFEST_PATH.is_file():
        raise RuntimeError(
            "Das Git-Submodul wurde geladen, aber data/manifest_S.json fehlt. "
            "Prüfe den Submodul-Checkout und starte `uv run pfefferminzia setup` erneut."
        )
    return True


def _quoted(identifier: str) -> str:
    if not identifier or "\0" in identifier:
        raise ValueError(f"Unsafe SQLite identifier: {identifier}")
    return f'"{identifier.replace(chr(34), chr(34) * 2)}"'


def _local_table_name(layer: str, name: str) -> str:
    prefix = "core" if layer == "curated" else layer
    result = re.sub(r"[^a-z0-9_]", "_", f"{prefix}_{name}", flags=re.IGNORECASE).lower()
    if not re.fullmatch(r"[a-z][a-z0-9_]*", result):
        raise ValueError(f"Unsafe local table name: {result}")
    return result


def _import_csv_table(
    db: sqlite3.Connection,
    source_path: Path,
    local_table: str,
    layer: str,
    expected_hash: str | None,
    imported_at: str,
) -> int:
    content = source_path.read_bytes()
    actual_hash = hashlib.sha256(content).hexdigest()
    if expected_hash and actual_hash != expected_hash:
        relative = source_path.relative_to(FALK_ROOT)
        raise ValueError(f"Hash mismatch for {relative}: expected {expected_hash}, got {actual_hash}")
    with source_path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        records = list(reader)
    if not headers:
        raise ValueError(f"CSV has no headers: {source_path}")
    table = _quoted(local_table)
    db.execute(f"DROP TABLE IF EXISTS {table}")
    db.execute(f"CREATE TABLE {table} ({', '.join(f'{_quoted(header)} TEXT' for header in headers)})")
    placeholders = ", ".join("?" for _ in headers)
    statement = f"INSERT INTO {table} ({', '.join(map(_quoted, headers))}) VALUES ({placeholders})"
    db.executemany(statement, [tuple(record[header] or None for header in headers) for record in records])
    relative = str(source_path.relative_to(FALK_ROOT))
    db.execute(
        """INSERT INTO source_tables (source_path, local_table, layer, row_count, sha256, imported_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_path) DO UPDATE SET local_table = excluded.local_table, layer = excluded.layer,
          row_count = excluded.row_count, sha256 = excluded.sha256, imported_at = excluded.imported_at""",
        (relative, local_table, layer, len(records), actual_hash, imported_at),
    )
    return len(records)


def _ensure_indexes(db: sqlite3.Connection) -> None:
    statements = (
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_core_partner_id ON core_partner(partner_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_partner_name ON core_partner(nachname, firmenname)",
        "CREATE INDEX IF NOT EXISTS idx_core_partner_kontakt_partner ON core_partner_kontakt(partner_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_partner_kontakt_value ON core_partner_kontakt(wert)",
        "CREATE INDEX IF NOT EXISTS idx_core_partner_adresse_partner ON core_partner_adresse(partner_id, ist_aktuell)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_core_vertrag_id ON core_vertrag(vertrag_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_vertrag_partner ON core_vertrag(versicherungsnehmer_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_core_deckung_vertrag ON core_deckung(vertrag_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_risiko_vertrag ON core_risiko_objekt(vertrag_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_rollen_vertrag ON core_vertrag_partner_rolle(vertrag_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_rollen_partner ON core_vertrag_partner_rolle(partner_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_core_schaden_id ON core_schaden(schaden_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_schaden_vertrag ON core_schaden(vertrag_id, schadendatum)",
        "CREATE INDEX IF NOT EXISTS idx_core_schaden_partner ON core_schaden(partner_id, schadendatum)",
        "CREATE INDEX IF NOT EXISTS idx_core_schaden_position_schaden ON core_schaden_position(schaden_id, datum)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_core_interaktion_id ON core_interaktion(interaktion_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_interaktion_partner ON core_interaktion(partner_id, zeitpunkt)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_core_dokument_id ON core_dokument(dokument_id)",
        "CREATE INDEX IF NOT EXISTS idx_core_dokument_partner ON core_dokument(partner_id, erstellt_am)",
        "CREATE INDEX IF NOT EXISTS idx_migration_partner_xref ON migration_partner_xref(curated_id)",
        "CREATE INDEX IF NOT EXISTS idx_migration_vertrag_xref ON migration_vertrag_xref(curated_id)",
    )
    for statement in statements:
        db.execute(statement)


def upstream_warnings() -> list[str]:
    return ["Finance and broader process stages are not fully implemented yet."]


def import_falk_dataset(db: sqlite3.Connection | None = None, force: bool = False) -> dict[str, Any]:
    db = db or get_database()
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError("Falk dataset is missing. Run `uv run pfefferminzia data-init` first.")
    manifest_content = MANIFEST_PATH.read_bytes()
    manifest_hash = hashlib.sha256(manifest_content).hexdigest()
    existing = db.execute("SELECT manifest_sha256 FROM source_datasets WHERE id = ?", (FALK_DATASET_ID,)).fetchone()
    existing_tables = db.execute("SELECT COUNT(*) AS count FROM source_tables").fetchone()["count"]
    if not force and existing and existing["manifest_sha256"] == manifest_hash and existing_tables > 0:
        counts = db.execute("SELECT COUNT(*) AS tables, COALESCE(SUM(row_count), 0) AS rows FROM source_tables").fetchone()
        references = db.execute("SELECT COUNT(*) AS count FROM source_tables WHERE layer = 'reference'").fetchone()["count"]
        return {
            "imported": False,
            "datasetId": FALK_DATASET_ID,
            "upstreamCommit": FALK_UPSTREAM_COMMIT,
            "manifestSha256": manifest_hash,
            "tables": counts["tables"],
            "rows": counts["rows"],
            "referenceTables": references,
            "warnings": upstream_warnings(),
        }

    manifest = json.loads(manifest_content)
    if manifest["scale"] != "S":
        raise ValueError(f"Expected Falk dataset scale S, got {manifest['scale']}")
    importable = [table for table in manifest["tables"] if table["layer"] != "truth" and table["files"].get("csv")]
    imported_at = utc_now()
    total_rows = 0
    reference_tables = 0
    db.execute("BEGIN IMMEDIATE")
    try:
        db.execute("DELETE FROM source_tables")
        for table in importable:
            relative = table["files"]["csv"]
            total_rows += _import_csv_table(
                db,
                FALK_ROOT / relative,
                _local_table_name(table["layer"], table["name"]),
                table["layer"],
                table["sha256"].get("csv"),
                imported_at,
            )
        reference_root = FALK_ROOT / "data" / "reference"
        for source_path in sorted(reference_root.rglob("*.csv")):
            relative = source_path.relative_to(reference_root).with_suffix("")
            name = "reference_" + re.sub(r"[^a-z0-9]+", "_", str(relative), flags=re.IGNORECASE).lower()
            total_rows += _import_csv_table(db, source_path, name, "reference", None, imported_at)
            reference_tables += 1
        _ensure_indexes(db)
        db.execute(
            """INSERT INTO source_datasets
              (id, upstream_commit, manifest_sha256, dataset_version, schema_version, scale, source_generated_at, imported_at, attribution)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET upstream_commit = excluded.upstream_commit,
                manifest_sha256 = excluded.manifest_sha256, dataset_version = excluded.dataset_version,
                schema_version = excluded.schema_version, scale = excluded.scale,
                source_generated_at = excluded.source_generated_at, imported_at = excluded.imported_at,
                attribution = excluded.attribution""",
            (
                FALK_DATASET_ID,
                FALK_UPSTREAM_COMMIT,
                manifest_hash,
                manifest["version"],
                manifest["schema_version"],
                manifest["scale"],
                manifest["generated_at"],
                imported_at,
                FALK_ATTRIBUTION,
            ),
        )
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return {
        "imported": True,
        "datasetId": FALK_DATASET_ID,
        "upstreamCommit": FALK_UPSTREAM_COMMIT,
        "manifestSha256": manifest_hash,
        "tables": len(importable) + reference_tables,
        "rows": total_rows,
        "referenceTables": reference_tables,
        "warnings": upstream_warnings(),
    }


def get_upstream_status(db: sqlite3.Connection | None = None) -> dict[str, Any]:
    db = db or get_database()
    dataset = db.execute("SELECT * FROM source_datasets WHERE id = ?", (FALK_DATASET_ID,)).fetchone()
    tables = db.execute(
        "SELECT source_path, local_table, layer, row_count, sha256 FROM source_tables ORDER BY layer, source_path"
    ).fetchall()
    return {
        "dataset": dict(dataset) if dataset else None,
        "tables": [dict(row) for row in tables],
        "warnings": upstream_warnings(),
    }
