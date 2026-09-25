# Pfefferminzia MCP

![Pfefferminzia: Minzblätter im Schutzschild](web/logo.svg)

## In drei Schritten startklar

Du brauchst Python 3.12+, `uv`, Git und für die Übungen Claude Code; **kein
Node.js**. Auch ein normaler Clone ohne Submodul-Option funktioniert:

```bash
git clone https://github.com/jhoetter/pfefferminzia.git
cd pfefferminzia
uv sync --frozen
uv run pfefferminzia setup
```

`setup` lädt bei Bedarf automatisch Falks fest gepinnten Datensatz, prüft ihn
und legt die lokale Workshop-Datenbank an. Es ist wiederholbar und braucht
noch keinen AgentMail-Schlüssel. Wenn es scheitert, zeigt die Fehlermeldung
den nächsten Schritt. Die Lehrperson gibt jeder Person eine eigene Inbox-ID,
einen nur dafür gültigen API-Key und die exakte Szenario-Absenderadresse; ein
eigener AgentMail-Console-Login ist nicht nötig. Im Workshop darfst du diese
drei **persönlichen, wegwerfbaren Workshop-Werte** in deinem individuellen
Claude-Code-Chat nennen, damit Claude `.env` für dich anlegt; alternativ trägst
du sie selbst lokal ein (`cp .env.example .env`; vorhandene `.env` nicht
überschreiben). Für echte Zugangsdaten und Kundendaten gilt das ausdrücklich
**nicht**: Solche sensiblen Daten gehören niemals in einen Chat. Den
Organisationsschlüssel der Lehrperson nie teilen. `.env` bleibt Git-ignoriert.

In Terminal A `uv run pfefferminzia serve` starten, dann in Terminal B im
**selben Repo-Ordner** `claude` starten. Die App ist unter
<http://127.0.0.1:3004> erreichbar. Claude bindet den MCP-Server über
`.mcp.json` automatisch ein. Falls Claude bereits vor `setup` geöffnet war
und MCP nicht verbunden ist, die MCP-Verbindung neu aufbauen; Claude führt
die Diagnose. Der erste Test lautet: „Prüfe meinen Workshop-Status und
gib mir nur den ersten Hinweis.“

**Dienstag, 29. September 2026:** Beginne mit den
[vier Teilnehmerkarten](docs/DRILL_CARDS.md). Jeder 75-Minuten-Drill hat ein
Lernziel, einen konkreten Fall, eine kleine eigene Codeverbesserung und einen
Abschlussbeleg. Claude nennt diese Aufgabe über `get_drill_guide` schon bei
Hinweis-Level 0. Die vier Dialogetappen pro Drill sind **keine vier Prompts
auf einmal**: Nach jeder Antwort prüfst oder entscheidest du selbst und
baust eine kleine Änderung mit Claude. Node.js ist nicht nötig. Den persönlichen
Inbox-Schlüssel nur in `.env` und optional im **eigenen Workshop-Chat**
angeben, niemals in Git oder einem Gruppenchat. `checkpoint verify` prüft
die Startbereitschaft, nicht den Abschluss einer Übung.

**Stand der Vorbereitung:** Das System und die vier Drills sind mit Fake-Mail
automatisiert durchgespielt. Zwei isolierte Teilnehmer-Inboxen und eine
Dozenten-Inbox sind im kostenlosen AgentMail-Pilot erprobt. Für den Kurs mit
16 Teilnehmenden plus Dozent müssen vor Dienstag noch mindestens 14 weitere
Inboxen samt inboxgebundenen Schlüsseln bereitgestellt und individuell
verteilt werden; Reserve-Inboxen kommen zusätzlich hinzu. Ohne diese
Kapazität ist der Kursbetrieb mit persönlicher Inbox pro Person noch nicht
freigegeben.
Der genaue Prüfstand und die verbleibenden Go/No-Go-Punkte stehen in der
[Generalprobe](docs/REHEARSAL_2026-09-23.md). Ein bestehender Klon muss nach
dem Pull die aktualisierten offiziellen Tags mit
`git fetch origin --tags --force` übernehmen; frische Klone erhalten sie
automatisch.

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

The browser interface is a human workspace over the same Python application
services. It is shipped as static assets and needs no JavaScript toolchain or
build step. MCP clients use domain-level tools and resources rather than
generic SQL or unrestricted filesystem access.

The current three-day workshop design is documented in
[`docs/WORKSHOP_AGENDA.md`](docs/WORKSHOP_AGENDA.md).
The short Tuesday decks are linked from `/slides/decks.html` when the Python
app runs, or directly from [`slides/decks.html`](slides/decks.html) offline.
The set includes a separate remake of Johannes' agentic-working talk. See
[`docs/TUESDAY_SLIDES.md`](docs/TUESDAY_SLIDES.md) for the presenter map.

## Upstream dataset

The pinned sample dataset currently contributes:

- 1,000 partners and their addresses, contacts, and relationships;
- 1,481 policies, 1,610 applications, 2,208 coverages, and risk objects;
- products and 14 tariff generations for liability and life insurance in
  Switzerland and Germany;
