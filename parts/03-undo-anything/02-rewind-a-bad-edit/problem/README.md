# Rewind a bad edit

## The problem

Claude will sometimes change a file in a way you did not want. For example, it changes the Sourdough Loaf price on the wall menu from £4.00 to £4.20. Now the menu is wrong, and a customer pays too much.

Claude Code keeps a **checkpoint** before each prompt you send. **Rewind** takes the files back to one of those checkpoints. It undoes the edits Claude made with its own file tools.

In this step, you make a bad edit on purpose. Then you undo it with rewind.

```mermaid
flowchart LR
  A[Checkpoint before your prompt] --> E[Claude edits menu.md]
  E --> R[You type /rewind]
  R --> B[menu.md is back as it was]
  B --> L[A line in out/undo-log.md]
```

## Your challenge

Rewind is in Claude Code in the terminal. Open a terminal in `wren-street` and type `claude`. Then paste this:

```text
This is a practice edit. I will undo it.
In menu/menu.md, change the Sourdough Loaf price to £4.20.
```

Claude asks first. Say yes. Then open `menu/menu.md`. It says £4.20.

Now undo it. Type `/rewind`, or press Esc twice. A list of your prompts opens. Pick the practice edit prompt. Choose **Restore code**. The menu says £4.00 again.

Then paste this:

```text
Start out/undo-log.md with the heading "Undo log". Add this line:
- menu.md: Claude changed the Sourdough Loaf price to £4.20.
I rewound with /rewind and Restore code. The menu is back to £4.00.
```

## Done when

- `menu/menu.md` is the same as at the save point.
- `out/undo-log.md` has a line that says "rewound" and how.

To check, ask Claude:

```text
Please check my work for rewind-a-bad-edit. Run bun run verify rewind-a-bad-edit and tell me what it printed. Do not change anything to make it pass.
```

It runs:

```bash
bun run verify rewind-a-bad-edit
```

Expect: `Done. All 4 rules pass.`

![The check passes after the rewind](../images/expected.png)

## If you get stuck

| What you see                                         | Try this                                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `FAIL menu/menu.md is the same as at the save point` | Claude typed the menu back in, and a small thing changed. Rewind it instead.     |
| The rewind list has no **Restore code**              | You picked a prompt with no file change after it. Pick the practice edit prompt. |

## Words you will use

- **Checkpoint**: what Claude Code saves before each prompt you send.
- **Rewind**: go back to a checkpoint. Type `/rewind`, or press Esc twice.
- **Restore code**: the rewind choice that puts the files back.
