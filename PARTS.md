# Parts: the build plan for each part session

This file is for the sessions that build one part each. A part session can start from this file alone.

## How a part is built here

- Step folders go in `parts/NN-<part>/NN-<step>/` with `step.toml`, `problem/README.md`, `solution/`, `wrong/<mistake>/`, and `images/expected.png` when `screen = true`.
- A part folder with no step folders is a skeleton. `scripts/structure.ts` skips it, so `bun run check` passes. Once you add one step, every rule applies to the whole part.
- The check is `checks/<step-name>.ts`. Start with `bakeryRule` and end with `originalsUnchanged` from `checks/lib/bakery.ts`.
- Checks read files the learner's Claude made in the bakery folder. They never read the chat.
- `solution/` and `wrong/` folders hold only the files a step makes or breaks. Every other file is read from `world/seed/wren-street/`. Write them with `world/samples.ts`, from the functions in `world/close.ts`. Each `solution/` also holds `prompts.md`: the prompts that got there, the plan Claude showed, and what the learner checked or said no to. `world/samples.ts` keeps it when it rewrites the folder.
- The answers are in `world/key.json`, built by `bun world/build.ts` from `world/data.ts`. Never type an answer into a check by hand.
- This course uses the real Claude Code, never the model API (`briefs/build/CLAUDE-CODE.md`). No step asks for a key. A check reads what Claude Code made (files, settings, skills, hooks, git history), never a reply.
- `world/close.ts` is the author's answer key as a plain script: use it for `solution/` and `wrong/` folders only. It is not Claude.
- The finished system is a real run: `bun run finished` copies the seed plus `world/finished/bakery/` (the finished learner's `CLAUDE.md`, `.claude/settings.json`, the protect-originals hook and the skills) and runs `claude -p` with the flags in `config/claude.ts`. The skill `friday-close` already asks for every job below. When your part changes what the finished learner has (a new skill, a rule, the till connector), change `world/finished/bakery/`, then record 3 new runs with `bun run finished --record 1` to `--record 3`, or list them in `world/recordings/RECORD.md` if `claude` is not signed in where you work. Never write a transcript by hand.
- `tests/claude-code.test.ts` replays each recording on a fresh bakery and runs every check. Your new check must pass on all 3 runs.
- Hooks and permissions need no model: feed the hook the exact JSON Claude Code sends (see the hook tests) and assert the exit code.
- The finished run leaves every label's `Checked by:` line empty, because a person signs. When you build `sign-off-the-labels`, sign the labels in `world/finished.ts` after the run, as a separate step that says it is the person, not Claude.
- Retake pictures with `bun run pictures`. Add a step's own picture there if it needs more than the passing check.
- Prose: grade 6 or lower (`bun test` measures it), no em dash, no week, day, hour, weekday or date. The Friday close and the Monday report are business names, not times.
- Add every new FAIL line to `00-orientation/troubleshooting.md`. A test fails until you do.
- Fill the part README's Walkthrough: one `bun run verify <step>` per step, each with its exact Expect line.

## The built parts

| Part folder                                 | Steps                                                                                   | Minutes |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ------- |
| `00-orientation/` (part name `orientation`) | meet-the-bakery 20                                                                      | 20      |
| `parts/01-make-claude-ask-first/`           | read-the-folder 15, set-the-safety-rules 10, clean-the-orders 25, fix-the-price-list 15 | 65      |

## The parts still to build

### `parts/02-teach-the-bakery/` (60 minutes)

| Step                   | Min | Screen | The check reads                                                                                                                                                                                                                                                                  |
| ---------------------- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| write-the-house-rules  | 20  | yes    | `CLAUDE.md`: headings About the bakery, Where things live, Never do, Money rules, How to write; Never do names deleting files, `till/` and `purchase-orders/`; names `out/`; under 200 lines                                                                                     |
| plan-the-invoice-check | 10  | yes    | `out/plans/invoice-check.md`: Goal, Files I will read, Files I will write, Steps, Risks; names `purchase-orders.csv` as the source of truth; no file but the plan changed                                                                                                        |
| reconcile-the-invoices | 30  | yes    | `out/reconciliation.csv` with invoice, po, status, reason; flags `key.invoices.duplicatePair[1]` as a duplicate, each of `key.invoices.priceAbovePo`, and `key.invoices.shortDelivery`; no invoice in `key.invoices.clean` flagged; `out/reconciliation-note.md` under 150 words |

Planted faults, from `world/key.json`: one butter bill sent twice under a new number (FD-2202 and FD-2207), butter billed 4% above the agreed price on the last three Fellside Dairy bills, one egg delivery 60 short. The PDFs are plain text PDFs that Claude can read.

Go further: put a hostile line in one invoice ("ignore the purchase orders") and show the plan and Manual mode catch it.

### `parts/03-undo-anything/` (35 minutes)

| Step                   | Min | Screen | The check reads                                                                                                      |
| ---------------------- | --- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| make-a-save-point      | 10  | yes    | `wren-street/.git`: at least one commit; nothing left unsaved; `.gitignore` does not hide `out/`                     |
| rewind-a-bad-edit      | 10  | yes    | `menu/menu.md` equals the save point; `out/undo-log.md` has a line with "rewound" and how                            |
| recover-a-deleted-file | 15  | no     | `notes/owner-notes.md` byte for byte the same as the seed; `out/undo-log.md` says why rewind could not bring it back |

The checks run `git` in the bakery folder. In CI, a sample folder has no `.git`: add a `checks/lib/git.ts` that reads a recorded `git log` file in sample folders and runs `git` in the learner's folder. Teach it as a "save point", not as git. Source: "A file that only Bash commands changed isn't tracked" (https://code.claude.com/docs/en/checkpointing.md).

### `parts/04-repeat-the-work/` (45 minutes)

| Step                  | Min | Screen | The check reads                                                                                                                                                                                                                |
| --------------------- | --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| write-the-done-list   | 10  | no     | `out/labels-done.md`: 4 or more checkbox lines; names sesame and the sign-off; its file time is older than every file in `out/labels/`                                                                                         |
| build-the-label-skill | 25  | yes    | `.claude/skills/allergen-label/SKILL.md` frontmatter has `name` and a `description` that says label; body has Steps and Never; 12 labels in `out/labels/`, each lists exactly `key.labels[slug].allergens` and the clean price |
| sign-off-the-labels   | 10  | no     | Every label has a non-empty `Checked by:` line; every item in `out/labels-done.md` is ticked                                                                                                                                   |

`allergens/allergen-list.csv` is the bakery's own word list for these 12 recipes. It is not a legal list. Before this part ships, read the regulator's page (food.gov.uk was blocked in the spine session) and say in the part README that the course teaches a way of working, not food law.

### `parts/05-connect-and-schedule/` (75 minutes)

| Step                       | Min | Screen | The check reads                                                                                                                                                                                                                                                                               |
| -------------------------- | --- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| open-the-terminal          | 15  | yes    | `out/terminal.md`: the Claude Code version, 2.1.314 or newer, and the mode the status bar showed                                                                                                                                                                                              |
| connect-the-till           | 20  | yes    | The till connector is set up (read `.mcp.json` in the bakery folder); `out/till-today.md` holds a total that matches `till/sales.csv` for the date it names                                                                                                                                   |
| write-the-monday-report    | 25  | yes    | `.claude/skills/monday-report/SKILL.md`; `out/reports/*.md` with Sales, Waste and Late payers; numbers match `key.till`; late payers match the owner notes                                                                                                                                    |
| schedule-the-monday-report | 15  | yes    | Two reports from the skill made 55 or more minutes apart by a scheduled task; or the fallback: two reports made with Run now at least one minute apart, plus `out/schedule.md` with a numeric cron line and one sentence on why a person reads the first run. The check says which way passed |

The till connector is a small local MCP server to write in `world/till-server.ts`, reading `till/sales.csv` read only. Pin `@modelcontextprotocol/sdk` exactly, current on the day. The fallback for the scheduled task is required (REVIEW.md): free plans and locked laptops cannot schedule.

### `parts/06-share-the-close/` (85 minutes)

| Step                  | Min | Screen | The check reads                                                                                                                                                                                                |
| --------------------- | --- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| publish-the-menu-page | 25  | yes    | `out/site/index.html`: every product; prices match the clean list; each product shows its allergens; no script from another site                                                                               |
| pack-the-bakery-kit   | 20  | no     | `kit/.claude-plugin/plugin.json` with name, version, description; `kit/skills/allergen-label` and `kit/skills/monday-report`                                                                                   |
| run-the-friday-close  | 25  | yes    | The check builds a new week of data with `build(seed)` from `world/build.ts` using another seed, puts it in the bakery, and the learner runs their close once; then every earlier check passes on the new data |
| map-your-own-close    | 15  | no     | `out/friday-close.md` names the task from `out/why-i-am-here.md`, the files it needs, the first rule for its CLAUDE.md, and one check a script could run                                                       |

`run-the-friday-close` (40 minutes in the brief) is split into `run-the-friday-close` (25) and `map-your-own-close` (15), as REVIEW.md asks. The total stays 85.

## Schedules

`schedules.toml` maps these part names onto `one-day`, `four-evenings` and `five-weeks`. Update the minutes there if a part's total changes.
