// Print the text of every invoice PDF, using pdftotext.
import { readdirSync } from "node:fs";
for (const f of readdirSync("invoices").filter((f) => f.endsWith(".pdf")).sort()) {
  const text = Bun.spawnSync(["pdftotext", "-layout", `invoices/${f}`, "-"]).stdout.toString();
  console.log(`=== ${f}\n${text.trim()}`);
}
