import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { ChatGPTAdapter } from "./chatgpt-adapter";

function mockWebContents(executeJavaScriptResult: unknown): Partial<WebContents> {
  return {
    executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult)
  };
}

describe("ChatGPTAdapter", () => {
  it("platformId 是 chatgpt", () => {
    const adapter = new ChatGPTAdapter();

    expect(adapter.platformId).toBe("chatgpt");
  });

  it("找到输入框并成功填入 prompt", async () => {
    const adapter = new ChatGPTAdapter();
    const mockWC = mockWebContents({ found: true });

    const result = await adapter.attemptFill(mockWC as WebContents, "你好");

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/填入/);
    expect(mockWC.executeJavaScript).toHaveBeenCalled();
  });

  it("优先填入页面底部的长条聊天输入框，而不是靠前的可编辑内容", async () => {
    const adapter = new ChatGPTAdapter();
    document.body.innerHTML = `
      <div contenteditable="true" data-testid="reply">已有回复</div>
      <textarea data-testid="prompt"></textarea>
    `;
    const reply = document.querySelector("[data-testid='reply']") as HTMLElement;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLTextAreaElement;
    reply.getBoundingClientRect = vi.fn(() => ({
      x: 20,
      y: 80,
      width: 240,
      height: 80,
      top: 80,
      right: 260,
      bottom: 160,
      left: 20,
      toJSON: () => ({})
    }));
    promptInput.getBoundingClientRect = vi.fn(() => ({
      x: 24,
      y: 720,
      width: 820,
      height: 56,
      top: 720,
      right: 844,
      bottom: 776,
      left: 24,
      toJSON: () => ({})
    }));
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    document.execCommand = vi.fn((_command, _showUi, value) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.textContent = value ?? "";
      }
      return true;
    });
    let scriptError: unknown;
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn(async (script: string) => {
        try {
          return eval(script);
        } catch (error) {
          scriptError = error;
          throw error;
        }
      })
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "通用自动填入");

    expect(scriptError).toBeUndefined();
    expect(result.success).toBe(true);
    expect(promptInput.value).toBe("通用自动填入");
    expect(reply.textContent).toBe("已有回复");
  });

  it("executeJavaScript 抛出异常时返回失败", async () => {
    const adapter = new ChatGPTAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockRejectedValue(new Error("无法访问页面"))
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "你好");

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/失败/);
  });

  it("不会读取 AI 回复内容", async () => {
    const adapter = new ChatGPTAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "你好");

    const injectedScript = executeJS.mock.calls[0][0] as string;

    expect(injectedScript).not.toMatch(/innerText/);
    expect(injectedScript).not.toMatch(/document\.querySelector\(['"]\[class\*=.*message|document\.querySelectorAll/);
  });

  it("不会刷新页面", async () => {
    const adapter = new ChatGPTAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "你好");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/location\.reload|navigate/);
  });

  it("自动发送只点击输入区发送按钮，不误点侧边栏图标按钮", async () => {
    const adapter = new ChatGPTAdapter();
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <aside>
        <button type="button" data-testid="sidebar-button"><svg></svg></button>
      </aside>
      <form data-testid="composer">
        <textarea data-testid="prompt">hello there?</textarea>
        <button type="submit" data-testid="send-button" aria-label="Send prompt"><svg></svg></button>
      </form>
    `;
    const sidebarButton = document.querySelector("[data-testid='sidebar-button']") as HTMLButtonElement;
    const form = document.querySelector("[data-testid='composer']") as HTMLFormElement;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLTextAreaElement;
    const sendButton = document.querySelector("[data-testid='send-button']") as HTMLButtonElement;

    form.addEventListener("submit", (event) => event.preventDefault());
    sidebarButton.click = sidebarClick;
    sendButton.click = sendClick;
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 56,
          top: 700,
          right: 780,
          bottom: 756,
          left: 260
        }) as DOMRect
    );
    sendButton.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 44,
          height: 44,
          top: 706,
          right: 840,
          bottom: 750,
          left: 796
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(sidebarClick).not.toHaveBeenCalled();
  });
});