- employees, organisational units, agencies, and intermediaries;
- 16 persona claims, 58 claim positions, 62 interactions, and 37 document
  records with synthetic Markdown/EML case files;
- curated, raw legacy, migration, and instructor-only truth layers.

Only the curated, migration, and reference CSV data is imported into the
application. The `data/truth` instructor solution layer is deliberately not
loaded or exposed through the operational MCP server.

The upstream snapshot now includes persona claim, interaction, and document
tables plus synthetic case files, three business-rule documents, and rendered
tariff sheets. Finance, broader process data, and full policy wordings remain future stages. This
repository keeps mutable workshop workflow in a separate, explicitly labelled
extension layer using the upstream identifiers.

### Tariff documents

Falk's repository renders its 14 tariff generations for Switzerland and
Germany as 28 deterministic Markdown/PDF tariff sheets. This application
indexes those canonical files directly from the pinned submodule; it does not
copy or regenerate them. The tariff library embeds the PDF and offers the
Markdown source as a separate inspection view. Contracts resolve documents by
the exact upstream generation, product, and market rather than by a loose
product-name match.

The tariff sheets are intentionally condensed, synthetic teaching material.
They are not complete policy wordings, real tariffs, legally reviewed terms, or
insurance advice.

### Claims workshop extension

Four upstream persona claims are projected into local `workshop_*` workflow:
Niederberger's small e-bike loss, Kaufmann's complex water loss, the Pieper
governance incident, and Grimm's fraud-signal/fairness scenario. Seeding verifies
their exact upstream partner, contract, and claim identifiers. Only mutable
exercise state such as recommendations, tasks, and audit events is application
owned; no instructor truth tables are copied into the operational service.

Claims are joined to Customer 360, the exact contract, and its matching tariff
document. MCP and UI users may create internal tasks and explainable action
proposals. Every new decision proposal requires recorded human review; approval
only advances the internal demo workflow and never executes a payment, denies a
real claim, or sends external communication. The replayed Pieper denial is
technically blocked and cannot be approved.

## Repository structure

- `vendor/falk-pfefferminzia/` — pinned upstream teaching dataset
- `pfefferminzia/` — FastAPI host, SQLite services, MCP server, AgentMail
  adapter, and CLI
- `web/` — checked-in browser workspace served directly by FastAPI
- `data/tariffs/catalog.json` — application index for Falk's upstream tariff documents
- `tests/` — pytest domain-rule, data-contract, MCP, and workflow tests
- `docs/` — workshop agenda, architecture, and third-party attribution

## Setup

Requirements: Python 3.12 or later, `uv`, and Git. Node.js and npm are not
required. The short participant path is at the top of this README.

```bash
git clone https://github.com/jhoetter/pfefferminzia.git
cd pfefferminzia
uv sync --frozen
uv run pfefferminzia setup
uv run pfefferminzia serve
```

For an existing clone without submodules, `setup` is enough:

```bash
uv run pfefferminzia setup
uv run pfefferminzia serve
```

`data-init` remains an alias for `setup`. The app and MCP server also initialize
the missing pinned submodule automatically as a safety net. `setup` verifies
and imports the dataset, indexes the tariff documents, and creates missing
workshop fixtures. It does **not** contact AgentMail. The application runs at
<http://127.0.0.1:3004>. Its local SQLite database and mirrored attachments are
stored under `.data/` and are not committed. Use
`uv run pfefferminzia serve --reload` for auto-reload while editing Python.

The import verifies Falk's manifest hashes before replacing locally derived
tables. It records the upstream commit, dataset/schema versions, hashes, source
generation time, and required attribution in SQLite.

`uv run pfefferminzia workshop-reset --confirm-demo-reset` recreates seven
deterministic, non-sendable participant exercises: three staged life requests
plus the Niederberger, Kaufmann, Pieper, and Grimm liability/claims storylines. It deletes only records owned by the
local demo/claims extension. Imported Falk tables and any manual or AgentMail
tickets are preserved.

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
Copy `.env.example` to `.env` and set `AGENTMAIL_API_KEY`, the one personal
`AGENTMAIL_INBOX_ID`, and `WORKSHOP_ALLOWED_RECIPIENTS`. The application polls
only that configured inbox and mirrors messages and attachments into its local
data layer. It fails closed rather than reading every inbox available to a key.
For centrally provisioned workshops, each participant receives a key scoped
to their own inbox; the instructor's organization-level key is never shared.
If a key is present but the personal inbox ID or outbound allowlist is missing,
the app remains available while external sync and sending stay disabled.
The dashboard and checkpoint verifier identify what is missing. Updating
AgentMail values in `.env` takes effect in the running app and MCP process;
do not restart Claude Code just to make a newly entered inbox key visible.
Send a test mail to the complete configured inbox address, then use **Jetzt
synchronisieren** in the Workshop-Cockpit or `uv run pfefferminzia sync`.
The cockpit shows the last sync time and newly imported ticket IDs. A sync with
zero new messages can precede delivery; retry after a short wait. Normal
external senders can write to the inbox: `WORKSHOP_ALLOWED_RECIPIENTS` restricts
only outbound replies, not incoming mail.

