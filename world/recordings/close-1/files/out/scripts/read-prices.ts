// Print the price list rows so we can see what needs fixing.
import { readXlsx } from "../../../../checks/lib/xlsx.ts";
const rows = readXlsx(new Uint8Array(await Bun.file("prices/price-list.xlsx").arrayBuffer()));
for (const r of rows) console.log(JSON.stringify(r));
