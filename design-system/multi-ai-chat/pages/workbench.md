# Workbench Page Design Override

This file overrides `design-system/multi-ai-chat/MASTER.md` for the main multi AI workbench page.

## Product Shape

The workbench is not a landing page. Do not use hero sections, speaker grids, pricing CTAs, marketing cards, or conference-style page structure.

Use a dense desktop productivity layout:

- Left platform rail.
- Top prompt command bar.
- Central multi-platform grid.
- Platform status bars.
- Optional right history drawer.
- Settings surfaces only where needed.

## Visual Direction

- Style: restrained productivity tool, similar to a lightweight IDE or browser workbench.
- Density: compact controls, tight but readable spacing.
- Cards: use cards only for repeated platform/history items or dialogs; do not nest cards.
- Borders: subtle but visible separators for panes and platform frames.
- Radius: 6px to 8px for controls and panels.
- Motion: small state transitions only, 150ms to 200ms.
- Hover: color, border, or shadow changes only; avoid movement that shifts layout.

## Color Usage

Keep the generated teal palette as the product accent, but use it sparingly:

- Primary accent: focus rings, selected platform, active controls.
- Orange CTA: only for risky or high-emphasis actions such as confirmed auto-send.
- Background: prefer neutral workbench surfaces over large teal-tinted areas.
- Text: maintain at least 4.5:1 contrast.

## Accessibility Rules

- Every form control must have a visible label or accessible name.
- All interactive controls must be reachable by keyboard.
- Focus states must be visible with `:focus-visible`.
- Platform execution results must be announced through a polite live region.
- Dialogs must trap focus and return focus on close.
- Use semantic `button`, `input`, `textarea`, `nav`, `main`, and `aside` before ARIA roles.

## Icon Rules

- Use Lucide or the existing icon set consistently.
- Decorative icons use `aria-hidden="true"`.
- Icon-only buttons need tooltips and accessible labels.
- Do not use emoji as UI icons.

## TDD Expectations

Build frontend UI by behavior slices:

1. Write one test through the public UI or IPC-facing behavior.
2. Implement the smallest visible path to pass it.
3. Refactor only when green.

High-priority UI behaviors to test first:

- The workbench shell renders with platform rail, prompt bar, and platform area.
- Enabling platforms changes the visible grid.
- Focus mode can be entered and exited.
- Prompt copy/history actions are visible and keyboard-accessible.
- Platform action results render and announce status changes.
