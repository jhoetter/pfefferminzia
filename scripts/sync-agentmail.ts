import "dotenv/config";
import { syncAgentMail } from "../server/agentmail";
import { ensureSeedData } from "../server/seed";

ensureSeedData();
const result = await syncAgentMail();
console.log(JSON.stringify(result, null, 2));
