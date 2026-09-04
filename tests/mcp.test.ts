import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createPfefferminziaMcpServer } from "../mcp/server";
import { createApp } from "../server/app";

const requiredTools = [
  "get_data_source_status", "get_operations_summary", "list_tickets", "get_ticket", "classify_ticket",
  "set_ticket_status", "draft_ticket_reply", "add_internal_note", "submit_ticket_reply", "approve_ticket_reply",
  "send_ticket_reply", "sync_agentmail", "search_customers", "get_customer", "get_contract",
  "resolve_ticket_customer", "link_ticket_customer", "link_ticket_contract", "list_tariffs", "read_tariff",
  "list_contract_documents", "list_ticket_attachments", "read_attachment", "list_claims", "get_claim",
  "create_claim_from_ticket", "propose_claim_action", "review_claim_action", "create_claim_task",
];

describe("MCP capability surface", () => {
  it("exposes every workshop domain through the shared MCP registry", async () => {
    const server = createPfefferminziaMcpServer();
    const client = new Client({ name: "registry-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.listTools();
    const names = result.tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(requiredTools));
    expect(names).toHaveLength(new Set(names).size);
    expect((await client.listResourceTemplates()).resourceTemplates.map((resource) => resource.uriTemplate)).toEqual(expect.arrayContaining([
      "pfefferminzia://customers/{partnerId}", "pfefferminzia://contracts/{contractId}",
      "pfefferminzia://claims/{claimId}", "pfefferminzia://tariffs/{tariffId}",
    ]));
    await client.close();
    await server.close();
  });

  it("serves the same registry over stateless Streamable HTTP", async () => {
    const httpServer = createApp().listen(0, "127.0.0.1");
    await once(httpServer, "listening");
    const port = (httpServer.address() as AddressInfo).port;
    const client = new Client({ name: "http-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`)));
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(requiredTools));
    await client.close();
    await new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
  });
});
