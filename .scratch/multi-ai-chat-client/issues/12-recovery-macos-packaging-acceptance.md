Status: done

# 实现崩溃/加载失败恢复与 macOS 打包验收

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Make the first version resilient enough for real local use and produce a double-clickable macOS build. A user should be able to recover a failed platform view without restarting the whole app, and install or launch the packaged app for manual validation.

## Acceptance criteria

- [x] A platform load failure shows a platform-level error state.
- [x] A crashed or unresponsive platform view shows a reload action.
- [x] Reloading one platform does not reload all platforms.
- [x] One platform failure does not make the control UI unusable.
- [x] App restart restores enabled platforms and layout preference.
- [x] `npm run build` completes successfully.
- [x] `npm run dist:mac` or equivalent produces a `.app` or `.dmg`.
- [x] The packaged macOS app can be launched by double click.
- [x] Packaged app configuration and platform login state persist across restarts.
- [x] A manual acceptance checklist covers loading, login, layout, prompt, automation fallback, navigation policy, and packaging.

## Implementation notes

- `src/main/index.ts` — 新增 `PLATFORM_RELOAD` IPC handler，单独重新加载平台 URL，不重新加载其他平台
- `src/renderer/App.tsx` — 每个平台标题栏增加重新加载按钮（`RefreshCw` 图标），失败平台显示错误状态（`AlertTriangle` + "加载失败"）；`handleReloadPlatform` 通过 reloadingPlatformIds 追踪重载状态
- `app.whenReady()` 从 `configStore.load()` 读取上次保存的 `enabledPlatformIds` 并恢复布局
- PlatformConfig 通过 `config-store` 持久化；平台 cookie/localStorage 通过 `persist:` partition 跨会话保留
- `npm run build` 通过（tsc + electron-vite），`npm run dist:mac` 生成 `.dmg`/`.zip`

## Blocked by

- `.scratch/multi-ai-chat-client/issues/01-electron-workbench-minimal-loop.md`
- `.scratch/multi-ai-chat-client/issues/02-built-in-platform-grid-focus.md`
- `.scratch/multi-ai-chat-client/issues/03-platform-sessions-local-config.md`
- `.scratch/multi-ai-chat-client/issues/04-custom-platform-management.md`
- `.scratch/multi-ai-chat-client/issues/05-navigation-security-permissions.md`
- `.scratch/multi-ai-chat-client/issues/06-prompt-input-history-search.md`
- `.scratch/multi-ai-chat-client/issues/07-execution-records-platform-results.md`
- `.scratch/multi-ai-chat-client/issues/08-chatgpt-autofill-tracer.md`
- `.scratch/multi-ai-chat-client/issues/09-remaining-builtin-autofill-adapters.md`
- `.scratch/multi-ai-chat-client/issues/10-platform-autosend-confirmation.md`
- `.scratch/multi-ai-chat-client/issues/11-keyboard-shortcuts-workbench-actions.md`

