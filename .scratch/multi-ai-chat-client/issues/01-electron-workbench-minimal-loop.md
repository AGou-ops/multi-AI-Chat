Status: done

# 搭建 macOS Electron 多 AI 工作台最小闭环

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Build the first runnable macOS desktop client loop for the multi AI workbench. A user should be able to start the app in development mode, see the workbench shell, and load at least one built-in AI platform inside the application instead of a normal browser.

This slice should establish the project foundation for later slices without trying to complete the whole product: Electron desktop shell, renderer UI shell, one platform view, core scripts, and a minimal automated sanity check.

Use TDD for this slice: start with one smoke-level behavior test for the public app shell, implement the smallest app path to pass, then continue incrementally.

Before implementing UI, read `design-system/multi-ai-chat/MASTER.md` and `design-system/multi-ai-chat/pages/workbench.md`.

## Acceptance criteria

- [x] The project has a working Electron + TypeScript + React application shell.
- [x] `npm run dev` starts a macOS desktop window.
- [x] The main window shows the workbench UI frame with a platform area.
- [x] The workbench UI follows the `workbench.md` design override: dense platform rail, prompt command bar, central platform area, and no landing-page structure.
- [x] The initial UI uses semantic controls, visible focus states, labeled inputs, and no emoji UI icons.
- [x] At least one built-in platform URL can load inside an Electron-managed Chromium view.
- [x] The app uses a secure remote-content baseline: no Node access in remote AI pages and context isolation enabled where applicable.
- [x] Basic project scripts exist for development, build, and future macOS distribution.
- [x] A minimal automated smoke test or equivalent script verifies that the app shell can start.

## Implementation notes

- `npm test` passes the renderer workbench shell behavior test.
- `npm run build` passes TypeScript and Electron/Vite builds.
- `npm run dev` was verified to start the Electron app locally.
- Electron binary installation needed the mirror command documented in `docs/SETUP.md`; the local binary was repaired after an incomplete first download.

## Blocked by

None - can start immediately.