```bash
uv run pfefferminzia sync
```

External email and attachment content is always treated as untrusted customer
input. Demo records can never send real email. Life-insurance communication
always requires explicit human review. Outbound messages are blocked unless
the exact recipient (or an explicitly configured domain suffix) is allowlisted.

## Staged workshop checkpoints

The Tuesday path is represented by five deterministic boundaries:

```text
drill-08-start → drill-09-start → drill-10-start → drill-11-start → drill-11-complete
```

Each profile limits fixtures, browser affordances, REST operations, MCP tools,
resources, and tutor guidance to the current drill. Inspect and verify the
active state with:

```bash
uv run pfefferminzia checkpoint status
uv run pfefferminzia checkpoint verify
uv run pfefferminzia checkpoint verify --external
```

Checkpoint recovery is non-destructive. A two-step MCP/CLI protocol first
shows the planned official reference, detected participant changes and target
directory, then—after explicit confirmation—creates a separate Git worktree.
The original branch, uncommitted files and local database remain untouched.

```bash
uv run pfefferminzia checkpoint plan drill-10-start
uv run pfefferminzia checkpoint apply TOKEN --confirm-checkpoint-load
```

The browser's **Workshop-Cockpit** shows the current learning goal, concrete
mission, small build task, recent inbound tickets, ticket-linked todos,
mandatory reviews, the visible
intervention-window countdown, checkpoint verification, and the local
workshop-clock control. See [`docs/WORKSHOP_RUNBOOK.md`](docs/WORKSHOP_RUNBOOK.md)
for facilitator setup, scenario delivery, challenge cards and continuity plans.
Participants should use the [drill cards](docs/DRILL_CARDS.md); the verifier
is a readiness check, while the cards define the separate completion evidence.

## MCP

The checked-in `.mcp.json` starts the stdio transport:

```bash
uv run pfefferminzia mcp
```

The application host exposes the same registry through stateless MCP
Streamable HTTP at `POST http://127.0.0.1:3004/mcp`. Both transports are created
from one server factory and are covered by a capability-parity test. The HTTP
endpoint is intentionally local and unauthenticated for workshops; do not bind
it to a public interface.

Core capabilities currently cover ticket queues, ticket details,
classification, attachments, response drafts, internal notes, controlled
submission, audited human-approved sending, data provenance, customer search,
Customer 360, policy context, and version-aware tariff documents. Falk's claim
records back the selected scenarios; the local operational layer adds bounded
claim retrieval, intake from a linked ticket, internal tasks, recommendations,
and human review. Domain
modules remain available through both MCP and the human workspace.

MCP includes every business action used by the workspace: operational summary,
ticket listing and status, customer/contract resolution, tariff and attachment
reading, drafting and approval, AgentMail import, claim intake, internal claim
tasks, decision proposals, and recorded human review. There is no generic SQL,
arbitrary filesystem, direct payment, or unreviewed claim-decision tool.

Workshop MCP also exposes drill guidance, todos, verification and safe
checkpoint recovery. The active profile removes later-drill capabilities from
tool and resource discovery; loading a checkpoint always requires a plan token
and a separate explicit confirmation.

Read operations are exposed as bounded tools or `pfefferminzia://` resources.
State-changing tools validate inputs, enforce workflow rules, and append audit
events. There is intentionally no generic SQL MCP tool.

## Safety and workshop profiles

- `WORKSHOP_PROFILE=participant` is the only operational profile. Any other
  value fails closed; instructor truth data is never loaded by the service.
- `AUTO_SEND_ENABLED=false` is the safe default.
- `AGENTMAIL_INBOX_ID` binds each instance to exactly one participant inbox.
- `WORKSHOP_ALLOWED_RECIPIENTS` limits every external reply.
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
uv sync --frozen
uv run pytest
uv run pytest tests/test_workshop_end_to_end.py -q
uv run pfefferminzia data-import --force
uv run pfefferminzia workshop-reset --confirm-demo-reset
```

There is deliberately no frontend build command. FastAPI serves the checked-in
assets under `web/`, so a workshop checkout remains runnable with only Python,
`uv`, and Git.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the current technical design and
[docs/FALK_INTEGRATION.md](docs/FALK_INTEGRATION.md) for the upstream mapping,
known gaps, and update path. Attribution is recorded in
[docs/THIRD_PARTY_DATA.md](docs/THIRD_PARTY_DATA.md).

## Licence and attribution

The application code currently has no top-level licence grant; clarify reuse
rights with the repository owner before redistributing or modifying it outside
this workshop. Upstream generator code is MIT licensed. Upstream data and
documents are CC BY 4.0:

> Pfefferminzia – synthetischer Lehr-Datensatz, Falk Uebernickel, CC BY 4.0

Full attribution and the pinned upstream revision are documented in
[docs/THIRD_PARTY_DATA.md](docs/THIRD_PARTY_DATA.md).
