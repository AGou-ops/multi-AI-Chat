Status: done

# 实现平台独立登录态与本地配置持久化

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Persist platform state locally and isolate login state per platform. A user should be able to log into different AI platforms with their own accounts, restart the app, and find platform enablement, layout preference, and platform login sessions still available.

This slice should make the workbench usable across real sessions while keeping each platform's login state separate.

## Acceptance criteria

- [x] Each built-in platform uses its own persistent session partition.
- [x] Different built-in platforms do not share cookies, local storage, or cache.
- [x] The same built-in platform reuses its partition across app restarts.
- [x] Platform enabled state persists locally.
- [x] Layout preference persists locally.
- [x] App restart restores the last enabled platform set and layout preference.
- [x] Tests cover partition naming and local configuration persistence.

## Blocked by

- `.scratch/multi-ai-chat-client/issues/02-built-in-platform-grid-focus.md`

