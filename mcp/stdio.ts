import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureWorkshopClaims } from "../server/claims";
import { ensureSeedData } from "../server/seed";
import { importFalkDataset } from "../server/upstream";
import { createPfefferminziaMcpServer } from "./server";

importFalkDataset();
ensureSeedData();
ensureWorkshopClaims();

const server = createPfefferminziaMcpServer();
await server.connect(new StdioServerTransport());
console.error("Pfefferminzia MCP server ready (stdio)");
