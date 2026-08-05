import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { ClaudeAdapter } from "./claude-adapter";
import { dispatchCommandEnter } from "./trusted-click";

vi.mock("./trusted-click", () => ({
  dispatchCommandEnter: vi.fn()
}));

function mockWebContents(executeJavaScriptResult: unknown): Partial<WebContents> {
  return {
    executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult),
    sendInputEvent: vi.fn(),
    focus: vi.fn()
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

  it("找到输入框并通过 Command+Enter 发送", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC = mockWebContents({ focused: true });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/Command\+Enter/);
    expect(dispatchCommandEnter).toHaveBeenCalledWith(mockWC);
  });

  it("未找到输入框时返回失败", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC = mockWebContents({ focused: false });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/未找到/);
  });

  it("executeJavaScript 异常时返回失败", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockRejectedValue(new Error("无法访问页面")),
      focus: vi.fn()
    };

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/失败/);
  });

  it("穿透 Shadow DOM 找到输入框并触发 Command+Enter", async () => {
    const adapter = new ClaudeAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script))),
      sendInputEvent: vi.fn(),
      focus: vi.fn()
    };

    // Simulate rich-textarea Shadow DOM: input hidden inside shadowRoot
    const host = document.createElement("rich-textarea");
    const shadow = host.attachShadow({ mode: "open" });
    const input = document.createElement("div");
    input.setAttribute("contenteditable", "true");
    input.className = "ProseMirror";
    input.textContent = "hello";
    shadow.appendChild(input);
    document.body.appendChild(host);

    // No input in light DOM
    expect(document.querySelector('[contenteditable="true"]')).toBeNull();

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/Command\+Enter/);
    expect(dispatchCommandEnter).toHaveBeenCalledWith(mockWC);

    document.body.removeChild(host);
  });

  it("不会误触侧边栏或用户资料——只聚焦输入框不点击按钮", async () => {
    const adapter = new ClaudeAdapter();
    const profileClick = vi.fn();
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script))),
      sendInputEvent: vi.fn(),
      focus: vi.fn()
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

    profileButton.click = profileClick;
    sidebarButton.click = sidebarClick;
    sendButton.click = sendClick;

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(dispatchCommandEnter).toHaveBeenCalledWith(mockWC);
    // No button should be clicked — only Command+Enter is used
    expect(profileClick).not.toHaveBeenCalled();
    expect(sidebarClick).not.toHaveBeenCalled();
    expect(sendClick).not.toHaveBeenCalled();
  });
});
