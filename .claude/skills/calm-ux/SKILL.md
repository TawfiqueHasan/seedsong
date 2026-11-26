---
name: calm-ux
description: Relaxation-first UX, motion, copy and WCAG 2.2 AA rules for Seedsong. Use whenever you build or review UI in src/ui, src/viz or src/styles, design a flow, write interface copy, or check accessibility.
---

# Calm UX for Seedsong

Relaxation and user experience is 35% of the score. Every screen should lower the user's heart rate. When two options are equally good, pick the quieter one.

## Principles

1. **One obvious next step.** Each state has one primary action (Begin, Play, Keep this song). Everything else is secondary or hidden in the drawer.
2. **Progressive disclosure.** Moods first, parameters on request, the recursion lens and code view for the curious.
3. **Nothing startles.** No sudden sound, motion, colour change or layout shift. Changes fade or crossfade.
4. **The user is never rushed.** No timers that pressure, no autoplay, no modal that blocks music without reason.
5. **Feedback is gentle.** Soft toasts, subtle glows, small in-key sounds (opt-in). Never a red error banner for something recoverable.

## Motion

- Durations: micro 200 ms · panels 400 ms · scene changes 1,200–2,000 ms · ambient loops 6–10 s or longer.
- Easing: enter `cubic-bezier(0.22, 1, 0.36, 1)`; crossfade `cubic-bezier(0.65, 0, 0.35, 1)`. Exits a little faster than entrances. No bounce, no overshoot, no shake.
- Animate `opacity` and `transform` only. Never animate width, height or top/left in the UI.
- `prefers-reduced-motion` (and the in-app switch): no sway, no drift, no zoom, no parallax; keep fades.
- Nothing may flash more than 3 times per second, and avoid large bright areas flashing at all.

## Colour, type and surfaces

- Use the tokens in `src/styles/tokens.css` (SPEC §7.1). No raw hex inside components.
- Text on glass must keep ≥ 4.5:1 contrast even over the brightest part of the tree: use the dark glass tint `rgba(12,17,34,0.62)` with blur, not transparent white glass.
- Body 16 px, line-height 1.5, at most about 65 characters per line. Fraunces for display, Manrope for UI, JetBrains Mono for code.
- Icons: Lucide, 1.5 px stroke, always with an accessible name. No emoji.

## Copy

- Short, warm, second person, sentence case. No exclamation marks. No blame in errors.
- Good: "Plant a seed", "Your song is ready", "Breathe in", "Keep this song", "Something went quiet. Replant?"
- Explain parameters in plain words with their effect on the music: "Depth: how many times each branch splits. Deeper trees make longer songs."

## Layout

- Full-bleed canvas; floating glass transport bar at the bottom; a drawer on the right (desktop) or a bottom sheet (mobile).
- The transport bar must never cover focused elements (WCAG 2.4.11); add scroll padding.
- Mobile first: works at 320 px wide, touch targets 44×44 px, no horizontal scroll, safe-area insets respected.

## WCAG 2.2 AA checklist

- 1.1.1 Canvas has `role="img"` and a live text description of the current tree and music.
- 1.4.2 Audio never autoplays; pause and volume are always one step away.
- 1.4.3 / 1.4.11 Text ≥ 4.5:1; UI components and focus rings ≥ 3:1.
- 1.4.4 / 1.4.10 Zoom to 200% and reflow at 320 px without loss.
- 2.1.1 / 2.1.2 Everything works by keyboard; no traps (drawer, dialogs, zen mode).
- 2.1.4 Single-key shortcuts can be turned off and never fire inside inputs.
- 2.2.2 Moving visuals can be paused (pause stops motion; reduce-motion switch).
- 2.3.1 No more than 3 flashes per second.
- 2.4.3 / 2.4.7 / 2.4.11 Logical focus order, visible focus, focus not hidden behind the transport bar.
- 2.5.7 / 2.5.8 Sliders work without dragging (keys, click on track); targets ≥ 24×24 px (aim 44).
- 3.3.1 Errors (for example an invalid L-system rule) are described in text next to the field.
- 4.1.2 / 4.1.3 Radix primitives with real labels; `aria-valuetext` with units; status messages via `aria-live="polite"`.

## Before you call UI work done

1. Screenshot 1440×900 and 390×844 with the Playwright MCP, and look at them as a tired user would.
2. Tab through the whole flow with the keyboard only.
3. Turn on reduced motion and check again.
4. Run the axe e2e test.
5. Ask: is there anything here that could make someone tense? Remove it.
