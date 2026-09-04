# Falk dataset integration

## Decision

This application treats
[`falkue/Pfefferminzia`](https://github.com/falkue/Pfefferminzia) as the
canonical teaching-domain source. It is pinned as a Git submodule at commit
`352a68ec5786920bdb41b42d3cefc41627ad1145`. We adapt this application's data
and identifiers to Falk's repository, not the reverse.

No upstream pull request has been opened. Any future contribution to Falk's
repository requires explicit prior agreement with the repository owner and the
workshop project owner.

## What is imported

The importer verifies `data/manifest_S.json` and each manifest-listed CSV hash,
then rebuilds local read models:

| Upstream layer | Local prefix | Operational use |
| --- | --- | --- |
| `data/curated/S/csv` | `core_*` | Customer, organisation, product, policy, claim, interaction, and document views |
| `data/migration/S/csv` | `migration_*` | Source-system IDs, mappings, and migration provenance |
| `data/reference` | `reference_*` | Tariff generations and other controlled reference values |
| `data/truth/S` | not imported | Instructor-only solutions remain outside the service |
| raw HAPO/VERA/MINT exports | not imported | Preserved upstream; not needed by the current operational UI |

The current scale-S snapshot produces 67 imported tables and 29,559 rows. The
import records the upstream commit, dataset/schema versions, manifest hash,
per-table hashes, row counts, generation time, import time, and attribution.

## Current gaps and local adapters

### Rendered tariff documents

Finding: the tariff reference CSVs define canonical document IDs for 14 tariff
generations in CH and DE, but the pinned repository contains no rendered PDF
files. Its architecture plans Markdown sources and PDF/DOCX rendering for a
later render stage.

Local adapter: `scripts/generate-tariffs.ts` derives 28 deterministic,
condensed Markdown/PDF references from the exact document IDs, generation
codes, products, markets, dates, and version notes. Template `PF-PDF-1.1`
renders a consistent two-page German tariff layout with document facts,
application notes, tariff characteristics, and extractable text. The application embeds the
PDF next to a separate extracted-text view. Every layer carries workshop-only
metadata; the documents are not complete or binding terms.

Possible later upstream contribution, only after agreement: document metadata
schema, source templates, deterministic rendering, disclaimer/footer checks,
and a small reviewed set of generation-specific policy documents. The current
condensed references should not simply be presented upstream as full terms.

### Claims and interactions

Finding: upstream now supplies 16 persona claims, 58 claim positions, 62
interactions, and 37 document records plus their Markdown/EML files. The
participant-safe curated tables are imported as `core_schaden`,
`core_schaden_position`, `core_interaktion`, and `core_dokument`; the truth
layer remains excluded.

Local adapter: `workshop_*` tables retain only mutable exercise workflow for
four selected upstream claims: recommendations, tasks, audit events, and a
point-in-time operational snapshot. Seeding verifies the exact upstream claim,
contract, and partner linkage. It never writes back to the imported facts.

Possible later work: expose the complete upstream interaction and document
history in Customer 360 and the claim workspace. This is an application adapter,
not a missing upstream dataset contribution.

### Persona narrative versus generated tables

Finding: some amounts, dates, and terms in narrative persona documents do not
exactly match the current generated scale-S policy rows. The importer preserves
the generated tables as canonical operational records and reports this as a
warning; it never edits upstream values to hide the discrepancy.

Local rule: operational contract values come from `core_vertrag` and related
tables. Persona narrative is used only to frame exercises. A claim source note
states that it is a workshop extension. Where a demonstration depends on a
specific contract fact, the UI and MCP tools show the generated policy value
and the matching generation-specific document.

Possible later upstream contribution, only after agreement: generator contract
tests that reconcile the ten fixed personas with their generated policies and
declared storyline invariants.

## Update procedure

1. Review upstream release notes and planned schema changes.
2. Update the submodule pointer on a dedicated branch.
3. Update `FALK_UPSTREAM_COMMIT` and regenerate tariff references.
4. Run `npm run data:import`; all manifest and CSV hashes must verify.
5. Run `npm test` and `npm run build`.
6. Compare row counts, persona invariants, contract/document resolution, and
   participant truth-layer exclusion.
7. Review local `workshop_*` adapters for upstream replacements before merging.

The application never automatically follows upstream `main`; reproducibility
depends on an explicit reviewed submodule commit.
