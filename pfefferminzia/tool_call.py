"""Run one MCP tool call with the current code and drill (see mcp_session)."""

from __future__ import annotations

import asyncio
import json
import sys

from mcp.server.mcpserver.exceptions import ToolError

from .checkpoints import checkpoint_profile
from .mcp_server import create_mcp_server


def main() -> None:
    request = json.loads(sys.stdin.read())
    name, arguments = request["name"], request.get("arguments") or {}
    try:
        server = create_mcp_server()
        if name not in {tool.name for tool in asyncio.run(server.list_tools())}:
            profile = checkpoint_profile()
            raise ToolError(
                f"Das Werkzeug {name} ist in Drill {profile['drill']} ({profile['title']}) nicht freigeschaltet."
            )
        result = asyncio.run(server.call_tool(name, arguments))
        answer = {"result": result.model_dump(mode="json", by_alias=True, exclude_none=True)}
    except ToolError as error:
        cause = f" ({type(error.__cause__).__name__}: {error.__cause__})" if error.__cause__ else ""
        answer = {"toolError": f"{error}{cause}"}
    except Exception as error:  # noqa: BLE001 - report instead of crashing the session
        answer = {"toolError": f"{type(error).__name__}: {error}"}
    print(json.dumps(answer, ensure_ascii=False))


if __name__ == "__main__":
    main()
