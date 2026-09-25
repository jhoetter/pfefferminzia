# Tuesday runbook: Pfefferminzia 2.0

This runbook is the facilitator's operational source for Tuesday, 29 September
2026. The public schedule remains in `Stundenplan_AI_Studio_09_2026_V7.xlsx`;
the learning arc is described in `WORKSHOP_AGENDA.md`.

## Backward-designed boundary states

Four drills require five unambiguous boundaries:

| State | Observable outcome | Intentionally unavailable |
| --- | --- | --- |
| `drill-08-start` | Python app and MCP start; personal inbox and general todos can be exercised | CRM/tariff work, drafting, review and automation |
| `drill-09-start` | One life request can be resolved to customer, contract and exact tariff; Claude can prepare a draft and the human sends | Agent-owned decision, review workflow, liability automation |
| `drill-10-start` | Several life cases can be prepared, rejected, reworked and explicitly approved | Liability router, intervention queue and workshop clock |
| `drill-11-start` | Router selects mandatory life review or liability intervention window; countdown queue is active | Nothing from the target system is hidden |
| `drill-11-complete` | Both control patterns, external effect and audit evidence work side by side | Final reference state |

The codebase is complete in every boundary. Server-side capabilities, MCP tool
registration, resources, scenarios and UI affordances are restricted by the
active profile, so later behavior is neither visible nor usable early.
This is a **reference and rescue path**, not a substitute for building.
Participants fork the repository, commit and push their own code. After a
current-drill case is demonstrated, fast participants may explicitly opt in
to building the next capability on their own branch. Default tutor guidance
does not spoil the next drill. Everyone uses the same case evidence; the
amount of code built varies. The learning model and Git commands are in
[`LEARNING_PATH.md`](LEARNING_PATH.md).
The participant-facing [drill cards](DRILL_CARDS.md) are the concrete handout
for commands, evidence, hints, code exercises, stretch work and token fallback.

## Participant setup

Each participant needs:

- Python 3.12+, `uv`, Git and Claude Code;
- a GitHub account with permission to fork this repository and push to their
  **own** fork; test authentication before Tuesday;
- their own fork/clone and a personal working branch;
- exactly one personal AgentMail inbox and an API key scoped to that inbox;
- their inbox ID, not only its email address;
- the instructor's exact scenario-sender address on the local outbound allowlist.

Participants do not need individual AgentMail Console accounts when inboxes
are provisioned centrally. The instructor keeps the organization-level key;
each participant receives only their own inbox ID and inbox-scoped key through
an individual, secure channel. Never put the organization key or participant
keys in Git, slides, shared chats, or a common handout. For this disposable,
synthetic workshop, a participant may give their own inbox-scoped key, inbox
ID and sender address to their individual Claude Code chat so Claude can write
`.env` for them. The instructor must explain that real credentials, customer
data and other sensitive material must never be put in a chat. The
organization-level key is never shared. The AgentMail Console
login is not part of the participant workflow: they use their local
Pfefferminzia cockpit and their own Claude Code login.

The planned cohort is **16 participants plus one instructor**. During the
free-tier pilot, use the three available inboxes as one instructor inbox and
two isolated participant pilots; do not upgrade or provision the remaining
inboxes yet. Before the course, increase capacity to at least 17 inboxes and
then provision one scoped key per participant. Two or three additional reserve
inboxes need capacity beyond those 17. First test one newly provisioned inbox
and key with `checkpoint verify --external`, an isolated inbound scenario and
a reply to an allowlisted workshop address; then roll out the rest.

Pilot evidence (23 September 2026): both participant keys authenticated with
`scope_type=inbox`; each listed only its own inbox and access to the other was
denied. Both passed the external Drill-8 verifier and imported a synthetic
message. The first pilot also sent an audited reply back to the instructor
inbox. No paid upgrade was made. The two pilot secrets exist only as local,
Git-ignored files on the instructor machine, not in this repository.

Configure `.env` from `.env.example`:

