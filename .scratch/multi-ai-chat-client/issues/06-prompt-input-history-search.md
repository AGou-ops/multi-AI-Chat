Status: done

# 实现统一 prompt 输入与本地历史搜索

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Provide a unified prompt drafting area that saves local prompt history and lets users quickly reuse prior prompts. A user should be able to write a prompt once, copy it, find it later by keyword, and control local retention without saving AI replies.

Use TDD by testing one public prompt behavior at a time: copy, save, search, clear, and retention. Follow the workbench design override for compact command-bar layout, labels, focus states, and keyboard accessibility.

## Acceptance criteria

- [x] The workbench has a compact prompt input area.
- [x] The prompt input has an accessible label and a visible keyboard focus state.
- [x] The user can copy the current prompt to the system clipboard.
- [x] Prompt history is saved locally according to the configured retention policy.
- [x] The default retention policy saves all prompt history.
- [x] The user can search prompt history with simple keyword matching.
- [x] The user can clear prompt history.
- [x] The user can choose among forever, latest 50, latest 200, latest 30 days, and disabled retention.
- [x] AI replies are not saved as part of prompt history.
- [x] Tests cover save, search, clear, and retention behavior.

## Implementation notes

- `npm test` passes 6 test files and 54 tests, including prompt history UI and store tests.
- `npm run build` passes TypeScript and Electron/Vite builds.
- `npm run dev` was verified to start the Electron app cleanly on port 5173.
- Prompt history is stored in `prompt-history.json` under Electron `userData`.
- The renderer exposes a compact right-side prompt history drawer with search, clear, retention policy, and click-to-reuse.
- Only prompt text and timestamps are saved; AI replies are not captured or persisted.

## Blocked by

- `.scratch/multi-ai-chat-client/issues/02-built-in-platform-grid-focus.md`
- `.scratch/multi-ai-chat-client/issues/03-platform-sessions-local-config.md`
