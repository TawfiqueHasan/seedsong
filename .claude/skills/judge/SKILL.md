---
name: judge
description: Score the current Seedsong build against the official Hub's Quest rubric with an independent, strict judge and return a ranked fix list.
context: fork
agent: rubric-judge
disable-model-invocation: true
---

Judge the current build of Seedsong.

1. Read `docs/RUBRIC.md`, `docs/SPEC.md` §1–§3 and `README.md` (if present). Do not read the plan files; judge what exists.
2. Start the app (`npm run dev` if it is not already running) and use the Playwright MCP as a first-time visitor would: land, click Begin, let a piece play, try two moods, change depth, open every panel, export a WAV, try the keyboard only, and check the 390×844 mobile viewport. Take screenshots as evidence.
3. Check that all six mandatory deliverables work. Any missing deliverable is a critical finding.
4. Score each rubric line from 1 to 10 with one sentence of evidence each, and compute the weighted total out of 100.
5. List the 10 highest-value fixes, ranked by estimated points gained per minute of work. For each: the problem, the evidence (screenshot or file:line), the concrete fix, and an estimate in minutes.
6. Note anything that could embarrass us in a live demo (console errors, slow first load, silent export, layout breaks).

Be strict and specific. Do not edit any files.
