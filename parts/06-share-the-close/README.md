# Share it

## After this part you can

Share your work as a kit and a web page, run it on new files, and let it run by itself.

## You leave with

A menu page, a kit with two skills, a hook and a workflow file, one `friday-close` skill, and a `my-close/` folder with a log.

## The problem

Everything you built lives on one laptop. A new person could not run it, and the Friday close is still many small jobs. Anthropic's legal team packed their way of working into a plugin, then "pointed Claude at 742 Jira tickets, the full legal intake backlog" ([Anthropic](https://claude.com/resources/guides/deploying-claude-across-your-organization/how-anthropic-teams-use-cowork)). Here you share the work, prove it on files you have never seen, and put it on a timer.

```mermaid
flowchart LR
  F[The bakery folder] --> M[out/site/index.html]
  F --> K[kit/: the plugin]
  F --> C[The Friday close, one run]
  N[(New orders and bills)] --> C
  C --> V[Every check passes again]
  V --> S[/schedule/ on my own folder]
```

## Steps

| Step | What you make | What the check reads |
| ---- | ------------- | -------------------- |
| [publish-the-menu-page](01-publish-the-menu-page/problem/README.md) | `out/site/index.html` | Every product, the right price and allergens, works offline |
| [pack-the-bakery-kit](02-pack-the-bakery-kit/problem/README.md) | `kit/` with skills, a hook and a workflow file | The kit parses, the hook blocks the till, the workflow runs claude |
| [run-the-friday-close](03-run-the-friday-close/problem/README.md) | One skill, a `/batch` line, a run contract and metrics | Every earlier check passes on new files, and the three files are real |
| [map-your-own-close](04-map-your-own-close/problem/README.md) | `out/friday-close.md` | Your task, its files, a first rule, one check a script could run |
| [run-your-own-close](05-run-your-own-close/problem/README.md) | `my-close/` with your files, rules, results and a log | A copy, a Never rule, a result, a log with a `/schedule` line |

## Watch and read

| Kind | Title | Author | Why | Link |
| ---- | ----- | ------ | --- | ---- |
| read | Plugins overview | Anthropic docs | Shows how a kit of skills and hooks is built and shared. | <https://code.claude.com/docs/en/plugins> |
| read | Claude Code GitHub Actions | Anthropic docs | Shows how a workflow file runs Claude on a timer or by hand. | <https://code.claude.com/docs/en/github-actions> |
| read | Run Claude Code programmatically | Anthropic docs | Explains the print mode that runs a job with no one at the keyboard. | <https://code.claude.com/docs/en/headless> |
| read | Run prompts on a schedule | Anthropic docs | Explains how a task starts by itself, and what to watch. | <https://code.claude.com/docs/en/scheduled-tasks> |
| read | Building effective AI agents | Anthropic engineering | Says why simple, checked steps beat clever ones. | <https://www.anthropic.com/engineering/building-effective-agents> |

## Project

Pick one task from your own job. Run it on a copy in `my-close/`, write the log, and add a `/schedule` line that says when it runs. Then read the first two runs before you trust it.

## Walkthrough

Open a terminal in the course folder. Start Claude Code in `wren-street` for each job, as each step page shows. Run each check from the course folder.

To check, ask Claude to check your work. Say: "Please check my work for the step name. Run it and tell me what it printed. Do not change anything to make it pass." The commands below are what Claude runs. The [ways of working](../../00-orientation/ways-of-working.md) page lists every mode and command used here.

First, ask Claude for the menu page, from the clean prices and the new labels.

```bash
bun run verify publish-the-menu-page
```

Expect: `Done. All 7 rules pass.`

Next, ask Claude to pack both skills, a hook and a GitHub Action file into `kit/`. Claude Code checks the kit itself:

```bash
claude plugin validate wren-street/kit
```

Expect: a tick and the words Validation passed

```bash
bun run verify pack-the-bakery-kit
```

Expect: `Done. All 14 rules pass.`

Then make the `friday-close` skill, make the new folder, and run `/friday-close` in it once. Also save a `/batch` line, a run contract and a metrics file in `out/`.

```bash
bun parts/06-share-the-close/next-close.ts
```

Expect: `Made the next close: wren-street-next-close/`

```bash
bun run verify run-the-friday-close
```

Expect: `Done. All 13 rules pass.`

Then ask Claude to map the close onto your own task.

```bash
bun run verify map-your-own-close
```

Expect: `Done. All 7 rules pass.`

Last, run the close on a copy of your own files in `my-close/`, and write down when it runs by itself:

```bash
bun run verify run-your-own-close
```

Expect: `Done. All 10 rules pass.`

To check the whole part at once:

```bash
bun run verify part share-the-close
```

Expect: `Part share-the-close is done: 5/5 steps pass.`

## Assignment

The problem: the setup lives on one laptop, and the close takes a whole morning.

Hand in these files from your `wren-street` folder: `out/site/index.html`, `kit/`, `out/run-contract.md`, `out/metrics.md` and `out/friday-close.md`. Also hand in `wren-street-next-close/out/`.

Each question is yes or no:

1. Does `bun run verify run-the-friday-close` pass on the new files?
2. Does `claude plugin validate wren-street/kit` say it passed?
3. Does the menu page show sesame on the Multigrain Loaf?
4. Does `kit/friday-close.workflow.yml` use a secrets placeholder, not a real key?
5. Does your run log name a `/schedule` task?

To go further, build a second folder for another job, with its own planted mistakes. For example, a letting agent's rent list, with one rent paid twice.

## Finished

You now have a close that runs as one skill, on files it has never seen, with checks that prove it. You have a kit a new person can install, and a plan for your own job. This is the end of the course.
