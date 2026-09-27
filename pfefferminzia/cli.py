from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

from dotenv import load_dotenv

from .constants import STATE_ROOT


def _json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def _initialize() -> dict[str, Any]:
    from .claims import ensure_workshop_claims
    from .seed import ensure_seed_data
    from .upstream import ensure_falk_submodule, import_falk_dataset
    from .workshop import ensure_workshop_fixtures

    initialized = ensure_falk_submodule()
    upstream = import_falk_dataset()
    ensure_seed_data()
    ensure_workshop_claims()
    ensure_workshop_fixtures()
    return {**upstream, "submoduleInitialized": initialized}



def _port_in_use(host: str, port: int) -> bool:
    import socket

    with socket.socket() as probe:
        return probe.connect_ex((host, port)) == 0


def _stop_running_pfefferminzia(host: str, port: int, wait_seconds: float = 10.0) -> str | None:
    """Free the port from an older Pfefferminzia, e.g. one left from an earlier session.

    Only a process that answers as Pfefferminzia is stopped; anything else on
    the port is reported. Returns the folder of the stopped copy.
    """
    import shutil
    import signal
    import subprocess
    import time
    import urllib.request

    if not _port_in_use(host, port):
        return None
    try:
        with urllib.request.urlopen(f"http://{host}:{port}/api/health", timeout=3) as response:
            health = json.load(response)
    except Exception:  # noqa: BLE001 - anything unreadable is not ours to stop
        health = {}
    if health.get("service") != "pfefferminzia":
        raise RuntimeError(f"Port {port} ist von einem anderen Programm belegt; bitte dieses beenden.")
    pids = [int(health["pid"])] if health.get("pid") else []
    if not pids and shutil.which("lsof"):
        # Copies from before the health check reported their process.
        found = subprocess.run(["lsof", "-ti", f"tcp:{port}", "-sTCP:LISTEN"], capture_output=True, text=True)
        pids = [int(pid) for pid in found.stdout.split()]
    if not pids:
        raise RuntimeError(f"Auf Port {port} läuft eine ältere Kommandozentrale; bitte beenden und neu starten.")
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    deadline = time.monotonic() + wait_seconds
    while _port_in_use(host, port):
        if time.monotonic() > deadline:
            raise RuntimeError(f"Die ältere Kommandozentrale auf Port {port} reagiert nicht; bitte von Hand beenden.")
        time.sleep(0.2)
    return str(health.get("root") or "unbekannter Ordner")

