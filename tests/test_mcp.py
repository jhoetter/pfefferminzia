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
}


@pytest.mark.asyncio
async def test_mcp_capability_surface():
    server = create_mcp_server()
    async with Client(server) as client:
        tools = await client.list_tools()
        names = [tool.name for tool in tools.tools]
        assert REQUIRED_TOOLS <= set(names)
        assert len(names) == len(set(names))
        templates = await client.list_resource_templates()
        uris = {str(resource.uri_template) for resource in templates.resource_templates}
        assert {"pfefferminzia://customers/{partnerId}", "pfefferminzia://contracts/{contractId}", "pfefferminzia://claims/{claimId}", "pfefferminzia://tariffs/{tariffId}"} <= uris
