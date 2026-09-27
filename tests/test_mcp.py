import pytest
from mcp import Client

from pfefferminzia.mcp_server import create_mcp_server


REQUIRED_TOOLS = {
    "get_data_source_status", "get_operations_summary", "get_workshop_status", "list_tickets", "get_ticket", "classify_ticket",
    "set_ticket_status", "draft_ticket_reply", "add_internal_note", "submit_ticket_reply", "sync_agentmail", "search_customers", "get_customer", "get_contract", "resolve_ticket_customer",
    "link_ticket_customer", "link_ticket_contract", "list_tariffs", "read_tariff", "list_contract_documents",
    "list_ticket_attachments", "read_attachment", "list_claims", "get_claim", "create_claim_from_ticket",
    "propose_claim_action", "review_claim_action", "create_claim_task",
    "list_workshop_checkpoints", "get_drill_guide", "list_todos", "create_todo", "update_todo",
    "route_ticket", "remove_from_send_queue",
    "verify_workshop_checkpoint", "plan_checkpoint_load", "apply_checkpoint_load",
    "get_management_report_data",
}


HUMAN_ONLY = {"approve_ticket_reply", "reject_ticket_reply", "send_ticket_reply", "advance_workshop_clock"}


@pytest.mark.asyncio
async def test_mcp_capability_surface(monkeypatch):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-10-complete")
    server = create_mcp_server()
    async with Client(server) as client:
        tools = await client.list_tools()
        names = [tool.name for tool in tools.tools]
        assert REQUIRED_TOOLS <= set(names)
        # Human decisions and external effects live only in the cockpit.
        assert not HUMAN_ONLY & set(names)
        assert len(names) == len(set(names))
        by_name = {tool.name: tool for tool in tools.tools}
        assert "ticketNumber" in by_name["create_todo"].input_schema["properties"]
        assert "includeAdvanceTask" in by_name["get_drill_guide"].input_schema["properties"]
        assert "mode" in by_name["plan_checkpoint_load"].input_schema["properties"]
        templates = await client.list_resource_templates()
        uris = {str(resource.uri_template) for resource in templates.resource_templates}
        assert {"pfefferminzia://customers/{partnerId}", "pfefferminzia://contracts/{contractId}", "pfefferminzia://claims/{claimId}", "pfefferminzia://tariffs/{tariffId}"} <= uris


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("checkpoint", "present", "absent"),
    [
        ("drill-06-start", {"create_todo", "sync_agentmail", "draft_ticket_reply"}, {"list_tariffs", "submit_ticket_reply", "route_ticket"}),
        ("drill-07-start", {"draft_ticket_reply", "list_tariffs"}, {"submit_ticket_reply", "route_ticket"}),
        ("drill-08-start", {"submit_ticket_reply", "list_claims"}, {"route_ticket", "remove_from_send_queue"}),
        ("drill-09-start", {"route_ticket", "remove_from_send_queue"}, set()),
        ("drill-10-start", {"get_management_report_data"}, set()),
    ],
)
async def test_checkpoint_capabilities_are_not_exposed(monkeypatch, checkpoint, present, absent):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", checkpoint)
    server = create_mcp_server()
    async with Client(server) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
        assert present <= names
        assert not (absent & names)
        assert not (HUMAN_ONLY & names)
        if checkpoint != "drill-10-start":
            assert "get_management_report_data" not in names
        template_uris = {str(item.uri_template) for item in (await client.list_resource_templates()).resource_templates}
        if checkpoint == "drill-06-start":
            assert not template_uris
        if checkpoint == "drill-07-start":
            assert not any("claims" in uri for uri in template_uris)


@pytest.mark.asyncio
async def test_instructor_tools_exist_only_on_the_instructor_machine(monkeypatch, tmp_path):
    from pfefferminzia import instructor

    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    monkeypatch.setattr(instructor, "INSTRUCTOR_DIR", tmp_path)
    async with Client(create_mcp_server()) as client:
        assert not any(tool.name.startswith("instructor_") for tool in (await client.list_tools()).tools)

    (tmp_path / ".env").write_text("INSTRUCTOR_AGENTMAIL_API_KEY=org\nINSTRUCTOR_INBOX_ID=dozent@agentmail.to\n")
    (tmp_path / "roster.csv").write_text("slot,name,email,inbox_id,api_key\n01,A,pfm-01@agentmail.to,pfm-01@agentmail.to,k\n")
    async with Client(create_mcp_server()) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
        assert {"instructor_send_scenarios", "instructor_progress", "instructor_list_scenarios",
                "instructor_provision_inboxes", "instructor_write_handouts"} <= names
        plan = await client.call_tool("instructor_send_scenarios", {"drill": "9"})
        assert "Nichts gesendet" in plan.content[0].text
        assert "pfm-01@agentmail.to" in plan.content[0].text