def main() -> None:
    load_dotenv(STATE_ROOT / ".env")
    parser = argparse.ArgumentParser(prog="pfefferminzia", description="Python-only Pfefferminzia workshop system")
    subparsers = parser.add_subparsers(dest="command", required=True)

    serve = subparsers.add_parser("serve", help="Start HTTP API, browser workspace, and Streamable HTTP MCP")
    serve.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"))
    serve.add_argument("--port", type=int, default=int(os.getenv("PORT", "3004")))
    serve.add_argument("--reload", action="store_true", help="Reload when Python files change")
    serve.add_argument("--open", action="store_true", help="Open the cockpit in the default browser once it runs")

    subparsers.add_parser("mcp", help="Run the MCP server over stdio")
    subparsers.add_parser("setup", help="Prepare the pinned Falk dataset and local workshop DB before starting Claude")
    subparsers.add_parser("data-init", help="Alias for setup; kept for existing workshop instructions")
    data_import = subparsers.add_parser("data-import", help="Verify and import the Falk dataset")
    data_import.add_argument("--force", action="store_true")
    reset = subparsers.add_parser("workshop-reset", help="Reset only local workshop fixtures")
    reset.add_argument("--confirm-demo-reset", action="store_true", required=True)
    subparsers.add_parser("sync", help="Import new AgentMail messages once")
    subparsers.add_parser("connect", help="Connect the personal inbox from the workshop key (read from stdin)")
    checkpoint = subparsers.add_parser("checkpoint", help="Inspect, verify, or safely prepare a workshop checkpoint")
    checkpoint_commands = checkpoint.add_subparsers(dest="checkpoint_command", required=True)
    checkpoint_commands.add_parser("list", help="List official checkpoint boundaries")
    checkpoint_commands.add_parser("status", help="Show the active checkpoint")
    verify = checkpoint_commands.add_parser("verify", help="Run the active checkpoint's fast checks")
    verify.add_argument("--external", action="store_true", help="Also verify the configured AgentMail inbox")
    activate = checkpoint_commands.add_parser("activate", help="Reset a fresh worktree to one checkpoint")
    activate.add_argument("checkpoint")
    activate.add_argument("--confirm-checkpoint-reset", action="store_true", required=True)
    adopt = checkpoint_commands.add_parser("adopt", help="Advance a copied worktree without resetting cases")
    adopt.add_argument("checkpoint")
    adopt.add_argument("--confirm-checkpoint-adopt", action="store_true", required=True)
    plan = checkpoint_commands.add_parser("plan", help="Plan a non-destructive recovery worktree")
    plan.add_argument("checkpoint")
    plan.add_argument("--mode", choices=("official", "continue"), default="official")
    apply = checkpoint_commands.add_parser("apply", help="Apply a prepared recovery-worktree plan")
    apply.add_argument("confirmation_token")
    apply.add_argument("--confirm-checkpoint-load", action="store_true", required=True)

    instructor = subparsers.add_parser("instructor", help="Instructor tools: inboxes, handouts, scenario mails, progress")
    instructor_commands = instructor.add_subparsers(dest="instructor_command", required=True)
    provision = instructor_commands.add_parser("provision", help="Create one inbox and inbox-scoped key per participant")
    provision.add_argument("--count", type=int, required=True)
    provision.add_argument("--prefix", default="pfefferminzia")
    provision.add_argument("--domain")
    provision.add_argument("--yes", action="store_true", help="Really create inboxes and keys")
    instructor_commands.add_parser("handouts", help="Write one paste-ready value sheet per participant")
    scenarios = instructor_commands.add_parser("scenarios", help="Print the scenario messages")
    scenarios.add_argument("drill", nargs="?", default=None)
    send = instructor_commands.add_parser("send", help="Send one drill's scenario mails to all participants")
    send.add_argument("drill", help="6, 7, 8, 9 or challenge")
    send.add_argument("--slot", action="append", help="Only this participant slot, e.g. 03 (repeatable)")
    send.add_argument("--yes", action="store_true", help="Really send; without it only the plan is shown")
    send.add_argument("--resend", action="store_true", help="Send again even if the log says it was sent")
    send.add_argument("--pause", type=float, default=2.0, help="Seconds between mails")
    instructor_commands.add_parser("addresses", help="Print all participant inbox addresses (for BCC)")
    mail_roster = instructor_commands.add_parser("mail-roster", help="Mail the slot/inbox/key assignment to one address")
    mail_roster.add_argument("to")
    mail_roster.add_argument("--slot", action="append", help="Only this slot, e.g. 17 (repeatable)")
    mail_roster.add_argument("--yes", action="store_true")
    lock = instructor_commands.add_parser("lock", help="Encrypt .instructor/ into instructor.vault (may be committed)")
    lock.add_argument("--password-stdin", action="store_true")
    unlock = instructor_commands.add_parser("unlock", help="Restore .instructor/ from instructor.vault")
    unlock.add_argument("--password-stdin", action="store_true")
    unlock.add_argument("--force", action="store_true", help="Overwrite an existing .instructor/")
    retag = instructor_commands.add_parser("retag", help="Point checkpoint tags at base and reference commits")
    retag.add_argument("--base", default="main")
    retag.add_argument("--reference", default="reference")
    retag.add_argument("--yes", action="store_true")
    status = instructor_commands.add_parser("status", help="Show which participant answered which scenario")
    status.add_argument("--json", action="store_true")

    args = parser.parse_args()
    if args.command == "serve":
        import threading
        import uvicorn
        import webbrowser

        try:
            replaced = _stop_running_pfefferminzia(args.host, args.port)
        except RuntimeError as error:
            print(error, file=sys.stderr)
            sys.exit(2)
        if replaced:
            print(f"Ältere Kommandozentrale beendet ({replaced}); starte die aktuelle.", file=sys.stderr)
        if args.open:
            threading.Timer(2.0, webbrowser.open, (f"http://{args.host}:{args.port}",)).start()
        uvicorn.run("pfefferminzia.app:app", host=args.host, port=args.port, reload=args.reload)
    elif args.command == "mcp":
        try:
            _initialize()
        except (OSError, RuntimeError, ValueError) as error:
            print(f"Pfefferminzia-MCP konnte nicht starten: {error}", file=sys.stderr)
            print("Bitte `uv run pfefferminzia setup` ausführen und die MCP-Verbindung erneut herstellen.", file=sys.stderr)
            sys.exit(2)
        from .mcp_server import mcp

        mcp.run()
    elif args.command in ("setup", "data-init"):
        from .inbox_setup import ensure_env_file

        env_created = ensure_env_file()
        if env_created:
            load_dotenv(STATE_ROOT / ".env")
        try:
            result = _initialize()
        except (OSError, RuntimeError, ValueError) as error:
            print(f"Pfefferminzia-Setup fehlgeschlagen: {error}", file=sys.stderr)
            sys.exit(2)
        from .agentmail_service import agentmail_configuration
        from .checkpoints import checkpoint_profile

        mail = agentmail_configuration(probe=False)
        missing_settings = [
            name for name, configured in (
                ("AGENTMAIL_API_KEY", mail["apiKeyConfigured"]),
                ("AGENTMAIL_INBOX_ID", mail["inboxIdConfigured"]),
                ("WORKSHOP_ALLOWED_RECIPIENTS", mail["allowedRecipientCount"] > 0),
            ) if not configured
        ]
        _json({
            "ok": True,
            "dataset": result,
            "checkpoint": checkpoint_profile()["name"],
            "agentMailConfigured": mail["ready"],
            "missingAgentMailSettings": missing_settings,
            "nextStep": (
                "Nach dem Workshop-Schlüssel vom Zettel fragen (beginnt mit am_) und ihn mit "
                "`uv run pfefferminzia connect` (Schlüssel über stdin) verbinden. Nur dieser eine Wert ist nötig."
                if missing_settings else
                "Kommandozentrale mit `uv run pfefferminzia serve --open` im Hintergrund starten."
            ),
        })
    elif args.command == "connect":
        from .inbox_setup import connect_inbox

        try:
            _json(connect_inbox(sys.stdin.read()))
        except ValueError as error:
            print(f"Fehler: {error}", file=sys.stderr)
            sys.exit(2)
    elif args.command == "data-import":
        from .upstream import ensure_falk_submodule, import_falk_dataset

        ensure_falk_submodule()
        _json(import_falk_dataset(force=args.force))
    elif args.command == "workshop-reset":
        from .seed import ensure_seed_data
        from .upstream import ensure_falk_submodule, import_falk_dataset
        from .workshop import reset_workshop_fixtures

        ensure_falk_submodule()
        import_falk_dataset()
        ensure_seed_data()
        _json(reset_workshop_fixtures())
    elif args.command == "sync":
        from .agentmail_service import sync_agentmail

        _initialize()
        _json(sync_agentmail())
    elif args.command == "checkpoint":
        from .checkpoint_loader import apply_checkpoint_load, plan_checkpoint_load
        from .checkpoints import activate_checkpoint, adopt_checkpoint, available_checkpoints, checkpoint_profile, verify_checkpoint

        if args.checkpoint_command == "list":
            _json(available_checkpoints())
        elif args.checkpoint_command == "status":
            _initialize()
            _json(checkpoint_profile())
        elif args.checkpoint_command == "verify":
            _initialize()
            result = verify_checkpoint(args.external)
            _json(result)
            if not result["ok"]:
                sys.exit(1)
        elif args.checkpoint_command == "activate":
            from .workshop import reset_workshop_fixtures

            _initialize()
            activate_checkpoint(args.checkpoint)
            reset_workshop_fixtures()
            _json(checkpoint_profile())
        elif args.checkpoint_command == "adopt":
            _initialize()
            _json(adopt_checkpoint(args.checkpoint))
        elif args.checkpoint_command == "plan":
            _json(plan_checkpoint_load(args.checkpoint, mode=args.mode))
        elif args.checkpoint_command == "apply":
            _json(apply_checkpoint_load(args.confirmation_token))
    elif args.command == "instructor":
        from . import instructor as tools
        from .scenarios import SCENARIOS, scenarios_for

        try:
            if args.instructor_command == "provision":
                _json(tools.provision(args.count, args.prefix, args.domain, execute=args.yes))
            elif args.instructor_command == "handouts":
                _json(tools.handouts())
            elif args.instructor_command == "scenarios":
                for item in scenarios_for(args.drill) if args.drill else SCENARIOS:
                    print(f"## Drill {item['drill'] or 'Challenge'} · {item['key']}\nBetreff: {item['subject']}\n\n{item['text']}\n\nErwartung: {item['expectation']}\n")
            elif args.instructor_command == "send":
                slots = [f"{int(slot):02d}" for slot in args.slot] if args.slot else None
                _json(tools.send_scenarios(args.drill, slots=slots, execute=args.yes, resend=args.resend, pause_seconds=args.pause))
            elif args.instructor_command == "addresses":
                print(tools.participant_addresses())
            elif args.instructor_command == "mail-roster":
                slots = [f"{int(slot):02d}" for slot in args.slot] if args.slot else None
                _json(tools.roster_email(args.to, execute=args.yes, slots=slots))
            elif args.instructor_command in ("lock", "unlock"):
                from . import vault

                password = (sys.stdin.readline().strip() if args.password_stdin else vault.password_from_environment())
                if not password:
                    import getpass

                    password = getpass.getpass("Tresor-Passwort: ")
                if args.instructor_command == "lock":
                    _json(vault.lock(password, tools.INSTRUCTOR_DIR))
                else:
                    _json(vault.unlock(password, tools.INSTRUCTOR_DIR, overwrite=args.force))
            elif args.instructor_command == "retag":
                _json(tools.retag(args.base, args.reference, execute=args.yes))
            elif args.instructor_command == "status":
                result = tools.progress()
                _json(result) if args.json else print(tools.format_progress(result))
        except ValueError as error:
            print(f"Fehler: {error}", file=sys.stderr)
            sys.exit(2)


if __name__ == "__main__":
    main()
