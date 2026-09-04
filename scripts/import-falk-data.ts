import { importFalkDataset } from "../server/upstream";

const result = importFalkDataset(undefined, process.argv.includes("--force"));
console.log(JSON.stringify(result, null, 2));
