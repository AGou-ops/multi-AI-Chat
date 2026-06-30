Status: done

# 实现平台级自动发送设置与二次确认

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Allow automatic sending only for built-in platforms where the user explicitly enables it, and require confirmation before batch sends. A user should be able to keep automatic send off by default, opt in per platform, and understand exactly where a prompt will be sent.

## Acceptance criteria

- [x] Each built-in platform has an automatic send setting.
- [x] Automatic send is off by default for every platform.
- [x] Custom platforms do not expose automatic send.
- [x] Enabling automatic send shows a clear risk warning.
- [x] Batch execution shows a confirmation dialog when any target platform has automatic send enabled.
- [x] The confirmation dialog lists target platforms and shows a prompt preview.
- [x] Canceling the confirmation prevents automatic send.
- [x] Sending results are recorded as execution metadata.
- [x] Failures use the same retry, result, and clipboard fallback rules as automatic fill.

## Implementation notes

- `src/main/autofill/types.ts` — `PlatformAutofillAdapter` 新增 `attemptSend` 方法
- `src/main/autofill/retry-executor.ts` — 新增 `executeAutosendWithRetry`，与 fill 使用相同重试策略
- 四个适配器均实现 `attemptSend` 通过 DOM 查找并点击发送按钮
- `src/shared/config.ts` — `AppConfig` 新增 `autoSendEnabledPlatformIds`，默认空数组
- `src/main/index.ts` — `PROMPT_EXECUTE` 接受第三个参数 `autoSendPlatformIds`，fill 成功后如有 auto-send 再调用 send；新增 `confirm-batch-send:show` IPC handler
- `src/renderer/App.tsx` — prompt bar 底部增加每个内置平台的自动发送 checkbox + 红色风险提示；只在自定义平台中使用 `BUILTIN_PLATFORM_IDS` 过滤自动发送目标
- `src/renderer/styles.css` — 新增 `.auto-send-section`、`.auto-send-toggle`、`.auto-send-warning` CSS

## Blocked by

- `.scratch/multi-ai-chat-client/issues/08-chatgpt-autofill-tracer.md`
- `.scratch/multi-ai-chat-client/issues/09-remaining-builtin-autofill-adapters.md`

