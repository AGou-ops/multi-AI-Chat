import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { ClaudeAdapter } from "./claude-adapter";

function mockWebContents(executeJavaScriptResult: unknown): Partial<WebContents> {
  return {
    executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult)
  };
}

describe("ClaudeAdapter", () => {
  it("platformId 是 claude", () => {
    const adapter = new ClaudeAdapter();
    expect(adapter.platformId).toBe("claude");
  });

  it("找到输入框并成功填入 prompt", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC = mockWebContents({ found: true });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试 Claude");

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/填入/);
    expect(mockWC.executeJavaScript).toHaveBeenCalled();
  });

  it("executeJavaScript 抛出异常时返回失败", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockRejectedValue(new Error("无法访问页面"))
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "测试");

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/失败/);
  });

  it("不会读取 AI 回复内容", async () => {
    const adapter = new ClaudeAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/innerText/);
    expect(injectedScript).not.toMatch(/document\.querySelector\(['"]\[class\*=.*message|document\.querySelectorAll/);
  });

  it("不会刷新页面", async () => {
    const adapter = new ClaudeAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/location\.reload|navigate/);
  });
});
