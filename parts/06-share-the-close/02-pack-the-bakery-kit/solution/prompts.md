# How Claude made this answer

Claude Code makes the kit folder and copies your two skills into it. Then Claude Code itself checks the kit.

## The prompt you type

```text
Make a Claude Code plugin in kit/. Put the manifest at
kit/.claude-plugin/plugin.json with "name": "wren-street-kit",
"version": "1.0.0", a one line "description", and "license": "CC0-1.0".
Copy .claude/skills/allergen-label and .claude/skills/monday-report
into kit/skills/. The skills sit next to .claude-plugin/, not inside it.
Also add a hook. A hook is a small script that Claude Code runs on its
own, every time, before a tool runs. Make kit/hooks/hooks.json with a
PreToolUse hook, matcher "Write|Edit", that runs
${CLAUDE_PLUGIN_ROOT}/hooks/block-till.sh. Make that script read the tool
call from its input. If the file path has till/ in it, print a short reason
and exit with code 2. Otherwise exit 0.
```

## The plan Claude showed

1. Make `kit/.claude-plugin/plugin.json`.
2. Copy the two skill folders to `kit/skills/allergen-label/` and `kit/skills/monday-report/`.

You checked the second line said `kit/skills/`, not `kit/.claude-plugin/skills/`. You said yes.

## What you checked after

`claude plugin validate kit` printed `√ Validation passed`. It warned that there is no icon. A kit you hand to one new person needs no icon, so you left it.

Then `claude --plugin-dir kit` started Claude Code with the kit. Typing `/wren` showed both skills, named `wren-street-kit:allergen-label` and `wren-street-kit:monday-report`.

## What you would say no to

- Claude puts the skills inside `kit/.claude-plugin/`. Say no. Claude Code does not look for skills there.
- Claude names the kit "Wren Street Kit". Say no. Use dashes, not spaces.
- The hook script exits 0 for every path. Say no. Then it blocks nothing.
- Claude leaves out the version. Say no. The version tells a new person which kit they have.

Then run `bun run verify pack-the-bakery-kit`. All 11 rules pass.
