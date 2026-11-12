# When something goes wrong

Find the words you see in the first column. Each message any course script can print is here.

## Getting set up

| What you see | What it means | Fix |
|---|---|---|
| `bun: command not found` or `'bun' is not recognized` | Bun is not installed, or the app has not found it yet. | Run the Bun command from the start page. Then quit the Claude app and open it again. |
| `Prompt to upgrade` when you click the Code tab | The free plan has no Code tab. | Use a Pro, Max, Ultra, Team or Enterprise plan. |
| `'irm' is not recognized` | You pasted the Windows command into the old Command Prompt. | Paste it into PowerShell, or ask Claude to run it. |
| `error: Script not found "verify"` | Claude is not in the course folder or the bakery folder. | Open the course folder, or the `wren-street` folder inside it. |
| `Cannot find package` | The parts the checks need are not there yet. | Run `bun install` in the course folder. |

## The bakery folder

| What you see | What it means | Fix |
|---|---|---|
| `Made the bakery folder: wren-street/` | It worked. | Go on. |
| `The bakery folder is already here: wren-street/` | You made it before. Your work is safe. | Go on. To start again, run `bun run world reset`. |
| `Kept your old folder as wren-street-backup-1/` | Reset put your old work aside, and made a fresh bakery. | Nothing to fix. Copy files back from the backup if you need them. |
| `There is no bakery folder yet. Run: bun run world` | You have not made the bakery yet. | Run `bun run world`. |
| `Changed or missing originals: ...` | A file that came with the bakery was changed or deleted. | Run `bun run world reset`. Your old folder is kept. |
| `There is no world command called "..."` | The word after `bun run world` is not one it knows. | Use `bun run world`, `bun run world reset` or `bun run world status`. |

## The finished close and the model

| What you see | What it means | Fix |
|---|---|---|
| `The Friday close ran.` and a `FAIL` line under it | The finished close made something a check does not accept. | This is a bug in the course. Open an issue with the full output. |
| `No recorded reply for this prompt` | Replay mode has no saved answer for a question the close asked. | This is a bug in the course. Open an issue. Replay needs no key. |
| `LLM_PROVIDER is "..."` | The provider name in your `.env` file is not one the course knows. | Use replay, anthropic, openrouter or openai. |
| `ANTHROPIC_API_KEY is not set` (or OPENROUTER, OPENAI) | You picked a live provider but gave no key. | Add the key to `.env`, or set `LLM_PROVIDER=replay`. |
| `FAIL  role fast  provider ...` | `bun run models` could not reach that provider. | Check the key in `.env`. Or use replay, which needs no key. |

## The checks

