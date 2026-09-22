from __future__ import annotations

import argparse
import json
import os
import subprocess
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


if __name__ == "__main__":
    main()
