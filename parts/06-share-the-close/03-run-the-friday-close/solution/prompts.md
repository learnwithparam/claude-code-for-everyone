# How Claude made this answer

Claude Code makes one skill for the whole close. Then you run that skill once, on the new folder.

## The prompt you type in wren-street

```text
Make a skill at .claude/skills/friday-close/SKILL.md, named
friday-close. Its description says: use it to run the Friday close.
Steps, in order, each writing only to out/: say what is in the
folder, clean the orders, fix the price list, check the invoices,
make the labels with allergen-label, write the report with
monday-report, and make the menu page. Add "## Never": never change
an original file, and never sign a label.
```

Claude showed the skill. Each step named the file it writes. You said yes.

## What you type next

```text
bun parts/06-share-the-close/next-close.ts
cd wren-street-next-close
claude
/friday-close
```

`next-close.ts` printed `Copied your setup from wren-street/: CLAUDE.md, .claude`.

## What Claude did, and what you checked

Claude worked through the seven steps. It asked before it ran each script and before it wrote each file. You checked these as it went:

- The clean orders had the new order numbers, not the ones from `wren-street`.
- The invoice check flagged the copied butter bill, the three butter bills above the agreed price, and the short egg delivery.
- The Multigrain Loaf label had sesame.
- The report's takings were the new till's takings, not the old ones.

## What you would say no to

- Claude copies `out/` from `wren-street`. Say no. Those are answers to old files.
- Claude asks to change a file in `orders/` or `till/`. Say no. Those are the record.
- Claude fills in "Checked by:" on a label. Say no. A person signs.

Then run `bun run verify run-the-friday-close` in the course folder. All 10 rules pass.
