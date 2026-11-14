# Claude Code for Everyone

Hand your real file work to Claude, and catch its mistakes before anyone else does. No coding.

This course is for people who run part of a business in sheets, PDFs and email: ops, finance, HR, admin and founders. You have never opened a terminal? That is fine.

After this course, you can give Claude a folder of business files and tell it the rules. You can check what it made with a script, and undo anything. You leave with a project that proves it.

## Start here

Claude Code is a helper you talk to in plain words. You type what you want. It reads your files and makes new ones. It asks before it changes anything.

You do not write code in this course. You paste prompts and read what comes back.

1. Install Claude Code and sign in. The [orientation](00-orientation/README.md) shows each click.
2. Open Claude Code in this course folder. The orientation shows how, in the app or in a terminal.
3. Paste each command below to Claude and add: "Please run this."

For example, to run the first command, you tell Claude: "Please run `bun install`."

## See the finished work first

You work in a made-up bakery, Wren Street Bakery. Here is the whole Friday close, done by the real Claude Code with the setup you will build. For a live run you need Claude Code signed in with your Claude account and a small tool called [Bun](https://bun.sh). The orientation shows how to get both. With no Claude Code, you see a run we saved from the real one.

```bash
bun install
```

Expect: a last line that says `packages installed`

```bash
bun run world
```

Expect: `Made the bakery folder: wren-street/`

```bash
bun run doctor
```

Expect: `Ready. Claude Code is installed and signed in.` (or a FAIL line that says what to fix)

```bash
bun run finished
```

Expect: `The Friday close ran.` and each check line says `PASS`

It copies the bakery, adds the finished house rules, safety rules, hook and skills, and runs `claude -p` on it. You see each thing Claude did, then every check reads the files Claude made. With no signed-in Claude Code, the first line says `Replaying` and you see a saved real run.

Open `finished/index.html` in your browser. You should see this:

![The finished Friday close: clean orders, flagged invoices, a fixed label, the report and the price fixes](images/finished-system.png)

Stuck on the Start here part? The [orientation](00-orientation/README.md) shows how to get Claude Code and how to run each command by asking Claude.

## What you work on

```mermaid
flowchart LR
  subgraph Bakery[The bakery folder: wren-street]
    O[Orders from three places]
    P[Price list]
    I[Supplier bills]
    R[Recipes and labels]
    T[(The till)]
  end
  You[You] -->|ask| C[Claude Code, in Manual mode]
  Bakery -->|read only| C
  C --> Out[New files in out/]
  Out --> V[Check]
  V -->|PASS| Next[Next step]
  V -->|FAIL and Try next| You
```

Jess owns the bakery. Her files are a mess, on purpose. Every mistake in them was put there by the course, so the checks know the right answer.

For example, the order sheet spells one cafe four ways: `Lumen Cafe`, `LUMEN CAFE`, `lumen cafe` and `Lumen Café`. You ask Claude to clean it. The check knows the one right name, `Lumen Cafe`, from `customers/cafes.csv`.

Claude never changes Jess's original files. It makes new files in `out/`. A check reads those files, not the chat, and says PASS or FAIL.

## The parts

| Part                                                                                      | What you learn                                                   | Steps                                                                                    | Minutes |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------- |
| [Orientation](00-orientation/README.md)                                                   | Get set up, meet the bakery, see the goal                        | meet-the-bakery                                                                          | 20      |
| [Make Claude ask before it acts](parts/01-make-claude-ask-first/README.md)                | Manual mode, safe settings, clean a sheet, fix a price list      | read-the-folder, set-the-safety-rules, clean-the-orders, fix-the-price-list              | 65      |
| [Teach Claude the bakery](parts/02-teach-the-bakery/README.md)                            | House rules, a plan first, check bills against orders            | write-the-house-rules, plan-the-invoice-check, reconcile-the-invoices                    | 60      |
| [Undo anything](parts/03-undo-anything/README.md)                                         | Save points, rewind, and what rewind cannot undo                 | make-a-save-point, rewind-a-bad-edit, recover-a-deleted-file                             | 35      |
| [Do it the same way every time](parts/04-repeat-the-work/README.md)                       | Say what done means first, then a skill, then sign off           | write-the-done-list, build-the-label-skill, sign-off-the-labels                          | 45      |
| [Connect it and let it run](parts/05-connect-and-schedule/README.md)                      | The terminal, a connector, a report that runs by itself          | open-the-terminal, connect-the-till, write-the-monday-report, schedule-the-monday-report | 75      |
| [Share it](parts/06-share-the-close/README.md)                                            | A web page, a kit for the next hire, the whole close on new data | publish-the-menu-page, pack-the-bakery-kit, run-the-friday-close, map-your-own-close     | 85      |
| [Ask questions of your files with DuckDB](parts/07-ask-questions-of-your-files/README.md) | Redo the invoice check as one query over two CSV files           | find-the-unmatched-invoices                                                              | 20      |

Each step has one check. To run it, ask Claude:

```text
Please check my work for clean-the-orders. Run bun run verify clean-the-orders and tell me what it printed. Do not change anything to make it pass.
```

Claude runs this command. You can paste it too:

```bash
bun run verify clean-the-orders
```

Expect: a PASS or FAIL line for each rule, and a `Try next:` line under each FAIL.

## The project

The Friday close. At the end, the check drops in a batch of orders and bills you have never seen. You run your close once. Every check must pass again.

You also map the close onto one task from your own job: its files, its first house rule, and one check a script could run.

## What you need

- A list of the ways of working with Claude Code that this course teaches: [ways of working](00-orientation/ways-of-working.md).
- Claude Code, signed in with your own Claude account: the `claude` command, Claude Code in your editor, or the Code tab of the Claude desktop app.
- A paid Claude plan: Pro, Max, Ultra, Team or Enterprise, or a Console account. The free plan has no Claude Code.
- No key. You sign in to Claude Code. The checks need no Claude at all: they read files.

## Read before you start

| Read                                                                                                    | By        | Why                                                |
| ------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------- |
| [How people are using Claude Cowork](https://claude.com/blog/how-people-are-using-claude-cowork)        | Anthropic | Most of this use is office work, not code.         |
| [Use Claude Cowork safely](https://support.claude.com/en/articles/13364135-use-claude-cowork-safely)    | Anthropic | The risks this course handles, one by one.         |
| [How AI agents shape experts' judgment calls](https://www.anthropic.com/research/agents-judgment-calls) | Anthropic | Why you say what done means before Claude answers. |

## For people who run the course

- `bun run check` proves the repo meets [STANDARD.md](STANDARD.md).
- `bun test` checks reading level and the help table.
- `bun run world reset` puts the bakery back. The old folder is kept.
- `bun run doctor` says if Claude Code is installed, new enough and signed in.
- `bun run finished --replay 2` shows a saved run. [world/recordings/RECORD.md](world/recordings/RECORD.md) says how each one was recorded.
- [PARTS.md](PARTS.md) lists every part, step and check.
