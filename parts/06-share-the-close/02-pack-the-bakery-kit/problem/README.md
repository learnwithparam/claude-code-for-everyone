# Pack the bakery kit

## The problem

Your skills live on your laptop. A new person has none, so their labels come out different. A plugin is a kit you hand on: one folder of skills. Anthropic's legal team built theirs "in an afternoon, not by coding anything" ([Anthropic](https://claude.com/resources/guides/deploying-claude-across-your-organization/how-anthropic-teams-use-cowork)).

```mermaid
flowchart TB
  K[kit/] --> M[.claude-plugin/plugin.json]
  K --> S[skills/]
  K --> H[hooks/]
  K --> W[friday-close.workflow.yml]
```

## Watch it done

For example, before the kit, a new person types `/wren` and sees nothing. After it, they see both skills, and the hook stops an edit to the till:

```text
wren-street-kit:allergen-label
wren-street-kit:monday-report
Blocked: till/ is the record. Do not edit it.
```

## Your turn

A **hook** is a small script that Claude Code runs by itself, every time, before a tool runs. Make one that guards `till/sales.csv`.

1. In Claude Code, inside `wren-street`, paste this:

```text
Make kit/hooks/hooks.json with a PreToolUse hook, matcher "Write|Edit",
that runs ${CLAUDE_PLUGIN_ROOT}/hooks/block-till.sh. Make that script read
the tool call from its input. If the file path has till/ in it, print a
short reason and exit with code 2. Otherwise exit 0.
```

Expect: a plan with two files in `kit/hooks/`. Say yes, then `/exit`.

2. Try the script by hand on the till file:

```bash
echo '{"tool_input":{"file_path":"till/sales.csv"}}' | bash kit/hooks/block-till.sh; echo $?
```

Expect: a short reason, then `2`.

3. Change `till/sales.csv` to `out/notes.md` and run it again.

Expect: no reason, then `0`.

## Do it on your work

Now pack the whole kit, and add a **GitHub Action**: a file that tells GitHub to run a job for you. Its timer is a **cron** line: minute, hour, day, month, weekday. Paste this:

```text
In kit/, make .claude-plugin/plugin.json with "name": "wren-street-kit",
"version": "1.0.0" and a one line "description". Copy the skills
allergen-label and monday-report from .claude/skills/ into kit/skills/.
Then save kit/friday-close.workflow.yml, not under .github/. It runs on
a schedule and on workflow_dispatch, and one step runs claude -p to do
the Friday close. Take the key from a secrets placeholder, never a real key.
```

Good looks like these two lines in the file:

```yaml
- cron: "0 7 * * 5"
ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

Then check the kit:

```bash
claude plugin validate kit
```

Expect: a tick and the words Validation passed. Warnings about an icon can stay.

## Done when

- `plugin.json` has a name with dashes, a version number and a description.
- `kit/skills/` holds both skills, and none sit inside `.claude-plugin/`.
- The hook stops an edit to `till/` and lets other edits through.
- The workflow file has a schedule or workflow_dispatch, a step that runs claude, and a secrets placeholder.

To check, ask Claude: "Please check my work for pack-the-bakery-kit. Run the command and tell me what it printed. Do not change anything to make it pass." It runs:

```bash
bun run verify pack-the-bakery-kit
```

Expect: `Done. All 14 rules pass.`

## Solution

The finished kit is in `solution/kit/`. The prompt is in `solution/prompts.md`.

## If you get stuck

| What you see                                | Try this                                                       |
| ------------------------------------------- | -------------------------------------------------------------- |
| `FAIL  the workflow has a step that runs claude` | Ask Claude to add a `run:` line with `claude -p`.       |
| The `/wren` menu is empty                   | Start with `claude --plugin-dir kit` from `wren-street`.       |

## Words you will use

- **Plugin**: a folder of skills that someone else can install.
- **Secret**: a key GitHub keeps for you, so it is never written in a file.
