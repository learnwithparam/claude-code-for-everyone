# Pictures

`bun run pictures` retakes every picture below from the real system, with Playwright's Chromium. The finished close is a replay of the recorded real Claude Code run in `world/recordings/close-1/`, so pictures cost no Claude usage.

| Picture                                    | What it shows                                                           | How it is made                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `images/finished-system.png`               | The finished Friday close page                                          | `bun run finished`, then a screenshot of `finished/index.html`            |
| `00-orientation/images/finished-close.png` | The same page, for the orientation                                      | as above                                                                  |
| `00-orientation/images/finished-run.png`   | The output of `bun run finished`                                        | the real output, drawn as a terminal                                      |
| `00-orientation/images/doctor.png`         | The output of `bun run doctor` on a computer with Claude Code signed in | the real output, drawn as a terminal                                      |
| `<step>/images/expected.png`               | The step's check passing                                                | `bun run verify <step>` on the finished close's work, drawn as a terminal |

## Pictures a person must take

These show the Claude desktop app. A script cannot open it, so none is in a page yet. A course author takes them on a Mac and on Windows, then adds them to the step README.

| Picture                                                  | Where it goes                                              | What to show                                          |
| -------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| The Code tab with `wren-street` open and the mode button | `00-orientation/README.md`, under "Or use the desktop app" | The folder button, the Local entry, the mode button   |
| The `/login` screen in the terminal                      | `00-orientation/README.md`, under "Get Claude Code"        | Claude Code asking which account to sign in with      |
| Plan mode chosen                                         | `read-the-folder`                                          | The mode button set to Plan                           |
| A permission prompt in Manual mode                       | `set-the-safety-rules`                                     | Claude asking before it makes `.claude/settings.json` |
| The diff card for `out/orders-clean.csv`                 | `clean-the-orders`                                         | The new file and its line count                       |