| What you see | What it means | Fix |
|---|---|---|
| `There is no step called "..."` | The step name is spelled wrong. | Copy a name from the list it prints. |
| `Name a step. Steps:` | You ran the check with no step name. | Add a step name, like `bun run verify clean-the-orders`. |
| `There is no part called "..."` | The part name is spelled wrong. | Copy a name from the list it prints. |
| `ERROR  the check for ... could not load` | The check itself is broken, not your work. | Open an issue with the full output. |
| `... of ... rules pass. Fix the FAIL lines and run it again.` | Some rules failed. | Read the `Try next:` line under each FAIL. |
| `FAIL  .claude/settings.json is there and is valid` | The check did not find this in your work. | Ask Claude to make .claude/settings.json and check it has no extra commas. |
| `FAIL  Claude cannot write outside the bakery folder` | The check did not find this in your work. | Inside "permissions" set "blockWritesOutsideWorkingDirectories" to true. |
| `FAIL  Claude starts in Manual mode (defaultMode is default)` | The check did not find this in your work. | Inside "permissions" set "defaultMode" to "default", which is Manual mode. |
| `FAIL  each cafe has one spelling, from customers/cafes.csv (6 cafes)` | The check did not find this in your work. | Ask Claude to use the exact names in customers/cafes.csv for every row. |
| `FAIL  every date is the right date (phone orders are day first)` | The check did not find this in your work. | Phone orders put the day first; read the Dates part of notes/owner-notes.md. |
| `FAIL  every date is written YYYY-MM-DD` | The check did not find this in your work. | Ask Claude to write every date as year, month, day: YYYY-MM-DD. |
| `FAIL  every original bakery file is the same as the start` | The check did not find this in your work. | Run bun run world status to see what changed, then bun run world reset. |
| `FAIL  every price is a number in pounds, and the right one` | The check did not find this in your work. | Look for a price in pence, like 280, and save prices as numbers, not text. |
| `FAIL  every product name matches its recipe (12 products)` | The check did not find this in your work. | Compare each name with the first line of its file in recipes/ and fix the spelling. |
| `FAIL  every quantity is a whole number, and the right one` | The check did not find this in your work. | Ask Claude to turn words like "two dozen" into numbers, like 24. |
| `FAIL  every row is priced for one item (unit is "each")` | The check did not find this in your work. | Find the row priced for a dozen and change it to the price for one. |
| `FAIL  it has a "Questions I have" part with 2 or more questions` | The check did not find this in your work. | Add a heading "## Questions I have" and two lines under it that start with a dash. |
| `FAIL  it has the columns order_id, order_date, cafe, product, quantity` | The check did not find this in your work. | Keep the same column names as the original file in the first row. |
| `FAIL  it has the columns product, unit, shop_price, wholesale_price` | The check did not find this in your work. | Keep the same column names as the original price list. |
| `FAIL  it holds one sentence of 6 words or more` | The check did not find this in your work. | Write one full sentence about one task at your job, ending with a full stop. |
| `FAIL  it names all 11 folders of the bakery` | The check did not find this in your work. | Ask Claude to add one line for every folder, from orders to notes. |
| `FAIL  no order is in the file twice` | The check did not find this in your work. | Ask Claude to remove rows that are exact copies, keeping one of each. |
| `FAIL  no real order was lost (134 orders)` | The check did not find this in your work. | Only remove a row when every cell is the same as another row. |
| `FAIL  out/orders-clean.csv is there` | The check did not find this in your work. | Ask Claude to save the clean orders as out/orders-clean.csv. |
| `FAIL  out/price-changes.md names no product that did not change` | The check did not find this in your work. | Take out any line about a product that was already right. |
| `FAIL  out/price-changes.md names the 3 products that changed` | The check did not find this in your work. | Ask Claude to list each fix in out/price-changes.md, one line per product. |
| `FAIL  out/price-list-clean.xlsx is there and opens as a spreadsheet` | The check did not find this in your work. | Ask Claude to save the fixed list as a new .xlsx file in out/. |
| `FAIL  out/safety.md lists 2 things under "Claude will ask me before"` | The check did not find this in your work. | Add a heading "## Claude will ask me before" and two lines under it that start with a dash. |
| `FAIL  out/safety.md names Manual mode` | The check did not find this in your work. | Write out/safety.md and say in it that you work in Manual mode. |
| `FAIL  out/whats-here.md is there` | The check did not find this in your work. | Ask Claude to write what it found into out/whats-here.md. |
| `FAIL  out/why-i-am-here.md is there` | The check did not find this in your work. | Ask Claude to make out/why-i-am-here.md with your sentence in it. |
| `FAIL  the bakery folder wren-street/ is there` | The check did not find this in your work. | Run bun run world in the course folder to make it, then try again. |
| `FAIL  the original orders file is the same as the start` | The check did not find this in your work. | Make a new file in out/ and leave the original alone; run bun run world reset to get it back. |
| `FAIL  the original price list is the same as the start` | The check did not find this in your work. | Save the fix as a new file in out/; run bun run world reset to get the original back. |
| `FAIL  the sentence is your own, not the example` | The check did not find this in your work. | Name a task from your own job, not the example from the page. |
