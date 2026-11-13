# How Claude made this answer

You add the connector with one command. Then Claude uses it and writes one file.

## What you type in the terminal

```text
claude mcp add till --scope project -- bun ../parts/05-connect-and-schedule/till-server.ts
claude
```

The first line printed `Added stdio MCP server till ... to project config` and made `.mcp.json`. When Claude Code started, it asked about the new MCP server `till`. You picked **Use this MCP server**. Then `/mcp` showed `till` as connected.

## The prompt you type

```text
Use the till connector, not the file. Find the last day the shop
was open. Then get the takings for that day. Write out/till-today.md
with the day as YYYY-MM-DD and the takings in pounds.
```

## What Claude did, and what you checked

1. Claude asked to use `till_days`. The name starts with `till`, so you said yes. The till said the last day was 2026-11-01.
2. Claude asked to use `till_day` for 2026-11-01. You said yes. The till said the takings were £474.35.
3. Claude asked to write `out/till-today.md`. You checked the day and the total matched what the till said. You said yes.

The till wrote each call to `out/till-log.jsonl`. That is how the check knows Claude used the connector.

## What you would say no to

- Claude asks to run `cat till/sales.csv` or to read the file. Say no. Ask it to use the connector.
- Claude writes the total for every day, £13,609.80. Say no. You asked for one day.
- Claude asks to edit `till/sales.csv`. Say no. The till is the record.

Then run `bun run verify connect-the-till`. All 7 rules pass.