```dotenv
AGENTMAIL_API_KEY=...
AGENTMAIL_INBOX_ID=...
WORKSHOP_ALLOWED_RECIPIENTS=instructor-scenario-sender@agentmail.to
AUTO_SEND_ENABLED=false
WORKSHOP_CHECKPOINT=drill-08-start
```

Use a separate instructor inbox to distribute scenario messages. Do not give
participants a shared instructor or organization key. Once capacity is
available, prepare two or three complete reserve inboxes and scoped keys.

Preflight every machine/account combination (this checks readiness, not whether
the participant has completed the drill):

```bash
uv sync --frozen
uv run pfefferminzia setup
uv run pfefferminzia checkpoint verify --external
uv run pfefferminzia serve
```

The official Drill-11 checkpoint writes `AUTO_SEND_ENABLED=true` into its own
worktree after the participant confirms the checkpoint plan. Earlier stages
remain false; participants do not edit the switch. The verifier makes the
difference visible. AgentMail `.env` changes hot-reload in an already running
app/MCP process, so no restart is needed for a newly entered inbox key.

## Safe checkpoint recovery

Claude supports the natural-language request “Ich bin in Drill 9, hilf mir den
offiziellen Stand zu laden.” The protocol is deliberately two-phase:

1. `plan_checkpoint_load` inspects the current HEAD and dirty paths and creates
   a short-lived token. Nothing is switched or overwritten.
2. Claude shows source, new target directory and preservation guarantee and
   asks the participant again.
3. Only after a clear yes does `apply_checkpoint_load` create a new branch in
   a recovery worktree from the official tag, copy the local `.env`
   without a shared database path, initialize the submodule/dependencies and
   activate the checkpoint.
4. The participant starts Claude in the returned directory. Their original
   branch, commits, untracked files and local database remain untouched.
   The new branch can be pushed to their own fork after a diff/secret check.

Terminal fallback:

```bash
uv run pfefferminzia checkpoint plan drill-10-start
# Read the plan and ask for confirmation.
uv run pfefferminzia checkpoint apply TOKEN --confirm-checkpoint-load
```

Use `uv run pfefferminzia checkpoint status` and
`uv run pfefferminzia checkpoint verify` inside the recovered worktree.

The **normal transition** between drills uses the same plan/confirm/apply
protocol. Stop the old webserver, start it in the returned worktree, and
restart Claude there: the MCP tool set is registered at startup. Each new
worktree has its own fresh SQLite database, while old work and old data stay
in the previous folder. Inbox history may be imported again; participants
should act only on the newly announced scenario tickets. Participant code
changes do not silently migrate to the official next boundary. Invite them
to explain and selectively carry over their own changes if they wish.

## Drill facilitation

Each 75-minute block has a concrete case mission, a small participant-built
change and observable evidence. Use the drill-specific timeboxes in
`docs/DRILL_CARDS.md` / `get_drill_guide`; don't let a green readiness check or
an arbitrary completed todo stand in for learning. The instructor should ask
each participant to show the same ticket in MCP and cockpit, explain their own
code change, and say what they verified.

### Drill 8 — command centre

Core path: clone, `uv sync`, app start, MCP status, inbox preflight, send one
message to the full personal AgentMail address, and trace the new ticket in
MCP and cockpit. Create a ticket-linked todo for a real next step, close it
only after inspection, then add a small idempotent inbound-triage improvement
with Claude and test it. Do not discuss tariffs, approval or delayed sending.

Normal external senders, including Gmail, can mail the inbox. The configured
`WORKSHOP_ALLOWED_RECIPIENTS` restricts **outbound replies only**. A zero-new
sync means nothing arrived by that check; inspect last sync time and retry
after delivery. Never suggest the allowlist blocked incoming mail.

Checkpoint evidence: health is green, external inbox verification succeeds,
one incoming ticket appears, and the todo lifecycle is visible in the cockpit.

For every drill, present the four `dialogueSteps` from `get_drill_guide` as
separate exchanges. The `askClaude` text is an example question, not a
one-shot agent instruction. Stop at each `yourMove`: participants inspect the
case, decide, edit code or verify evidence themselves before proceeding.

### Drill 9 — human works, agent prepares

