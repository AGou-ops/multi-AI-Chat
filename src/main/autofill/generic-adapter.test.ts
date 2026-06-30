import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { GenericAutofillAdapter } from "./generic-adapter";

describe("GenericAutofillAdapter", () => {
  it("保留传入的平台 id", () => {
    const adapter = new GenericAutofillAdapter("custom-kimi");

    expect(adapter.platformId).toBe("custom-kimi");
  });

  it("找到通用长条聊天输入框并填入 prompt", async () => {
    const adapter = new GenericAutofillAdapter("custom-kimi");
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockResolvedValue({ found: true })
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "测试通用平台");

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/通用输入框/);
    expect(mockWC.executeJavaScript).toHaveBeenCalled();
  });

  it("通用适配器只点击输入框附近的发送按钮，不误点侧边栏按钮", async () => {
    const adapter = new GenericAutofillAdapter("custom-kimi");
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)))
    };

    document.body.innerHTML = `
      <aside>
        <button type="submit" data-testid="sidebar-toggle">展开侧边栏</button>
      </aside>
      <main>
        <div data-testid="composer">
          <div role="textbox" contenteditable="true" data-testid="prompt-editor">hello there?</div>
          <button type="button" data-testid="send-button" aria-label="Send message">
            <svg></svg>
          </button>
        </div>
      </main>
    `;
    const sidebarButton = document.querySelector("[data-testid='sidebar-toggle']") as HTMLButtonElement;
    const composer = document.querySelector("[data-testid='composer']") as HTMLElement;
    const editor = document.querySelector("[data-testid='prompt-editor']") as HTMLElement;
    const sendButton = document.querySelector("[data-testid='send-button']") as HTMLButtonElement;

    sidebarButton.click = sidebarClick;
    sendButton.click = sendClick;
    composer.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 720,
          height: 96,
          top: 680,
          right: 900,
          bottom: 776,
          left: 180
        }) as DOMRect
    );
    editor.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 620,
          height: 64,
          top: 700,
          right: 820,
          bottom: 764,
          left: 200
        }) as DOMRect
    );
    sendButton.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 44,
          height: 44,
          top: 710,
          right: 884,
          bottom: 754,
          left: 840
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(sidebarClick).not.toHaveBeenCalled();
  });

  it("外层占位容器包裹真实输入框时填入内层输入框并触发发送状态", async () => {
    const adapter = new GenericAutofillAdapter("custom-qianwen");
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)))
    };

    document.body.innerHTML = `
      <div data-placeholder="给千问发送消息" data-testid="prompt-shell">
        <div role="textbox" contenteditable="true" data-testid="prompt-editor"></div>
      </div>
      <button type="submit" disabled>发送</button>
    `;

    const shell = document.querySelector("[data-testid='prompt-shell']") as HTMLElement;
    const editor = document.querySelector("[data-testid='prompt-editor']") as HTMLElement;
    shell.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 700,
          height: 92,
          bottom: 760
        }) as DOMRect
    );
    editor.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 0,
          height: 0,
          bottom: 0
        }) as DOMRect
    );

    editor.addEventListener("input", () => {
      (document.querySelector("button") as HTMLButtonElement).disabled = false;
    });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试千问");

    expect(result.success).toBe(true);
    expect(editor.textContent).toBe("测试千问");
    expect(shell.childNodes.length).toBe(3);
    expect(document.querySelector("button")).toBeEnabled();
  });
});
