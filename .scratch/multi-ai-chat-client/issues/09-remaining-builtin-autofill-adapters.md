Status: done

# 补齐 Claude / Gemini / DeepSeek 自动填入适配器

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Extend the Beta automatic fill capability from the ChatGPT tracer bullet to Claude, Gemini, and DeepSeek. A user should be able to target any built-in platform for automatic fill and receive consistent platform-level results and fallback behavior.

## Acceptance criteria

- [x] Claude supports Beta automatic fill through the shared adapter framework.
- [x] Gemini supports Beta automatic fill through the shared adapter framework.
- [x] DeepSeek supports Beta automatic fill through the shared adapter framework.
- [x] All adapters follow the same retry and no-refresh rules.
- [x] All adapters report structured success, failure, skipped, reason, and retry count results.
- [x] All adapters avoid reading AI replies.
- [x] All adapters fail safely when the user is logged out, the page is unsupported, or the input field cannot be found.
- [x] Manual verification notes document current real-platform behavior for all four built-in platforms.

## Implementation notes

- `src/main/autofill/claude-adapter.ts` — Claude DOM 自动填入适配器
- `src/main/autofill/gemini-adapter.ts` — Gemini DOM 自动填入适配器
- `src/main/autofill/deepseek-adapter.ts` — DeepSeek DOM 自动填入适配器
- 所有四个适配器使用统一的 `PlatformAutofillAdapter` 接口和 `RetryConfig`，共享受众通过 `createAutofillRegistry` 注册管理。

## Blocked by

- `.scratch/multi-ai-chat-client/issues/08-chatgpt-autofill-tracer.md`

