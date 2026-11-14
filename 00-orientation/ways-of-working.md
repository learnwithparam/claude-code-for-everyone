# Ways of working with Claude Code

This page lists every Claude Code technique the course teaches. Each one links to the step that teaches it. Come back here when you forget a key or a command.

For example, you forget how to switch to Plan mode. Find **Plan mode** below, then follow the link to the step.

## Modes

- **Manual mode.** Claude asks before it changes anything. Read what it will do, then say yes or no. Taught in [read-the-folder](../parts/01-make-claude-ask-first/01-read-the-folder/problem/README.md) and [set-the-safety-rules](../parts/01-make-claude-ask-first/02-set-the-safety-rules/problem/README.md).
- **Auto mode.** Claude acts without asking. The course only describes it and never turns it on. Taught in [set-the-safety-rules](../parts/01-make-claude-ask-first/02-set-the-safety-rules/problem/README.md).
- **Plan mode.** Claude reads and makes a plan, and changes nothing. In the app, use the mode button. Taught in [read-the-folder](../parts/01-make-claude-ask-first/01-read-the-folder/problem/README.md) and [plan-the-invoice-check](../parts/02-teach-the-bakery/02-plan-the-invoice-check/problem/README.md).
- **Shift+Tab.** In the terminal, press it to change the mode. The status bar under the box shows which mode you are in. Taught in [open-the-terminal](../parts/05-connect-and-schedule/01-open-the-terminal/problem/README.md).

## Saved settings and memory

- **A safe start.** The file `.claude/settings.json` holds the mode and the files Claude may not touch. Taught in [set-the-safety-rules](../parts/01-make-claude-ask-first/02-set-the-safety-rules/problem/README.md).
- **House rules.** The file `CLAUDE.md` is Claude's memory of your rules. Type `/memory` to open it. Taught in [write-the-house-rules](../parts/02-teach-the-bakery/01-write-the-house-rules/problem/README.md).

## Ask in a better way

- **Ask for the problems first.** Ask for a list of what is wrong, agree on it, then ask for the fix. Taught in [clean-the-orders](../parts/01-make-claude-ask-first/03-clean-the-orders/problem/README.md) and [fix-the-price-list](../parts/01-make-claude-ask-first/04-fix-the-price-list/problem/README.md).
- **Say what done means first.** Write the done list, then do the work. Taught in [write-the-done-list](../parts/04-repeat-the-work/01-write-the-done-list/problem/README.md).

## Undo

- **Save points.** Ask Claude to make a save point in plain words. Taught in [make-a-save-point](../parts/03-undo-anything/01-make-a-save-point/problem/README.md).
- **Rewind.** Type `/rewind`, or press Esc twice, then pick **Restore code**. Taught in [rewind-a-bad-edit](../parts/03-undo-anything/02-rewind-a-bad-edit/problem/README.md).
- **What rewind cannot undo.** It cannot undo what a command did. Taught in [recover-a-deleted-file](../parts/03-undo-anything/03-recover-a-deleted-file/problem/README.md).

## Start, sign in and leave

- **Open Claude Code in a folder.** Type `claude` in a terminal, and say yes to the trust question. Taught in [open-the-terminal](../parts/05-connect-and-schedule/01-open-the-terminal/problem/README.md).
- **Sign in and exit.** Type `/login` to sign in and `/exit` to leave. Taught in the [orientation](README.md).
- **Start a new chat.** Do this so Claude loads a new skill. Taught in [build-the-label-skill](../parts/04-repeat-the-work/02-build-the-label-skill/problem/README.md) and [write-the-monday-report](../parts/05-connect-and-schedule/03-write-the-monday-report/problem/README.md).

## Skills, connectors and plugins

- **Skills.** A skill is a file named `SKILL.md` that holds steps Claude follows. You run it with `/name`. Taught in [build-the-label-skill](../parts/04-repeat-the-work/02-build-the-label-skill/problem/README.md), [write-the-monday-report](../parts/05-connect-and-schedule/03-write-the-monday-report/problem/README.md) and [run-the-friday-close](../parts/06-share-the-close/03-run-the-friday-close/problem/README.md).
- **Connectors.** A connector lets Claude ask another system, such as the till. Type `/mcp` to see which are on. Taught in [connect-the-till](../parts/05-connect-and-schedule/02-connect-the-till/problem/README.md).
- **Scheduled tasks.** A task runs by itself in the desktop app, and you can use Run now. Taught in [schedule-the-monday-report](../parts/05-connect-and-schedule/04-schedule-the-monday-report/problem/README.md).
- **Plugins.** A plugin packs your setup for the next person. Taught in [pack-the-bakery-kit](../parts/06-share-the-close/02-pack-the-bakery-kit/problem/README.md).

## Check the work

Ask Claude: "Please check my work for the step name. Run it and tell me what it printed. Do not change anything to make it pass." Every step page shows the exact words. Start with [meet-the-bakery](meet-the-bakery/problem/README.md).
