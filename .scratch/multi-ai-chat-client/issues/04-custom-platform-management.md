Status: done

# 实现自定义平台管理

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Let users add their own online AI tools to the workbench as custom platforms. A user should be able to create, edit, enable, disable, and delete a custom platform with enough configuration for real login and daily use, while keeping automation unavailable for custom platforms in v1.

## Acceptance criteria

- [x] The user can create a custom platform with name and URL.
- [x] The user can edit custom platform name, URL, icon URL, User-Agent, login/auth whitelist domains, and layout size.
- [x] The user can enable or disable custom platforms from the platform list.
- [x] The user can delete custom platforms.
- [x] Custom platform configuration persists locally.
- [x] Custom platforms use independent persistent session partitions by default.
- [x] Custom platforms do not expose automatic fill, automatic send, or custom script injection controls.
- [x] Validation prevents empty names, invalid URLs, and duplicate platform IDs.

## Blocked by

- `.scratch/multi-ai-chat-client/issues/03-platform-sessions-local-config.md`

