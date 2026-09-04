import { ensureSeedData } from "../server/seed";
import { importFalkDataset } from "../server/upstream";
import { resetWorkshopFixtures } from "../server/workshop";

if (!process.argv.includes("--confirm-demo-reset")) {
  throw new Error("Refusing to reset without --confirm-demo-reset. Only synthetic demo tickets and local workshop claims are affected.");
}

importFalkDataset();
ensureSeedData();
console.log(JSON.stringify(resetWorkshopFixtures(), null, 2));
