Status: done

# 实现内置平台自动填入 Beta 的第一条垂直链路

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Build the first end-to-end automatic fill path for one built-in platform, using ChatGPT as the tracer bullet. A user should be able to write a prompt in the workbench, choose ChatGPT, attempt automatic fill, and see a clear success or failure result with clipboard fallback.

This slice establishes the adapter framework and failure behavior that later platform adapters must follow.

## Acceptance criteria

- [x] The app has an automation adapter framework for built-in platforms.
- [x] ChatGPT can be targeted for Beta automatic fill.
- [x] The adapter attempts to locate the current prompt input field and insert the prompt.
- [x] The adapter does not read AI replies.
- [x] The adapter does not bypass login, captcha, rate limits, or platform controls.
- [x] Recoverable failures retry at most 2 times with 1.5 seconds between attempts.
- [x] The adapter does not automatically refresh the platform page.
- [x] Final success or failure is shown in the platform result UI.
- [x] On failure, the prompt is copied to the clipboard and the user is told to paste manually.
- [x] Execution metadata is recorded for success, failure, and retry count.

## Implementation notes

- `src/main/autofill/types.ts` — adapter interface and result types
- `src/main/autofill/retry-executor.ts` — retry loop with configurable maxRetries/retryDelayMs
- `src/main/autofill/chatgpt-adapter.ts` — ChatGPT autofill via executeJavaScript DOM injection
- `src/main/autofill/registry.ts` — adapter registry, extensible for future platforms
- `src/main/index.ts` — wired PROMPT_EXECUTE to use autofill adapters with clipboard fallback on failure

## Blocked by

- `.scratch/multi-ai-chat-client/issues/06-prompt-input-history-search.md`
- `.scratch/multi-ai-chat-client/issues/07-execution-records-platform-results.md`
