from pfefferminzia.database import create_database
from pfefferminzia.upstream import FALK_UPSTREAM_COMMIT, get_upstream_status, import_falk_dataset


def test_imports_verified_participant_safe_dataset():
    db = create_database(":memory:")
    result = import_falk_dataset(db, force=True)
    assert result["upstreamCommit"] == FALK_UPSTREAM_COMMIT
    assert result["tables"] == 67
    assert result["rows"] == 29_559
    assert result["referenceTables"] == 43
    assert dict(db.execute("SELECT partner_id, vorname, nachname FROM core_partner WHERE partner_id = ?", ("PTR-00000001",)).fetchone()) == {
        "partner_id": "PTR-00000001", "vorname": "Simone", "nachname": "Niederberger"
    }
    assert dict(db.execute("SELECT vertrag_id, partner_id FROM core_schaden WHERE schaden_id = ?", ("SCH-00000118",)).fetchone()) == {
        "vertrag_id": "VTR-00000101", "partner_id": "PTR-00000001"
    }
    assert db.execute("SELECT COUNT(*) FROM core_interaktion").fetchone()[0] == 62
    assert db.execute("SELECT COUNT(*) FROM core_dokument").fetchone()[0] == 37
    assert db.execute("SELECT COUNT(*) FROM source_tables WHERE layer = 'truth'").fetchone()[0] == 0
    assert get_upstream_status(db)["dataset"] is not None
    assert import_falk_dataset(db)["imported"] is False
    db.close()
