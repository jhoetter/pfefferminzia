import pytest
from mcp import Client

from pfefferminzia.mcp_server import create_mcp_server


REQUIRED_TOOLS = {
    "get_data_source_status", "get_operations_summary", "get_workshop_status", "list_tickets", "get_ticket", "classify_ticket",
    "set_ticket_status", "draft_ticket_reply", "add_internal_note", "submit_ticket_reply", "approve_ticket_reply",
    "send_ticket_reply", "sync_agentmail", "search_customers", "get_customer", "get_contract", "resolve_ticket_customer",
    "link_ticket_customer", "link_ticket_contract", "list_tariffs", "read_tariff", "list_contract_documents",
    "list_ticket_attachments", "read_attachment", "list_claims", "get_claim", "create_claim_from_ticket",
    "propose_claim_action", "review_claim_action", "create_claim_task",
    "list_workshop_checkpoints", "get_drill_guide", "list_todos", "create_todo", "update_todo",
    "route_ticket", "reject_ticket_reply", "remove_from_send_queue", "advance_workshop_clock",
    "verify_workshop_checkpoint", "plan_checkpoint_load", "apply_checkpoint_load",
}


@pytest.mark.asyncio
async def test_mcp_capability_surface(monkeypatch):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-complete")
    server = create_mcp_server()
    async with Client(server) as client:
        tools = await client.list_tools()
        names = [tool.name for tool in tools.tools]
        assert REQUIRED_TOOLS <= set(names)
        assert len(names) == len(set(names))
        templates = await client.list_resource_templates()
        uris = {str(resource.uri_template) for resource in templates.resource_templates}
        assert {"pfefferminzia://customers/{partnerId}", "pfefferminzia://contracts/{contractId}", "pfefferminzia://claims/{claimId}", "pfefferminzia://tariffs/{tariffId}"} <= uris


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("checkpoint", "present", "absent"),
    [
        ("drill-08-start", {"create_todo", "sync_agentmail"}, {"draft_ticket_reply", "list_tariffs", "submit_ticket_reply", "route_ticket"}),
        ("drill-09-start", {"draft_ticket_reply", "list_tariffs", "send_ticket_reply"}, {"submit_ticket_reply", "approve_ticket_reply", "route_ticket"}),
        ("drill-10-start", {"submit_ticket_reply", "approve_ticket_reply", "list_claims"}, {"route_ticket", "remove_from_send_queue"}),
        ("drill-11-start", {"route_ticket", "remove_from_send_queue", "advance_workshop_clock"}, set()),
    ],
)
async def test_checkpoint_capabilities_are_not_exposed(monkeypatch, checkpoint, present, absent):
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", checkpoint)
    server = create_mcp_server()
    async with Client(server) as client:
        names = {tool.name for tool in (await client.list_tools()).tools}
        assert present <= names
        assert not (absent & names)
        template_uris = {str(item.uri_template) for item in (await client.list_resource_templates()).resource_templates}
        if checkpoint == "drill-08-start":
            assert not template_uris
        if checkpoint == "drill-09-start":
            assert not any("claims" in uri for uri in template_uris)
