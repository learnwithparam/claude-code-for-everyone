// The only file that names a model. Code asks for a role (fast, smart, judge), never an id.
// The provider comes from LLM_PROVIDER: replay (the default, no key), anthropic, openrouter or openai.
// Ids read from briefs/MODELS.md on the build date. Change a model here and nowhere else.
export type Role = "fast" | "smart" | "judge";
export type Provider = "replay" | "anthropic" | "openrouter" | "openai";

export const MODELS: Record<Exclude<Provider, "replay">, Record<Role, string>> = {
  anthropic: { fast: "claude-haiku-5-5", smart: "claude-sonnet-5-5", judge: "claude-haiku-5-5" },
  openrouter: {
    fast: "nvidia/nemotron-3.5-lightning",
    smart: "anthropic/claude-sonnet-5.5",
    judge: "anthropic/claude-haiku-5.5",
  },
  openai: { fast: "gpt-6-luna", smart: "gpt-6-luna-pro", judge: "gpt-6-luna" },
};

// The key each provider reads from your git-ignored .env file.
export const KEY_NAME: Record<Exclude<Provider, "replay">, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function provider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "replay").trim().toLowerCase();
  if (p === "replay" || p === "anthropic" || p === "openrouter" || p === "openai") return p;
  throw new Error(`LLM_PROVIDER is "${p}". Use replay, anthropic, openrouter or openai.`);
}
