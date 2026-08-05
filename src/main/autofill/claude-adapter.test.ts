import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { ClaudeAdapter } from "./claude-adapter";
import { dispatchTrustedClick } from "./trusted-click";

vi.mock("./trusted-click", () => ({
  dispatchTrustedClick: vi.fn()
}));

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

  it("找到发送按钮并成功发送", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC = mockWebContents({ sent: true, method: "button", x: 800, y: 700 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/发送按钮/);
    expect(dispatchTrustedClick).toHaveBeenCalledWith(mockWC, expect.objectContaining({ sent: true }));
  });

  it("未找到发送按钮时返回失败", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC = mockWebContents({ sent: false });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/未找到/);
  });

  it("不会误点侧边栏或用户资料按钮", async () => {
    const adapter = new ClaudeAdapter();
    const profileClick = vi.fn();
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)))
    };

    document.body.innerHTML = `
      <header>
        <button aria-label="Account menu" data-testid="profile-button">Profile</button>
      </header>
      <aside>
        <button type="submit" data-testid="sidebar-toggle">展开侧边栏</button>
      </aside>
      <main>
        <div data-testid="composer">
          <div role="textbox" contenteditable="true" data-testid="prompt-editor">hello</div>
          <button type="button" data-testid="send-button" aria-label="Send Message">
            <svg></svg>
          </button>
        </div>
      </main>
    `;

    const profileButton = document.querySelector("[data-testid='profile-button']") as HTMLButtonElement;
    const sidebarButton = document.querySelector("[data-testid='sidebar-toggle']") as HTMLButtonElement;
    const sendButton = document.querySelector("[data-testid='send-button']") as HTMLButtonElement;
    const composer = document.querySelector("[data-testid='composer']") as HTMLElement;
    const editor = document.querySelector("[data-testid='prompt-editor']") as HTMLElement;

    profileButton.click = profileClick;
    sidebarButton.click = sidebarClick;
    sendButton.click = sendClick;

    composer.getBoundingClientRect = vi.fn(() => ({ width: 720, height: 96, top: 680, right: 900, bottom: 776, left: 180 }) as DOMRect);
    editor.getBoundingClientRect = vi.fn(() => ({ width: 620, height: 64, top: 700, right: 820, bottom: 764, left: 200 }) as DOMRect);
    sendButton.getBoundingClientRect = vi.fn(() => ({ width: 44, height: 44, top: 710, right: 884, bottom: 754, left: 840 }) as DOMRect);
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(profileClick).not.toHaveBeenCalled();
    expect(sidebarClick).not.toHaveBeenCalled();
  });
});
