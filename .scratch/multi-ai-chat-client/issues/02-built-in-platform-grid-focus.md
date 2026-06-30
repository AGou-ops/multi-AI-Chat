Status: done

# 实现内置平台网格与聚焦模式

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Allow the user to enable the four built-in AI platforms and view them in a dense workbench grid. The user should be able to switch between multi-platform grid mode and single-platform focus mode without losing each platform page state.

This slice should make the app visibly become a multi AI workbench, not just a one-page browser wrapper.

Use TDD by adding one user-visible grid/focus behavior at a time. Follow `design-system/multi-ai-chat/pages/workbench.md` for pane density, focus states, platform status bars, and icon-only control labeling.

## Acceptance criteria

- [x] ChatGPT, Claude, Gemini, and DeepSeek are available as built-in platforms.
- [x] The sidebar lists built-in platforms with enable or disable controls.
- [x] Enabled platforms appear in the main workspace grid.
- [x] The grid supports practical layouts for one to four enabled platforms.
- [x] Each platform surface has a compact title/status bar with platform name and loading state.
- [x] Platform controls use accessible icon buttons with labels or tooltips and visible focus states.
- [x] The user can focus one platform so it occupies the main workspace.
- [x] The user can exit focus mode and return to the previous grid.
- [x] Platform page state is preserved when switching between grid and focus mode.

## Implementation notes

- `npm test` passes renderer behavior tests for enabling platforms, grid display, focus mode, and layout bridge updates.
- `npm run build` passes TypeScript and Electron/Vite builds.
- `npm run dev` was verified to start the Electron app cleanly on port 5173.
- Renderer state is synchronized to the Electron shell through `window.multiAIChat.setPlatformLayout`.
- The main process keeps `WebContentsView` instances alive and moves non-visible views offscreen, preserving platform page state across grid/focus switches.

## Blocked by

- `.scratch/multi-ai-chat-client/issues/01-electron-workbench-minimal-loop.md`
