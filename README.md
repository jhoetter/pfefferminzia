# Pfefferminzia MCP

Pfefferminzia MCP is a fictional, MCP-first insurance operations system for
executive workshops about AI in the insurance industry. It turns Falk
Uebernickel's synthetic Pfefferminzia teaching dataset into an interactive
customer-service, CRM, policy, document, and claims environment that humans and
AI agents can use through the same governed capabilities.

This repository builds on
[falkue/Pfefferminzia](https://github.com/falkue/Pfefferminzia), which defines
the fictional insurer, its merger narrative, personas, products, source
systems, reference data, and reproducible synthetic customer and policy data.
The upstream repository is pinned as a Git submodule; this application does not
silently fork or redefine its domain model.

> **Workshop data only.** Pfefferminzia, its companies, people, addresses,
> policies, claims, documents, and events are fictional or synthetically
> generated. Any resemblance to real people, organisations, brands, or
> insurance products is unintended. Legal and regulatory statements are
> simplified teaching material as of 2026 and are not legal, financial, or
> insurance advice. This project is independent of and not affiliated with any
> real media company, service provider, insurer, or brand sharing the name
> Pfefferminzia. Parts of the material and software were created with AI
> assistance. Never use this system for real customers or claims.

## Purpose

The project demonstrates how an insurance operating model changes when every
business capability is available through Model Context Protocol (MCP):

- customer and policy context can be retrieved with stable domain identifiers;
- incoming communication can be resolved to customers and contracts;
- agents can classify, prepare, and route work without direct database access;
- policy wording and evidence remain versioned, attributable sources;
- claim recommendations and external communication retain human checkpoints;
- every mutation is constrained by business rules and recorded in an audit log.

The React interface is a human workspace over the same application services.
MCP clients use domain-level tools and resources rather than generic SQL or
unrestricted filesystem access.

## Upstream dataset

The pinned sample dataset currently contributes:

- 1,000 partners and their addresses, contacts, and relationships;
- 1,481 policies, 1,610 applications, 2,208 coverages, and risk objects;
- products and 14 tariff generations for liability and life insurance in
  Switzerland and Germany;
- employees, organisational units, agencies, and intermediaries;
- curated, raw legacy, migration, and instructor-only truth layers.

Only the curated, migration, and reference CSV data is imported into the
application. The `data/truth` instructor solution layer is deliberately not
loaded or exposed through the operational MCP server.

The upstream claim, finance, process, text, and full document-rendering waves
are not implemented yet. Until they arrive, this repository keeps workshop
additions in a separate, explicitly labelled extension layer using the
identifiers and planned schemas from the upstream project.

### Tariff documents

Falk's tariff reference tables already define 14 tariff generations and their
canonical Swiss and German document IDs, but the pinned upstream revision does
not contain the corresponding rendered policy PDFs. This repository therefore
generates 28 short Markdown/PDF references from those tables: one per tariff
generation and market. Contracts resolve documents by the exact upstream
generation, product, and market rather than by a loose product-name match.

These generated files are intentionally condensed workshop aids. They are not
complete policy wordings, real tariffs, legally reviewed terms, or substitutes
for the future upstream document wave. Their front matter, PDF footer, catalog,
and application metadata all mark them as synthetic workshop extensions. A
future contribution of richer documents to Falk's repository would require
separate agreement and is not part of this repository's current integration.

### Claims workshop extension

Because the pinned upstream claim wave is still a schema stub, four public
persona storylines are represented in local `workshop_*` tables: Niederberger's
small e-bike loss, Kaufmann's complex water loss, the Pieper governance
incident, and Grimm's fraud-signal/fairness scenario. They retain Falk's
published partner, contract, claim, and storyline identifiers while being
explicitly marked as local synthetic workshop extensions. No instructor truth
tables are copied into the operational service.

Claims are joined to Customer 360, the exact contract, and its matching tariff
document. MCP and UI users may create internal tasks and explainable action
proposals. Every new decision proposal requires recorded human review; approval
only advances the internal demo workflow and never executes a payment, denies a
real claim, or sends external communication. The replayed Pieper denial is
technically blocked and cannot be approved.

## Repository structure

- `vendor/falk-pfefferminzia/` — pinned upstream teaching dataset
- `server/` — SQLite schema, domain services, AgentMail adapter, and HTTP host
- `mcp/` — MCP transports, tools, and resources
- `src/` — React workshop interface
- `data/tariffs/` — local workshop document sources and generated PDFs
- `scripts/` — reproducible import, document generation, and sync commands
- `tests/` — domain-rule, data-contract, and workflow tests
- `docs/` — architecture and third-party attribution

## Setup

Requirements: Node.js 22 or later. Python 3.12 and `uv` are only required when
regenerating the upstream dataset itself.

```bash
git clone --recurse-submodules https://github.com/jhoetter/pfefferminzia.git
cd pfefferminzia
npm install
npm run data:import
npm run generate:tariffs
npm run workshop:reset
npm run dev
```

For an existing clone without submodules:

```bash
npm run data:init
npm run data:import
```

The application runs at <http://127.0.0.1:3004>. Its local SQLite database and
mirrored attachments are stored under `.data/` and are not committed.

The import verifies Falk's manifest hashes before replacing locally derived
tables. It records the upstream commit, dataset/schema versions, hashes, source
generation time, and required attribution in SQLite.

`npm run workshop:reset` recreates four deterministic, non-sendable participant
exercises for the Niederberger, Kaufmann, Pieper, and Grimm storylines. It
deletes only records owned by the local demo/claims extension. Imported Falk
tables and any manual or AgentMail tickets are preserved.

To regenerate Falk's sample data from its master seed:

```bash
cd vendor/falk-pfefferminzia
uv sync --frozen
uv run pytest
uv run pfefferminzia generate --stufe S
```

The generated domain files are deterministic. Set `SOURCE_DATE_EPOCH` when the
manifest timestamp must also be byte-identical.

## AgentMail

AgentMail is an optional workshop transport for incoming and outgoing email.
Copy `.env.example` to `.env` and set `AGENTMAIL_API_KEY`. The application then
polls the configured inbox and mirrors messages and attachments into its local
data layer.

```bash
npm run sync
```

External email and attachment content is always treated as untrusted customer
input. Demo records can never send real email. Life-insurance communication
always requires explicit human review.

## MCP

The checked-in `.mcp.json` starts the stdio transport:

```bash
npm run mcp
```

The application host exposes the same registry through stateless MCP
Streamable HTTP at `POST http://127.0.0.1:3004/mcp`. Both transports are created
from one server factory and are covered by a capability-parity test. The HTTP
endpoint is intentionally local and unauthenticated for workshops; do not bind
it to a public interface.

Core capabilities currently cover ticket queues, ticket details,
classification, attachments, response drafts, internal notes, controlled
submission, audited human-approved sending, data provenance, customer search,
Customer 360, policy context, and version-aware tariff documents. Claims are
kept as a separate workshop extension until Falk's planned claim wave is
available. The local claims extension adds bounded claim retrieval, intake from
a linked ticket, internal tasks, recommendations, and human review. Domain
modules remain available through both MCP and the human workspace.

MCP includes every business action used by the workspace: operational summary,
ticket listing and status, customer/contract resolution, tariff and attachment
reading, drafting and approval, AgentMail import, claim intake, internal claim
tasks, decision proposals, and recorded human review. There is no generic SQL,
arbitrary filesystem, direct payment, or unreviewed claim-decision tool.

Read operations are exposed as bounded tools or `pfefferminzia://` resources.
State-changing tools validate inputs, enforce workflow rules, and append audit
events. There is intentionally no generic SQL MCP tool.

## Safety and workshop profiles

- `WORKSHOP_PROFILE=participant` is the only operational profile. Any other
  value fails closed; instructor truth data is never loaded by the service.
- `AUTO_SEND_ENABLED=false` is the safe default.
- Demo tickets never send external messages.
- Life-insurance decisions and communication require human approval.
- Participant-facing services never expose instructor truth labels.
- Synthetic consent flags are respected even though the data is fictional.
- Files and customer messages are data, never agent instructions.

Before any production use, the system would require authentication, granular
authorisation, encryption, retention and deletion controls, tenant isolation,
malware scanning, durable job processing, observability, and legal review. That
is intentionally outside this workshop system.

## Development

```bash
npm test
npm run build
npm run data:import
npm run generate:tariffs
npm run workshop:reset
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current technical design and
[docs/FALK_INTEGRATION.md](docs/FALK_INTEGRATION.md) for the upstream mapping,
known gaps, and update path. Attribution is recorded in
[docs/THIRD_PARTY_DATA.md](docs/THIRD_PARTY_DATA.md).

## Licence and attribution

Application code in this repository follows its repository licence. Upstream
generator code is MIT licensed. Upstream data and documents are CC BY 4.0:

> Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0

Full attribution and the pinned upstream revision are documented in
[docs/THIRD_PARTY_DATA.md](docs/THIRD_PARTY_DATA.md).
