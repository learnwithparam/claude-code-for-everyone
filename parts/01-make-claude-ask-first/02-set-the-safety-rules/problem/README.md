# Set the safety rules

## The problem

The mode button resets when you start a new chat. Some plans start in Auto mode. In Auto mode, Claude does not ask you first.

You want the safe choice to be the one you get without trying. So you ask Claude to save it in a settings file. Claude reads it each time it opens this folder.

```mermaid
flowchart TB
  S[.claude/settings.json] --> M[Start in Manual mode]
  S --> B[Never write outside wren-street]
  M --> A[Claude asks you first]
  B --> A
```

## Your challenge

Keep the mode on **Manual**. Paste this to Claude:

```text
Make the file .claude/settings.json in this folder with this in it:
{
  "permissions": {
    "defaultMode": "default",
    "blockWritesOutsideWorkingDirectories": true,
    "deny": ["Read(../checks/**)"]
  }
}
```

The word `default` is the name the file uses for Manual mode.

For example, say Claude tries to save a file in your Documents folder. The second rule stops it. Claude can only write inside `wren-street`.

The `deny` line keeps Claude from reading the `checks` folder next to your work. That folder holds the answer key, and a step should pass because you did the work.

Then ask Claude for a short note that says how you work. Paste this:

```text
Make out/safety.md. Say that I work in Manual mode. Add a heading
"## Claude will ask me before" and list two things, each on a line
that starts with a dash.
```

Now start a new chat in the same folder. Look at the mode button. It should say **Manual**.

## Done when

- `.claude/settings.json` is there and is valid.
- It starts Claude in Manual mode.
- It stops Claude from writing outside the bakery folder.
- `out/safety.md` names Manual mode and lists 2 things Claude will ask about.
- No original file has changed.

To check, ask Claude:

```text
Please check my work for set-the-safety-rules. Run bun run verify set-the-safety-rules and tell me what it printed. Do not change anything to make it pass.
```

It runs:

```bash
bun run verify set-the-safety-rules
```

Expect: `Done. All 7 rules pass.`

![The check passes](../images/expected.png)

## If you get stuck

| What you see                                         | Try this                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `FAIL .claude/settings.json is there and is valid`   | Look for a comma after the last line in a block. Take it out. |
| `FAIL Claude starts in Manual mode`                  | The value must be `default`, not `auto` or `manual`.          |
| `FAIL Claude cannot write outside the bakery folder` | Add the second line, with the value `true`.                   |
| `FAIL out/safety.md lists 2 things`                  | Check the heading words and the dashes.                       |

## Words you will use

- **Settings file**: a file that tells Claude how to behave in this folder.
- **Auto mode**: Claude decides what is safe and does not ask you.
- **Valid**: written the right way, so the app can read it.
