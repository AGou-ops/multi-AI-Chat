import { describe, expect, it, vi } from "vitest";
import type { WebContents } from "electron";
import { GeminiAdapter } from "./gemini-adapter";

function mockWebContents(executeJavaScriptResult: unknown): Partial<WebContents> {
  return {
    executeJavaScript: vi.fn().mockResolvedValue(executeJavaScriptResult)
  };
}

describe("GeminiAdapter", () => {
  it("platformId 是 gemini", () => {
    const adapter = new GeminiAdapter();
    expect(adapter.platformId).toBe("gemini");
  });

  it("找到输入框并成功填入 prompt", async () => {
    const adapter = new GeminiAdapter();
    const mockWC = mockWebContents({ found: true });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试 Gemini");

    expect(result.success).toBe(true);
    expect(result.reason).toMatch(/填入/);
    expect(mockWC.executeJavaScript).toHaveBeenCalled();
  });

  it("executeJavaScript 抛出异常时返回失败", async () => {
    const adapter = new GeminiAdapter();
    const mockWC: Partial<WebContents> = {
      executeJavaScript: vi.fn().mockRejectedValue(new Error("无法访问页面"))
    };

    const result = await adapter.attemptFill(mockWC as WebContents, "测试");

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/失败/);
  });

  it("不会读取 AI 回复内容", async () => {
    const adapter = new GeminiAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/innerText/);
    expect(injectedScript).not.toMatch(/document\.querySelector\(['"]\[class\*=.*message|document\.querySelectorAll/);
  });

  it("不会刷新页面", async () => {
    const adapter = new GeminiAdapter();
    const executeJS = vi.fn().mockResolvedValue(undefined);
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    await adapter.attemptFill(mockWC as WebContents, "测试");

    const injectedScript = executeJS.mock.calls[0][0] as string;
    expect(injectedScript).not.toMatch(/location\.reload|navigate/);
  });

  it("填入 Gemini rich-textarea 后触发页面可感知的输入事件以恢复发送按钮", async () => {
    const adapter = new GeminiAdapter();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <rich-textarea id="gemini-input"></rich-textarea>
      <button aria-label="Use microphone">麦克风</button>
    `;

    const host = document.getElementById("gemini-input") as HTMLElement;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<div role="textbox" contenteditable="true"></div>`;
    const editable = shadow.querySelector("[contenteditable]") as HTMLElement;
    editable.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 640,
          height: 56,
          bottom: 760
        }) as DOMRect
    );

    document.addEventListener("input", () => {
      const button = document.querySelector("button") as HTMLButtonElement | null;
      if (!button) {
        return;
      }
      button.setAttribute("aria-label", "Send message");
      button.textContent = "发送";
    });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试 Gemini");

    expect(result.success).toBe(true);
    expect(editable.textContent).toBe("测试 Gemini");
    expect(document.querySelector("button")).toHaveAccessibleName("Send message");
  });

  it("填入 Gemini rich-textarea 时保留内部编辑结构而不是改成裸文本", async () => {
    const adapter = new GeminiAdapter();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `<rich-textarea id="gemini-input"></rich-textarea>`;

    const host = document.getElementById("gemini-input") as HTMLElement;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <div role="textbox" contenteditable="true" data-testid="editor">
        <p data-testid="paragraph"><br /></p>
      </div>
    `;
    const editable = shadow.querySelector("[contenteditable]") as HTMLElement;
    const paragraph = shadow.querySelector("[data-testid='paragraph']") as HTMLElement;
    editable.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 640,
          height: 56,
          bottom: 760
        }) as DOMRect
    );
    document.execCommand = vi.fn((_command, _showUi, value) => {
      paragraph.textContent = value ?? "";
      return true;
    });

    const result = await adapter.attemptFill(mockWC as WebContents, "测试 Gemini");

    expect(result.success).toBe(true);
    expect(shadow.querySelector("[data-testid='editor']")).toHaveAttribute("contenteditable", "true");
    expect(shadow.querySelector("[data-testid='paragraph']")).toBe(paragraph);
    expect(paragraph.textContent).toBe("测试 Gemini");
  });

  it("自动发送只点击 Gemini 明确的发送按钮，不误点麦克风按钮", async () => {
    const adapter = new GeminiAdapter();
    const microphoneClick = vi.fn();
    const sendClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `
      <button aria-label="Use microphone" data-testid="mic"><svg></svg></button>
      <button aria-label="Send message" data-testid="send"><svg></svg></button>
    `;
    (document.querySelector("[data-testid='mic']") as HTMLButtonElement).click = microphoneClick;
    (document.querySelector("[data-testid='send']") as HTMLButtonElement).click = sendClick;

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(true);
    expect(sendClick).toHaveBeenCalledTimes(1);
    expect(microphoneClick).not.toHaveBeenCalled();
  });

  it("Gemini 发送按钮仍未出现时不会把麦克风按钮当成发送成功", async () => {
    const adapter = new GeminiAdapter();
    const microphoneClick = vi.fn();
    const executeJS = vi.fn().mockImplementation((script: string) => Promise.resolve(eval(script)));
    const mockWC: Partial<WebContents> = { executeJavaScript: executeJS };

    document.body.innerHTML = `<button aria-label="Use microphone"><svg></svg></button>`;
    (document.querySelector("button") as HTMLButtonElement).click = microphoneClick;

    const result = await adapter.attemptSend(mockWC as WebContents);

    expect(result.success).toBe(false);
    expect(microphoneClick).not.toHaveBeenCalled();
  });
});
