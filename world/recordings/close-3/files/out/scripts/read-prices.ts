// Print the raw rows of prices/price-list.xlsx so we can see what needs fixing.
import { readXlsx } from "../../../../checks/lib/xlsx.ts";

const book = await readXlsx(new Uint8Array(await Bun.file("prices/price-list.xlsx").arrayBuffer()));
console.log(JSON.stringify(book, null, 1));
