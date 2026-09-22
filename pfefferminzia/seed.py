from __future__ import annotations

import json
import sqlite3

from .constants import ROOT
from .database import get_database
from .upstream import FALK_UPSTREAM_COMMIT


def ensure_seed_data(db: sqlite3.Connection | None = None) -> None:
    db = db or get_database()
    catalog_path = ROOT / "data" / "tariffs" / "catalog.json"
    try:
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("Tariff catalog is missing or invalid.") from error
    db.execute("DELETE FROM documents WHERE id IN ('privathaft-klar-2026', 'leben-sicher-2045')")
    for document in catalog:
        source = ROOT / document["source"]
        text = source.read_text(encoding="utf-8")
        db.execute(
            """INSERT INTO documents
              (id, title, product_line, filename, storage_path, summary, text_content, created_at, document_type,
               product_ids_json, tariff_generation_id, market, valid_from, valid_to, revision, source_commit, workshop_extension)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BEDINGUNGSWERK', ?, ?, ?, ?, ?, ?, ?, 0)
              ON CONFLICT(id) DO UPDATE SET title = excluded.title, product_line = excluded.product_line,
                filename = excluded.filename, storage_path = excluded.storage_path, summary = excluded.summary,
                text_content = excluded.text_content, document_type = excluded.document_type,
                product_ids_json = excluded.product_ids_json, tariff_generation_id = excluded.tariff_generation_id,
                market = excluded.market, valid_from = excluded.valid_from, valid_to = excluded.valid_to,
                revision = excluded.revision, source_commit = excluded.source_commit,
                workshop_extension = excluded.workshop_extension""",
            (
                document["id"],
                document["title"],
                document["productLine"],
                document["filename"],
                document["source"].removesuffix(".md") + ".pdf",
                document["summary"],
                text,
                "2026-09-04T00:00:00.000Z",
                json.dumps(document["productIds"]),
                document["tariffGenerationId"],
                document["market"],
                document["validFrom"],
                document["validTo"],
                document["revision"],
                FALK_UPSTREAM_COMMIT,
            ),
        )
