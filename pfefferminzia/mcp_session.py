"""The MCP server Claude keeps for a whole session.

Claude connects once per session, but a participant switches drills and
changes code during it. So every tool call runs in a short-lived process
with the code and drill as they are right now; the list of tools covers all
drills, and a tool the current drill has not unlocked says so.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any

from dotenv import dotenv_values
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ResourceError, ToolError
from mcp.types import CallToolResult

from .checkpoints import checkpoint_profile
from .constants import ROOT, STATE_ROOT
from .database import close_database
from .mcp_server import create_mcp_server

ENV_FILE = STATE_ROOT / ".env"
_file_keys: set[str] = set()


def refresh_environment() -> None:
    """Take the drill, auto-send policy and inbox settings from .env as they are now."""
    global _file_keys
    values = {key: value for key, value in dotenv_values(ENV_FILE).items() if value is not None} if ENV_FILE.is_file() else {}
    for key in _file_keys - set(values):
        os.environ.pop(key, None)
    os.environ.update(values)
    _file_keys = set(values)


class SessionServer(MCPServer):
    async def call_tool(self, name: str, arguments: dict[str, Any], context: Any = None) -> CallToolResult:
        refresh_environment()
        process = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "pfefferminzia.tool_call",
            cwd=ROOT, stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate(json.dumps({"name": name, "arguments": arguments}).encode())
        try:
            answer = json.loads(stdout.decode("utf-8").strip().splitlines()[-1])
        except (IndexError, json.JSONDecodeError) as error:
            detail = stderr.decode("utf-8", "replace").strip().splitlines()[-1:] or ["no output"]
            raise ToolError(f"Werkzeug {name} ist abgestürzt: {detail[0]}") from error
        if "toolError" in answer:
            raise ToolError(answer["toolError"])
        return CallToolResult.model_validate(answer["result"])

    async def read_resource(self, uri: Any, context: Any = None) -> Any:
        refresh_environment()
        address = str(uri)
        needed = "claims" if "://claims/" in address else "knowledge"
        profile = checkpoint_profile()
        close_database()
        if needed not in profile["capabilities"]:
            raise ResourceError(f"Diese Unterlagen sind in Drill {profile['drill']} ({profile['title']}) nicht freigeschaltet.")
        try:
            return await super().read_resource(uri, context)
        finally:
            # A drill switch may move the case database; never hold it open between calls.
            close_database()


def create_session_server() -> MCPServer:
    refresh_environment()
    server = create_mcp_server(every_drill=True, server_class=SessionServer)
    close_database()
    return server
