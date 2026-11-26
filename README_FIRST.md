# Seedsong starter kit: set up in 20 minutes

This kit turns an empty repo into a fully briefed Claude Code project: the spec, the prompt chain, project skills, review agents, MCP servers and automatic AI logging. Install it BEFORE your first prompt so every prompt is logged.

## What is in the kit

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Project brain Claude Code reads every session: rubric, stack, rules, definition of done |
| `docs/SPEC.md` | The full product and technical spec (what to build, exactly) |
| `docs/PROMPTS.md` | The prompt chain, phase by phase, plus feedback templates |
| `docs/RUBRIC.md` | Official rubric, what a 10/10 looks like, final self-check |
| `.claude/settings.json` | Safe permission allowlist + 4 logging hooks |
| `.claude/hooks/ai-log.mjs` | Logs every prompt and response to `ai-logs/` |
| `.claude/skills/` | `verify` (auto-runs before commits), `sound-design`, `calm-ux`, `judge` |
| `.claude/agents/` | `rubric-judge`, `a11y-auditor`, `music-director` (independent reviewers) |
| `.mcp.json` / `.mcp.windows.json` | Playwright (Claude's eyes in the browser) + Context7 (live library docs) |
| `scripts/collect-ai-logs.mjs` | Collects every Claude Code transcript for the repo into `ai-logs/` |
| `ai-logs/` | Where the logs live, plus the planning session |

## 1. Prerequisites

- Node.js LTS (nodejs.org) and Git. On Windows, Git for Windows is recommended (it gives Claude Code a Bash shell).
- A GitHub account and an empty public repo (for example `seedsong`).
- Google Chrome, and headphones.

## 2. Install or update Claude Code

- macOS / Linux / WSL: `curl -fsSL https://claude.ai/install.sh | bash`
- Windows PowerShell: `irm https://claude.ai/install.ps1 | iex`
- Already installed: `claude update`. Check with `claude --version`.

## 3. Put the kit in your repo

```bash
git clone https://github.com/<you>/seedsong.git
cd seedsong
# unzip the kit INTO this folder so CLAUDE.md sits at the top level
# make sure the hidden .claude folder and .mcp.json came along
```

**Windows only:** delete `.mcp.json` and rename `.mcp.windows.json` to `.mcp.json` (npx needs the `cmd /c` wrapper on native Windows).

Commit it:

```bash
git add -A
git commit -m "chore: add Claude Code starter kit (spec, prompt chain, skills, logging hooks)"
git push
```

## 4. Start Claude Code and finish setup

```bash
claude
```

1. Trust the folder, and approve the project MCP servers `playwright` and `context7` when asked.
2. Install the official frontend-design plugin:
   ```
   /plugin marketplace add anthropics/claude-plugins-official
   /plugin install frontend-design@claude-plugins-official
   /reload-plugins
   ```
   (If the first line says the marketplace already exists, that is fine.)
3. Optional: `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill`. Use it for its UX and accessibility checklists only; its colour and layout suggestions lean toward marketing landing pages, and SPEC §7 already defines our look.
4. Check everything loaded:
   - `/hooks` shows UserPromptSubmit, Stop, SubagentStop and SessionEnd.
   - `/mcp` shows playwright and context7 connected.
   - `/skills` lists verify, sound-design, calm-ux, judge and frontend-design.
5. Logging smoke test. Send: `Say hello in one line and list the project skills and agents you can see.` Then open `ai-logs/PROMPT_LOG.md`: you should see Prompt 1 and the response. Delete nothing in `ai-logs/`, ever.
6. Pick the model and effort for Phase 0: `/model best` (it picks Fable where your plan includes it, otherwise the latest Opus), then `/effort xhigh`.
7. Open `docs/PROMPTS.md` and start with Phase 0.

## 5. Troubleshooting

- **No entries in `ai-logs/PROMPT_LOG.md`:** run `node --version` (Node must be on PATH), check `/hooks`, and read `ai-logs/.hook-errors.log`. If your Claude Code build rejects the `args` form, change each hook to the shell form, for example `"command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/ai-log.mjs\" prompt"` and remove `args`.
- **Logs are still safe if hooks failed:** `npm run logs:collect` (or `node scripts/collect-ai-logs.mjs`) rebuilds them from Claude Code's own transcripts in `~/.claude/projects/`. Run it before every push in the last hours.
- **Playwright MCP does not connect on Windows:** confirm you renamed `.mcp.windows.json`, then `/mcp` → reconnect.
- **Usage limit reached:** `/usage` shows when it resets. Switch lighter phases to `/model sonnet`. If you must switch to another AI tool, save its full prompt/response history into `ai-logs/` by hand.
- **Never** let any tool scaffold with `--overwrite` into this folder; Phase 1 scaffolds into `_scaffold/` and merges.
