import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { executeAutofillWithRetry } from "./retry-executor";
import type { AutofillResult, PlatformAutofillAdapter, RetryConfig } from "./types";

function makeAdapter(results: AutofillResult[]): PlatformAutofillAdapter {
  return {
    platformId: "test-platform",
    attemptFill: vi.fn<(wc: WebContents, prompt: string) => Promise<AutofillResult>>()
      .mockImplementationOnce(async () => results[0])
      .mockImplementationOnce(async () => results[1] ?? results[0])
      .mockImplementationOnce(async () => results[2] ?? results[0]),
    attemptSend: vi.fn()
  };
}

const defaultRetry: RetryConfig = { maxRetries: 2, retryDelayMs: 50 };

describe("executeAutofillWithRetry", () => {
  it("首次成功时立即返回成功结果", async () => {
    const adapter = makeAdapter([{ success: true, reason: "已自动填入" }]);
    const mockWC = {} as WebContents;

    const result = await executeAutofillWithRetry(adapter, mockWC, "hello", defaultRetry);

    expect(result.success).toBe(true);
    expect(result.reason).toBe("已自动填入");
    expect(result.retryCount).toBe(0);
    expect(adapter.attemptFill).toHaveBeenCalledTimes(1);
  });

  it("第一次失败后重试并成功", async () => {
    const adapter = makeAdapter([
      { success: false, reason: "临时错误" },
      { success: true, reason: "重试后成功" }
    ]);
    const mockWC = {} as WebContents;

    const result = await executeAutofillWithRetry(adapter, mockWC, "hello", defaultRetry);

    expect(result.success).toBe(true);
    expect(result.reason).toBe("重试后成功");
    expect(result.retryCount).toBe(1);
    expect(adapter.attemptFill).toHaveBeenCalledTimes(2);
  });

  it("最多重试 maxRetries 次，最终失败", async () => {
    const adapter = makeAdapter([
      { success: false, reason: "第一次失败" },
      { success: false, reason: "第二次失败" },
      { success: false, reason: "第三次失败" }
    ]);
    const mockWC = {} as WebContents;

    const result = await executeAutofillWithRetry(adapter, mockWC, "hello", defaultRetry);

    expect(result.success).toBe(false);
    expect(result.retryCount).toBe(2);
    expect(adapter.attemptFill).toHaveBeenCalledTimes(3);
  });

  it("重试间隔等待正确的延迟时间", async () => {
    const adapter = makeAdapter([
      { success: false, reason: "失败" },
      { success: false, reason: "又失败" },
      { success: false, reason: "彻底失败" }
    ]);
    const mockWC = {} as WebContents;
    const start = Date.now();

    await executeAutofillWithRetry(adapter, mockWC, "hello", defaultRetry);

    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(2 * defaultRetry.retryDelayMs - 10);
    expect(adapter.attemptFill).toHaveBeenCalledTimes(3);
  });
});
