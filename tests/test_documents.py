from pypdf import PdfReader

from pfefferminzia.constants import ROOT
from pfefferminzia.store import list_contract_documents, list_tariffs, resolve_storage_path
from pfefferminzia.upstream import FALK_UPSTREAM_COMMIT


def test_maps_every_tariff_generation_to_upstream_pdf(full_db):
    documents = list_tariffs(full_db)
    assert len(documents) == 28
    assert all(document["sourceCommit"] == FALK_UPSTREAM_COMMIT for document in documents)
    upstream = "vendor/falk-pfefferminzia/data/documents/S/tarife"
    assert all(resolve_storage_path(f"{upstream}/{document['filename']}").exists() for document in documents)
    sample = next(document for document in documents if document["id"] == "RW-HP-AHB-DE-2013")
    pdf = PdfReader(resolve_storage_path(f"{upstream}/{sample['filename']}"))
    assert len(pdf.pages) == 2
    assert pdf.metadata.creator == "Pfefferminzia Dokumentgenerator"
    assert "Synthetisches Tarifblatt" in pdf.metadata.subject
    markdown = (ROOT / upstream / f"{sample['id']}.md").read_text(encoding="utf-8")
    assert "dokument_id: RW-HP-AHB-DE-2013" in markdown
    assert "Falk-Tarifgeneration" not in markdown
    assert sample["workshopExtension"] is False
    assert [item["id"] for item in list_contract_documents("VTR-00000801", full_db)] == ["RW-HP-AHB-DE-2013"]
    assert [item["id"] for item in list_contract_documents("VTR-00000202", full_db)] == ["RW-LV-AVB-DE-2025"]