Core path: receive the prepared life request; resolve person and policy; inspect
the exact tariff generation; let Claude prepare a cited draft; have the human
edit the wording and explicitly send it. Claude must not decide the case or
trigger autonomous communication.

Checkpoint evidence: linked customer/policy, exact document, saved draft,
visible human edit and an explicit human send event.

### Drill 10 — agent works, human approves

Core path: receive two life/performance cases; let Claude prepare decision and
response; approve one; reject another with a reason; let Claude rework it. A
text change invalidates any earlier approval.

Checkpoint evidence: review todo, approval/rejection audit entries, rejected
case back in progress, and no life send without current approval.

### Drill 11 — intervention window

Core path: route incoming cases; submit three liability replies; let one run,
edit one, remove one; inspect the countdown; then advance workshop time by 24
hours after explicit confirmation.

Checkpoint evidence: one automatic send, one `schedule_cancelled` or edited
case, one `queue_removed` case and all actions in the audit history.

## Rehearsal and go/no-go

Die [Generalprobe vom 23. September](REHEARSAL_2026-09-23.md) hält geprüfte
Softwarepfade und noch offene organisatorische Voraussetzungen getrennt fest.

Run before the workshop:

```bash
uv run pytest
uv run pytest tests/test_workshop_end_to_end.py -q
uv run pfefferminzia checkpoint verify --external
```

Then personally play Drill 8 → 11. During Drill 9 deliberately change a file
and create an untracked note. Ask Claude to load `drill-10-start`; confirm that
the new worktree works and the original changes still exist. Do one real email
round-trip only to a pre-approved workshop address.

Go only if:

- all automated tests pass;
- participants can fork and authenticate a push to their own repository (or
  have a pre-arranged instructor-assisted Git fallback);
- every personal inbox passes the external preflight;
- each official checkpoint tag resolves and loads;
- the instructor can send all seven scenario messages;
- the Drill-11 clock sends exactly the one untouched queued response;
- reserve accounts are tested, not merely created.

## Fast participants

After the current case **and tested code contribution** are demonstrated,
offer a genuine choice: deepen this drill with a Challenge Card **or** begin
building the next capability in their own branch. Reveal the next task only
after explicit opt-in. At the current checkpoint its UI/MCP capability
remains gated, so the advance work starts with code and tests; integrated
exercise follows at the next official boundary. A participant can also
volunteer as a buddy. A buddy asks diagnostic questions and does not take
over the keyboard or approve a case for someone else.

- Drill 8: diagnose a deliberately wrong inbox ID or build an activity-log
  view for todo changes.
- Drill 9: resolve two similar names, a missing contract number, a superseded
  tariff generation, or untrusted instructions in an attachment.
- Drill 10: prove that editing invalidates approval; reject and rework a case;
  handle a human request that contradicts the cited tariff.
- Drill 11: test duplicate processing/idempotency, timer reset after editing,
  removal and restoration, or a transparent router-confidence threshold.

## Token-limit continuity

Do not make shared personal credentials the primary fallback. Use centrally
approved reserve seats/accounts where available and monitor usage before each
drill. Keep three continuity layers:

1. Pair mode: one active Claude session, two separate local systems and roles.
2. Hint cards: goal, commands, file pointers and expected evidence are in the
   repository and need no model call.
3. Rescue mode: load the official next boundary in a separate worktree and
   continue with the verifier and browser cockpit.

For each drill, ask participants to show their own diff/test, commit and push
to their own fork. At the end, compare how much they built, **not** whether
they all wrote the same amount. The shared case evidence and control rule are
the common learning outcome.

Record who controls reserve access and how it is reassigned. Workshop-only,
inbox-scoped keys may be handled in an individual Claude chat as described
above; never paste real credentials, the instructor organization key, or
customer data into any chat, and never place keys in slides, shared documents
or Git.

## Whiteboard handoff

Draw the experienced flow:

`Email → context/evidence → agent proposal → control rule → external effect → audit`

Split the control rule into mandatory approval and intervention window. Use
`AUTOMATION_CONTRACT.md` to transfer the pattern to Wednesday's own cases.
