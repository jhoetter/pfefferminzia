import { importFalkDataset } from "../server/upstream";
import { ensureSeedData } from "../server/seed";
import { ensureWorkshopClaims } from "../server/claims";

const result = importFalkDataset(undefined, process.argv.includes("--force"));
ensureSeedData();
ensureWorkshopClaims();
console.log(JSON.stringify(result, null, 2));
