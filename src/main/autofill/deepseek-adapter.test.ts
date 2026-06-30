import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { DeepSeekAdapter } from "./deepseek-adapter";

function mockWebContents(executeJavaScriptResult: unknown): Partial<WebContents> {
  return {
    executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult)
  };
}

describe("DeepSeekAdapter", () => {
  it("platformId 是 deepseek", () => {
    const adapter = new DeepSeekAdapter();
    expect(adapter.platformId).toBe("deepseek");
  });

  it("找到输入框并成功填入 prompt", async () => {
    const adapter = new DeepSeekAdapter();
    const mockWC = mockWebContents({ found: true });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试 DeepSeek");

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/填入/);
    expect(mockWC.executeJavaScript).toHaveBeenCalled();
  });

  it("executeJavaScript 抛出异常时返回失败", async () => {
    const adapter = new DeepSeekAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockRejectedValue(new Error("无法访问页面"))
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "测试");

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/失败/);
  });

  it("不会读取 AI 回复内容", async () => {
    const adapter = new DeepSeekAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/innerText/);
    expect(injectedScript).not.toMatch(/document\.querySelector\(['"]\[class\*=.*message|document\.querySelectorAll/);
  });

  it("不会刷新页面", async () => {
    const adapter = new DeepSeekAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/location\.reload|navigate/);
  });

  it("自动发送只点击输入区发送按钮，不误点侧边栏图标按钮", async () => {
    const adapter = new DeepSeekAdapter();
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <aside>
        <div role="button" data-testid="sidebar-button"><svg></svg></div>
      </aside>
      <section data-testid="composer">
        <div role="textbox" contenteditable="true" data-testid="prompt">hello there?</div>
        <div role="button" data-testid="send-button" aria-label="发送"><svg></svg></div>
      </section>
    `;
    const sidebarButton = document.querySelector("[data-testid='sidebar-button']") as HTMLDivElement;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLDivElement;
    const sendButton = document.querySelector("[data-testid='send-button']") as HTMLDivElement;

    sidebarButton.click = sidebarClick;
    sendButton.click = sendClick;
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 96,
          top: 660,
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
          top: 702,
          right: 840,
          bottom: 746,
          left: 796
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(sidebarClick).not.toHaveBeenCalled();
  });

  it("DeepSeek 发送按钮只有图标时仍通过完整鼠标事件触发发送", async () => {
    const adapter = new DeepSeekAdapter();
    const observedEvents: string[] = [];
    const sendInputEvent = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS, sendInputEvent };

    document.body.innerHTML = `
      <div data-testid="composer">
        <textarea data-testid="prompt">hello there?</textarea>
        <button type="button" data-testid="deepseek-submit"><svg></svg></button>
      </div>
    `;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLTextAreaElement;
    const sendButton = document.querySelector("[data-testid='deepseek-submit']") as HTMLButtonElement;

    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 96,
          top: 660,
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
          top: 702,
          right: 840,
          bottom: 746,
          left: 796
        }) as DOMRect
    );
    ["pointerdown", "mousedown", "mouseup", "click"].forEach((eventName) => {
      sendButton.addEventListener(eventName, () => observedEvents.push(eventName));
    });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(observedEvents).toEqual(expect.arrayContaining(["pointerdown", "mousedown", "mouseup", "click"]));
    expect(sendInputEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "mouseDown", x: 818, y: 724 }));
    expect(sendInputEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "mouseUp", x: 818, y: 724 }));
  });

  it("DeepSeek 发送控件是无 role 图标容器时仍能点击输入区附近控件", async () => {
    const adapter = new DeepSeekAdapter();
    const sidebarClick = vi.fn();
    const sendClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <aside>
        <div class="sidebar-icon" data-testid="sidebar-icon"><svg></svg></div>
      </aside>
      <div class="chat-input-panel" data-testid="composer">
        <div class="chat-input-editor" role="textbox" contenteditable="true" data-testid="prompt">hello there?</div>
        <div class="ds-send-icon" data-testid="deepseek-icon-submit"><svg></svg></div>
      </div>
    `;
    const sidebarIcon = document.querySelector("[data-testid='sidebar-icon']") as HTMLDivElement;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLDivElement;
    const sendIcon = document.querySelector("[data-testid='deepseek-icon-submit']") as HTMLDivElement;

    sidebarIcon.click = sidebarClick;
    sendIcon.click = sendClick;
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 96,
          top: 660,
          right: 780,
          bottom: 756,
          left: 260
        }) as DOMRect
    );
    sendIcon.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 44,
          height: 44,
          top: 702,
          right: 840,
          bottom: 746,
          left: 796
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(sidebarClick).not.toHaveBeenCalled();
  });

  it("DeepSeek 附件按钮和发送按钮都在输入区右侧时选择最右侧发送按钮", async () => {
    const adapter = new DeepSeekAdapter();
    const attachClick = vi.fn();
    const sendClick = vi.fn();
    const sendInputEvent = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS, sendInputEvent };

    document.body.innerHTML = `
      <div class="chat-input-panel" data-testid="composer">
        <div class="chat-input-editor" role="textbox" contenteditable="true" data-testid="prompt">hello?</div>
        <div class="icon-button" data-testid="right-tool-a"><svg></svg></div>
        <div class="icon-button" data-testid="right-tool-b"><svg></svg></div>
      </div>
    `;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLDivElement;
    const attachmentIcon = document.querySelector("[data-testid='right-tool-a']") as HTMLDivElement;
    const sendIcon = document.querySelector("[data-testid='right-tool-b']") as HTMLDivElement;

    attachmentIcon.click = attachClick;
    sendIcon.click = sendClick;
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 960,
          height: 130,
          top: 530,
          right: 1220,
          bottom: 750,
          left: 192
        }) as DOMRect
    );
    attachmentIcon.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 44,
          height: 44,
          top: 658,
          right: 1360,
          bottom: 706,
          left: 1316
        }) as DOMRect
    );
    sendIcon.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 68,
          height: 68,
          top: 650,
          right: 1464,
          bottom: 724,
          left: 1396
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(attachClick).not.toHaveBeenCalled();
    expect(sendInputEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "mouseDown", x: 1430, y: 684 }));
    expect(sendInputEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "mouseUp", x: 1430, y: 684 }));
  });

  it("DeepSeek 发送控件监听在外层图标按钮时点击外层可交互容器", async () => {
    const adapter = new DeepSeekAdapter();
    const innerClick = vi.fn();
    const outerClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <div class="chat-input-panel" data-testid="composer">
        <textarea data-testid="prompt">hello there?</textarea>
        <div class="icon-shell" data-testid="inner-wrapper">
          <svg data-testid="send-svg"></svg>
        </div>
      </div>
    `;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLTextAreaElement;
    const composer = document.querySelector("[data-testid='composer']") as HTMLDivElement;
    const innerWrapper = document.querySelector("[data-testid='inner-wrapper']") as HTMLDivElement;

    composer.click = outerClick;
    innerWrapper.click = innerClick;
    Object.defineProperty(composer, "children", {
      configurable: true,
      value: [promptInput, innerWrapper]
    });
    Object.defineProperty(window, "getComputedStyle", {
      configurable: true,
      value: (element: Element) => ({
        display: "block",
        visibility: "visible",
        opacity: "1",
        cursor: element === composer ? "pointer" : "default"
      })
    });
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 96,
          top: 660,
          right: 780,
          bottom: 756,
          left: 260
        }) as DOMRect
    );
    composer.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 620,
          height: 112,
          top: 650,
          right: 880,
          bottom: 762,
          left: 240
        }) as DOMRect
    );
    innerWrapper.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 44,
          height: 44,
          top: 702,
          right: 840,
          bottom: 746,
          left: 796
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(outerClick).toHaveBeenCalledTimes(1);
    expect(innerClick).not.toHaveBeenCalled();
  });

  it("找不到发送按钮时不把合成回车当成发送成功", async () => {
    const adapter = new DeepSeekAdapter();
    const keydown = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `<textarea data-testid="prompt">hello there?</textarea>`;
    const promptInput = document.querySelector("[data-testid='prompt']") as HTMLTextAreaElement;
    promptInput.addEventListener("keydown", keydown);
    promptInput.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 520,
          height: 96,
          top: 660,
          right: 780,
          bottom: 756,
          left: 260
        }) as DOMRect
    );
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(false);
    expect(keydown).not.toHaveBeenCalled();
  });
});
