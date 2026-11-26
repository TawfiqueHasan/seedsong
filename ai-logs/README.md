# AI usage logs

Seedsong was built for Hub's Quest Epoch 1 with Claude Code as the coding agent. The rules require the full prompt chain and the agent's response to each prompt, so everything is recorded here automatically.

| Path | What it is | How it is made |
| --- | --- | --- |
| `PROMPT_LOG.md` | Every prompt in order, with the agent's final response, files changed and commands run | Written live by the hooks in `.claude/settings.json` (`.claude/hooks/ai-log.mjs`) |
| `prompt-log.jsonl` | The same events as machine-readable JSON lines | Same hooks |
| `transcripts/` | Raw Claude Code transcripts (JSONL), including subagents and every tool call | Copied by the hooks after each turn and by `npm run logs:collect` |
| `sessions/` | A readable Markdown transcript of every session | `npm run logs:collect` |
| `INDEX.md` | A table of all sessions with links | `npm run logs:collect` |
| `00-planning/` | The planning conversation (claude.ai) that produced the spec, the prompt chain and this logging setup | Exported by hand |

Method in one line: a written spec (`docs/SPEC.md`) and a phase-by-phase prompt chain (`docs/PROMPTS.md`), each phase planned, implemented, verified with tests and browser screenshots, listened to by the human, and committed.
