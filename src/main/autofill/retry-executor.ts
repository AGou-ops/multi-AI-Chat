import type { WebContents } from "electron";
import type { AutofillResult, PlatformAutofillAdapter, RetryConfig } from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeAutofillWithRetry(
  adapter: PlatformAutofillAdapter,
  webContents: WebContents,
  prompt: string,
  config: RetryConfig
): Promise<AutofillResult & { retryCount: number }> {
  let retryCount = 0;
  let lastResult: AutofillResult | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    lastResult = await adapter.attemptFill(webContents, prompt);

    if (lastResult.success) {
      return { ...lastResult, retryCount };
    }

    if (attempt < config.maxRetries) {
      retryCount++;
      await delay(config.retryDelayMs);
    }
  }

  return { ...(lastResult ?? { success: false, reason: "所有重试均失败" }), retryCount };
}

export async function executeAutosendWithRetry(
  adapter: PlatformAutofillAdapter,
  webContents: WebContents,
  config: RetryConfig
): Promise<AutofillResult & { retryCount: number }> {
  let retryCount = 0;
  let lastResult: AutofillResult | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    lastResult = await adapter.attemptSend(webContents);

    if (lastResult.success) {
      return { ...lastResult, retryCount };
    }

    if (attempt < config.maxRetries) {
      retryCount++;
      await delay(config.retryDelayMs);
    }
  }

  return { ...(lastResult ?? { success: false, reason: "所有重试均失败" }), retryCount };
}