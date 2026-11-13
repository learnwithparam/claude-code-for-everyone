# How Claude made this answer

Claude Code makes the kit folder and copies your two skills into it. Then Claude Code itself checks the kit.

## The prompt you type

```text
Make a Claude Code plugin in kit/. Put the manifest at
kit/.claude-plugin/plugin.json with "name": "wren-street-kit",
"version": "1.0.0", a one line "description", and "license": "CC0-1.0".
Copy .claude/skills/allergen-label and .claude/skills/monday-report
into kit/skills/. The skills sit next to .claude-plugin/, not inside it.
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
- Claude leaves out the version. Say no. The version tells a new person which kit they have.

Then run `bun run verify pack-the-bakery-kit`. All 8 rules pass.
