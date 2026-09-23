from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from typing import Any

from dotenv import load_dotenv

from .constants import ROOT


def _json(value: Any) -> None:
    print(json.dumps(value, ensure_ascii=False, indent=2))


def _initialize() -> dict[str, Any]:
    from .claims import ensure_workshop_claims
    from .seed import ensure_seed_data
    from .upstream import import_falk_dataset
    from .workshop import ensure_workshop_fixtures

    upstream = import_falk_dataset()
    ensure_seed_data()
    ensure_workshop_claims()
    ensure_workshop_fixtures()
    return upstream


def main() -> None:
    load_dotenv(ROOT / ".env")
    parser = argparse.ArgumentParser(prog="pfefferminzia", description="Python-only Pfefferminzia workshop system")
    subparsers = parser.add_subparsers(dest="command", required=True)

    serve = subparsers.add_parser("serve", help="Start HTTP API, browser workspace, and Streamable HTTP MCP")
    serve.add_argument("--host", default=os.getenv("HOST", "127.0.0.1"))
    serve.add_argument("--port", type=int, default=int(os.getenv("PORT", "3004")))
    serve.add_argument("--reload", action="store_true", help="Reload when Python files change")

    subparsers.add_parser("mcp", help="Run the MCP server over stdio")
    subparsers.add_parser("data-init", help="Initialize the pinned Falk Git submodule")
    data_import = subparsers.add_parser("data-import", help="Verify and import the Falk dataset")
    data_import.add_argument("--force", action="store_true")
    reset = subparsers.add_parser("workshop-reset", help="Reset only local workshop fixtures")
    reset.add_argument("--confirm-demo-reset", action="store_true", required=True)
    subparsers.add_parser("sync", help="Import new AgentMail messages once")
    checkpoint = subparsers.add_parser("checkpoint", help="Inspect, verify, or safely prepare a workshop checkpoint")
    checkpoint_commands = checkpoint.add_subparsers(dest="checkpoint_command", required=True)
    checkpoint_commands.add_parser("list", help="List official checkpoint boundaries")
    checkpoint_commands.add_parser("status", help="Show the active checkpoint")
    verify = checkpoint_commands.add_parser("verify", help="Run the active checkpoint's fast checks")
    verify.add_argument("--external", action="store_true", help="Also verify the configured AgentMail inbox")
    activate = checkpoint_commands.add_parser("activate", help="Reset a fresh worktree to one checkpoint")
    activate.add_argument("checkpoint")
    activate.add_argument("--confirm-checkpoint-reset", action="store_true", required=True)
    plan = checkpoint_commands.add_parser("plan", help="Plan a non-destructive recovery worktree")
    plan.add_argument("checkpoint")
    apply = checkpoint_commands.add_parser("apply", help="Apply a prepared recovery-worktree plan")
    apply.add_argument("confirmation_token")
    apply.add_argument("--confirm-checkpoint-load", action="store_true", required=True)

    args = parser.parse_args()
    if args.command == "serve":
        import uvicorn

        uvicorn.run("pfefferminzia.app:app", host=args.host, port=args.port, reload=args.reload)
    elif args.command == "mcp":
        _initialize()
        from .mcp_server import mcp

        mcp.run()
    elif args.command == "data-init":
        subprocess.run(["git", "submodule", "update", "--init", "--recursive"], cwd=ROOT, check=True)
    elif args.command == "data-import":
        from .upstream import import_falk_dataset

        _json(import_falk_dataset(force=args.force))
    elif args.command == "workshop-reset":
        from .seed import ensure_seed_data
        from .upstream import import_falk_dataset
        from .workshop import reset_workshop_fixtures

        import_falk_dataset()
        ensure_seed_data()
        _json(reset_workshop_fixtures())
    elif args.command == "sync":
        from .agentmail_service import sync_agentmail

        _initialize()
        _json(sync_agentmail())
    elif args.command == "checkpoint":
        from .checkpoint_loader import apply_checkpoint_load, plan_checkpoint_load
        from .checkpoints import activate_checkpoint, available_checkpoints, checkpoint_profile, verify_checkpoint

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
        elif args.checkpoint_command == "plan":
            _json(plan_checkpoint_load(args.checkpoint))
        elif args.checkpoint_command == "apply":
            _json(apply_checkpoint_load(args.confirmation_token))


if __name__ == "__main__":
    main()
