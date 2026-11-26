---
name: verify
description: Verify that a Seedsong code change really works before committing - run the project checks, run the app for UI, audio or export changes, and report evidence. Use before every commit and whenever the user asks to verify or test.
---

# Verify (Seedsong)

1. Run `npm run verify` (typecheck, lint, unit tests, build). Fix every failure at its cause. Never skip, delete or weaken a test to get green.
2. If anything under `src/ui`, `src/viz`, `src/audio`, `src/export`, `src/styles` or `index.html` changed:
   - Run `npm run test:e2e`.
   - Start the dev server if it is not running, open it with the Playwright MCP, click Begin, let it play for 5 seconds, and confirm the console has no errors or warnings from our code.
   - Take a screenshot at 1440×900 (and 390×844 if layout changed) and look at it critically against `docs/SPEC.md` §7 and §8.
3. If `src/core/music`, `src/audio` or `src/export` changed and `npm run audio:qa` exists, run it and quote its summary table.
4. Report in five lines or fewer: commands run and results, screenshots taken, anything suspicious, and what the user should listen for (you cannot hear audio).

Do not commit if step 1 or step 2 fails. Never touch `ai-logs/` or `.claude/hooks/`.
