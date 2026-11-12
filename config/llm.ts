// One call site for every model call in the repo. Ask for a role; the provider and id come from models.ts.
// In replay mode (the default) the reply comes from replays.json, so nothing needs a key or a network.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateText } from "ai";
import { KEY_NAME, MODELS, provider, type Role } from "./models";

const REPLAYS = join(import.meta.dir, "replays.json");
type Replays = Record<string, { role: Role; prompt: string; reply: string }>;

export const replayKey = (role: Role, prompt: string) =>
  createHash("sha256").update(`${role}\n${prompt}`).digest("hex").slice(0, 16);

function loadReplays(): Replays {
  return existsSync(REPLAYS) ? JSON.parse(readFileSync(REPLAYS, "utf8")) : {};
}

async function liveModel(role: Role) {
  const p = provider();
  if (p === "replay") throw new Error("replay has no live model");
  if (!process.env[KEY_NAME[p]]) throw new Error(`${KEY_NAME[p]} is not set. Add it to your .env file.`);
  const id = MODELS[p][role];
  if (p === "anthropic") return (await import("@ai-sdk/anthropic")).anthropic(id);
  if (p === "openai") return (await import("@ai-sdk/openai")).openai(id);
  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })(id);
}

// Ask a role for a short text reply.
export async function ask(role: Role, prompt: string): Promise<string> {
  const key = replayKey(role, prompt);
  if (provider() === "replay") {
    const hit = loadReplays()[key];
    if (!hit) throw new Error(`No recorded reply for this prompt (replay ${key}). Run with RECORD=1 and a live provider once.${process.env.SHOW_PROMPT ? `\nPROMPT ${role}: ${prompt}` : ""}`);
    return hit.reply;
  }
  const { text } = await generateText({ model: await liveModel(role), prompt, maxOutputTokens: 400 });
  if (process.env.RECORD === "1") {
    const all = loadReplays();
    all[key] = { role, prompt, reply: text.trim() };
    writeFileSync(REPLAYS, JSON.stringify(all, null, 2) + "\n");
  }
  return text.trim();
}
