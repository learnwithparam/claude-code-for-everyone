# Picks candidates

For the page pass. Each part lists watch-or-read candidates. Cut each list to 4 to 6, keep at
least 2 videos, then delete this file. Bar: STANDARD-v2 section 5 (made by the person or team that
makes or runs the method, evergreen, never a listicle or paywall).

I wrote this without live web access. Every link must be confirmed live (YouTube through oEmbed)
and every year confirmed before a pick ships. "V" marks a video, "R" marks a read.

Sources that pass the bar for every part: Anthropic docs (the product team), Anthropic Engineering
blog, Anthropic talks at conferences, the Model Context Protocol docs, Pro Git, OWASP, DuckDB docs.

## Orientation

1. R. Anthropic, Claude Code overview and quickstart (docs). Product team's own first-run guide; evergreen.
2. R. Anthropic, "Claude Code best practices" (Engineering blog, 2025). The team that runs Claude Code daily.
3. V. Anthropic, a Claude Code best practices talk (Code with Claude, 2025). Made by the team; check the title.
4. V. Boris Cherny (Anthropic, Claude Code creator), a talk on using Claude Code (2025). The tool's maker.
5. R. Anthropic, "How Anthropic teams use Claude Code" (2025). Non-engineer teams in production, which is this audience.
6. V. Andrej Karpathy, "Software Is Changing (Again)" (YC AI Startup School, 2025). The "autonomy slider" idea behind the ladder; a founding voice.
7. R. Anthropic, "Building effective agents" (Engineering blog, Dec 2024). Evergreen about the idea, from the team that ran the method.
8. R. Anthropic docs, "Common workflows". Official, task based, evergreen.

## 01 Make Claude ask first

1. R. Anthropic docs, "Permissions" and permission modes. The rule source itself.
2. R. Anthropic docs, "Settings" (the settings file and deny rules). Exactly what the step types.
3. R. Anthropic docs, "Security". Vendor's own account of why Claude asks first.
4. V. Anthropic, a Claude Code talk covering permissions and safe use (2025). Confirm the exact talk.
5. R. Anthropic, "Making Claude Code more secure and autonomous with sandboxing" (Engineering blog, 2025). Why a lock beats a request.
6. R. Anthropic, "Mitigating the risk of prompt injections in browser use" (2025). The team's own account of hostile text in pages.
7. R. OWASP GenAI project, LLM01 Prompt Injection. The standards body for the risk; evergreen.
8. R. Simon Willison, "The lethal trifecta for AI agents" (2025). Coined the idea; explains private data plus outside text plus a way out.
9. V. Simon Willison or an AI Engineer talk on prompt injection (confirm title and year). Only if it is a talk by the author.

## 02 Teach Claude the bakery

1. R. Anthropic docs, "Memory" (CLAUDE.md). The page the step already cites.
2. R. Anthropic, "Claude Code best practices", the CLAUDE.md and context sections (2025).
3. R. Anthropic, "Effective context engineering for AI agents" (Engineering blog, 2025). Why a short file works better; from the team.
4. V. Anthropic, a talk on context and memory in Claude Code (2025). Confirm the title.
5. R. Anthropic docs, "Common workflows", plan mode. The method for plan before edit.
6. R. Anthropic, "Mitigating the risk of prompt injections in browser use" (2025). Supports the hostile-line step.
7. R. Simon Willison, writing on prompt injection (2023 onward). Coined the term; evergreen about the idea.
8. V. Boris Cherny, a talk on plan mode and CLAUDE.md (2025). Confirm the title.

## 03 Undo anything

1. R. Pro Git, Scott Chacon and Ben Straub, "Git Basics: Undoing Things" (2nd edition, 2014). The reference book from the Git project.
2. R. Pro Git, "Recording Changes to the Repository". Same source; the save point idea.
3. R. Anthropic docs, "Checkpointing" and /rewind. The vendor's own page for the step.
4. V. Scott Chacon, a talk on Git basics (GitHub co-founder and Pro Git author). Confirm the title.
5. R. Git project docs, git-restore and git-reset reference pages. The maintainers' own.
6. R. Anthropic docs, "Common workflows" on recovering from a bad edit. Official.
7. V. Anthropic, a Claude Code talk that shows Esc and /rewind (2025). Confirm the title.
8. R. Anthropic, "Claude Code best practices", the course-correct section (2025).

## 04 Repeat the work

1. R. Anthropic, "Equipping agents for the real world with Agent Skills" (Engineering blog, 2025). The method's own post.
2. R. Anthropic docs, "Skills". The format the step teaches.
3. V. Barry Zhang and Mahesh Murag (Anthropic), a talk on skills (AI Engineer, 2025). Made by the team. Confirm the title.
4. R. Anthropic, the public skills repository README (anthropics/skills). Real skills from the maker.
5. R. Anthropic, "Building effective agents" (Dec 2024), the workflows section.
6. V. Anthropic, a talk on evals and done checks for agents (confirm title and year).
7. R. Anthropic, "Demystifying evals for AI agents" (Engineering blog). Confirm the title and year before use.
8. R. Hamel Husain, writing on checking AI output by looking at data. A practitioner who teaches this method; confirm the exact post.

## 05 Connect it and let it run

1. R. Model Context Protocol docs, "Introduction". The protocol makers' own page.
2. R. Anthropic docs, "Connect Claude Code to tools via MCP". The step's exact feature.
3. R. Anthropic, "Writing effective tools for agents" (Engineering blog, 2025). The team on tool design.
4. V. Anthropic, an MCP talk (AI Engineer or Code with Claude, 2025). Confirm title; made by the protocol team.
5. R. Anthropic docs, "Subagents". The step's new subagent.
6. R. Anthropic docs, "Hooks guide". Context for the next part; official.
7. V. Anthropic, a talk on subagents or multi-agent work (2025). Confirm title.
8. R. Anthropic, "How we built our multi-agent research system" (Engineering blog, 2025). The team's own account of helpers with narrow jobs.
9. R. Anthropic docs, on running Claude Code on a schedule (routines or scheduled runs). Official; confirm the page name.

## 06 Share the close

1. R. Anthropic docs, "Plugins" and the plugins reference. The kit's exact format.
2. R. Anthropic docs, "Hooks guide" and the hooks reference. The step's new hook.
3. V. Anthropic, a talk on hooks or plugins in Claude Code (2025). Confirm title.
4. R. Anthropic, "How Anthropic teams use Claude Code" (2025). The step already cites a related Anthropic guide.
5. R. Anthropic docs, "Claude Code best practices", the scaling and automation sections.
6. V. Boris Cherny, a talk on running Claude Code on many tasks (2025). Confirm title.
7. R. Anthropic docs, "Skills" in plugins. Official.
8. R. Anthropic, "Building effective agents" (Dec 2024), the section on evaluating and keeping the human in the loop.

## 07 Ask questions of your files

1. R. DuckDB docs, "Importing CSV files". The makers' own page.
2. R. DuckDB docs, "Friendly SQL". Why plain SQL feels easy; from the project.
3. V. Mark Raasveldt or Hannes Muhleisen (DuckDB creators), a conference talk on DuckDB (confirm title and year).
4. R. DuckDB docs, "SQL introduction". The project's own primer.
5. R. DuckDB, "Why DuckDB" page. Short and evergreen.
6. V. MotherDuck or DuckDB Foundation talk on querying CSV files (confirm that the speaker is a DuckDB maintainer).
7. R. DuckDB docs, joins reference (anti join). The exact idea behind finding unmatched bills.
8. R. Anthropic, "Claude Code best practices", the section on letting Claude run queries and checks (2025).
