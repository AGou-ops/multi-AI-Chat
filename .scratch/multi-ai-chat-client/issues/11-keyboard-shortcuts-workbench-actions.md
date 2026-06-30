Status: done

# 实现快捷键与工作台效率操作

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Add the small set of core macOS keyboard shortcuts for high-frequency workbench actions. A user should be able to focus the prompt box, execute fill/send actions, switch platform focus, exit focus mode, and search history without leaving the keyboard.

Use TDD for shortcut behavior through public UI/application actions rather than internal handler names.

## Acceptance criteria

- [x] `Cmd+Enter` triggers fill/send for the selected platform.
- [x] `Cmd+Shift+Enter` triggers fill/send for all enabled platforms.
- [x] `Cmd+L` focuses the prompt input.
- [x] `Cmd+1/2/3/4` focuses the corresponding platform.
- [x] `Esc` exits focus mode.
- [x] `Cmd+F` focuses prompt history search.
- [x] Shortcuts work when focus is in the control UI.
- [x] Focus movement is visible and follows the visual order of the workbench.
- [x] The implementation accounts for focus inside remote platform pages as far as Electron allows.
- [x] Tests or manual verification cover the shortcut action mapping.

## Implementation notes

- `src/renderer/App.tsx` — `handleKeyDown` 统一处理键盘快捷键，绑定在 `.app-shell` 容器上
- Cmd/Ctrl+Enter → `handleExecutePrompt()`
- Cmd/Ctrl+L → `promptInputRef.current?.focus()`
- Cmd/Ctrl+F → `historySearchRef.current?.focus()`
- Cmd/Ctrl+1/2/3/4 → 聚焦对应的可见平台
- Esc → 退出聚焦模式
- `promptInputRef` 和 `historySearchRef` 使用 `useRef` 绑定到对应 DOM 元素

## Blocked by

- `.scratch/multi-ai-chat-client/issues/06-prompt-input-history-search.md`
- `.scratch/multi-ai-chat-client/issues/08-chatgpt-autofill-tracer.md`
