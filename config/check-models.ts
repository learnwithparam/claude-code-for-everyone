// bun run models: one tiny call per role on the chosen provider. Prints role, provider, pass or fail. Never a key.
import { provider, type Role } from "./models";
import { ask } from "./llm";

const p = provider();
let failed = 0;
for (const role of ["fast", "smart", "judge"] as Role[]) {
  const started = Date.now();
  try {
    const reply = p === "replay" ? "OK" : await ask(role, "Reply with the single word OK.");
    const ok = /\bok\b/i.test(reply);
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  role ${role}  provider ${p}  ${Date.now() - started} ms`);
  } catch (e) {
    failed++;
    console.log(`FAIL  role ${role}  provider ${p}  ${(e as Error).message}`);
  }
}
console.log(failed ? `${failed} role(s) failed. See 00-orientation/troubleshooting.md.` : `Every role answers on ${p}.`);
process.exit(failed ? 1 : 0);
