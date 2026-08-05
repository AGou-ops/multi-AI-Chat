import { beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => {
  const browserWindowInstances: Array<{
    options: Record<string, unknown>;
    webContents: object;
    emit: (eventName: string, ...args: unknown[]) => void;
  }> = [];
  const ipcMainOn = vi.fn();
  const ipcMainOff = vi.fn();

  class BrowserWindowMock {
    static reset() {
      browserWindowInstances.length = 0;
    }

    public static instances = browserWindowInstances;

    public readonly options: Record<string, unknown>;
    public readonly webContents = {};
    private destroyed = false;
    private listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    private onceListeners = new Map<string, Array<(...args: unknown[]) => void>>();

    constructor(options: Record<string, unknown>) {
      this.options = options;
      browserWindowInstances.push(this);
    }

    on(eventName: string, handler: (...args: unknown[]) => void) {
      const handlers = this.listeners.get(eventName) ?? [];
      handlers.push(handler);
      this.listeners.set(eventName, handlers);
      return this;
    }

    once(eventName: string, handler: (...args: unknown[]) => void) {
      const handlers = this.onceListeners.get(eventName) ?? [];
      handlers.push(handler);
      this.onceListeners.set(eventName, handlers);
      return this;
    }

    emit(eventName: string, ...args: unknown[]) {
      for (const handler of this.listeners.get(eventName) ?? []) {
        handler(...args);
      }

      const onceHandlers = this.onceListeners.get(eventName) ?? [];
      this.onceListeners.delete(eventName);
      for (const handler of onceHandlers) {
        handler(...args);
      }
    }

    show = vi.fn();
    close = vi.fn(() => {
      this.destroyed = true;
    });
    isDestroyed = vi.fn(() => this.destroyed);
    loadURL = vi.fn(() => Promise.resolve());
  }

  return {
    BrowserWindowMock,
    ipcMainOn,
    ipcMainOff
  };
});

vi.mock("electron", () => ({
  BrowserWindow: electronMock.BrowserWindowMock,
  dialog: {
    showMessageBox: vi.fn()
  },
  ipcMain: {
    on: electronMock.ipcMainOn,
    off: electronMock.ipcMainOff
  }
}));

import { showAddPlatformDialog, showSettingsDialog } from "./modal-dialogs";

describe("showAddPlatformDialog", () => {
  beforeEach(() => {
    electronMock.BrowserWindowMock.reset();
    electronMock.ipcMainOn.mockReset();
    electronMock.ipcMainOff.mockReset();
  });

  it("使用更紧凑的默认窗口高度，确保表单内容能一次性完整显示", async () => {
    const dialogPromise = showAddPlatformDialog({} as never, { existingUrls: [] });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);

    expect(modalWindow).toBeDefined();
    expect(modalWindow?.options).toEqual(
      expect.objectContaining({
        useContentSize: true,
        width: 560,
        height: 360,
        minWidth: 560,
        minHeight: 360
      })
    );

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });

  it("使用和设置弹窗一致的紧凑工作台弹窗结构", async () => {
    const dialogPromise = showAddPlatformDialog({} as never, { existingUrls: [] });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const html = decodeLoadedHtml(modalWindow);

    expect(html).toContain('class="settings-dialog add-platform-dialog"');
    expect(html).toContain('class="dialog-header"');
    expect(html).toContain('class="settings-title"');
    expect(html).toContain('class="settings-dialog-body"');
    expect(html).toContain('class="settings-section"');
    expect(html).toContain('class="settings-field"');
    expect(html).toContain('class="dialog-footer"');
    expect(html).not.toContain('class="shell"');
    expect(html).toContain("height: 100vh;");
    expect(html).toContain("width: 100vw;");
    expect(html).toContain("align-content: start;");
    expect(html).toContain("align-self: start;");

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });

  it("按当前工作台主题渲染自定义平台弹窗", async () => {
    const dialogPromise = showAddPlatformDialog({} as never, { existingUrls: [], theme: "dark" });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const html = decodeLoadedHtml(modalWindow);

    expect(modalWindow?.options).toEqual(
      expect.objectContaining({
        backgroundColor: "#111827"
      })
    );
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('body[data-theme="dark"] .settings-dialog');
    expect(html).toContain('body[data-theme="dark"] .settings-section');
    expect(html).toContain('body[data-theme="dark"] input');

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });
});

describe("showSettingsDialog", () => {
  beforeEach(() => {
    electronMock.BrowserWindowMock.reset();
    electronMock.ipcMainOn.mockReset();
    electronMock.ipcMainOff.mockReset();
  });

  it("使用独立宿主弹窗承载设置，避免被 AI chat 视图盖住", async () => {
    const dialogPromise = showSettingsDialog({} as never, {
      themePreference: "system",
      resolvedTheme: "dark",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoClearPromptEnabled: true,
        confirmBatchSendEnabled: true,
      autoSendEnabledPlatformIds: ["claude"],
      autoSendPlatforms: [
        { id: "chatgpt", name: "ChatGPT" },
        { id: "claude", name: "Claude" }
      ]
    });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const html = decodeLoadedHtml(modalWindow);

    expect(modalWindow?.options).toEqual(
      expect.objectContaining({
        modal: true,
        parent: {},
        width: 560,
        height: 520,
        backgroundColor: "#111827"
      })
    );
    expect(html).toContain("工作台偏好");
    expect(html).toContain('class="settings-dialog"');
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('"name":"Claude"');
    expect(html).toContain('class="close-icon"');
    expect(html).not.toContain(">×</button>");
    expect(html).toContain("syncThemePreview");
    expect(html).toContain('input[name="themePreference"]');
    expect(html).toContain('name="autoClearPromptEnabled"');
    expect(html).toContain("是否自动清空输入框");
    expect(html).toContain("options.autoClearPromptEnabled");
    expect(html).toContain("document.body.dataset.theme = previewTheme");

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });

  it("主题选择变化时通知宿主工作台立即同步并持久化", async () => {
    const onThemePreferenceChange = vi.fn();
    const dialogPromise = showSettingsDialog({} as never, {
      themePreference: "system",
      resolvedTheme: "light",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoClearPromptEnabled: true,
        confirmBatchSendEnabled: true,
      autoSendEnabledPlatformIds: [],
      autoSendPlatforms: [],
      onThemePreferenceChange
    });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const themeChangeHandler = electronMock.ipcMainOn.mock.calls.find(
      ([channel]) => channel === "modal:settings:theme-change"
    )?.[1] as ((event: { sender: object }, payload: { themePreference: "dark" }) => void) | undefined;

    expect(themeChangeHandler).toBeDefined();
    themeChangeHandler?.({ sender: modalWindow?.webContents ?? {} }, { themePreference: "dark" });

    expect(onThemePreferenceChange).toHaveBeenCalledWith("dark");

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });

  it("设置复选框正确渲染 static checked 属性且 label 不包含多余 for 属性", async () => {
    const dialogPromise = showSettingsDialog({} as never, {
      themePreference: "system",
      resolvedTheme: "light",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoClearPromptEnabled: false,
      confirmBatchSendEnabled: true,
      autoSendEnabledPlatformIds: [],
      autoSendPlatforms: []
    });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const html = decodeLoadedHtml(modalWindow);

    expect(html).toContain('id="settings-auto-clear-prompt" type="checkbox" name="autoClearPromptEnabled"');
    expect(html).not.toContain('id="settings-auto-clear-prompt" type="checkbox" name="autoClearPromptEnabled" checked');
    expect(html).toContain('id="settings-confirm-batch-send" type="checkbox" name="confirmBatchSendEnabled" checked');

    expect(html).not.toContain('for="settings-auto-clear-prompt"');
    expect(html).not.toContain('for="settings-confirm-batch-send"');

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });

  it("点击标题栏关闭按钮时提交当前设置，而底部取消按钮仍放弃修改", async () => {
    const dialogPromise = showSettingsDialog({} as never, {
      themePreference: "system",
      resolvedTheme: "light",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoClearPromptEnabled: true,
      confirmBatchSendEnabled: true,
      autoSendEnabledPlatformIds: [],
      autoSendPlatforms: []
    });
    const modalWindow = electronMock.BrowserWindowMock.instances.at(0);
    const html = decodeLoadedHtml(modalWindow);

    expect(html).toContain('closeButton.addEventListener("click", () => form.requestSubmit())');
    expect(html).toContain('cancelButton.addEventListener("click", () => ipcRenderer.send("modal:settings:cancel"))');

    modalWindow?.emit("closed");
    await expect(dialogPromise).resolves.toBeNull();
  });
});

function decodeLoadedHtml(modalWindow: (typeof electronMock.BrowserWindowMock.instances)[number] | undefined): string {
  expect(modalWindow).toBeDefined();

  const loadURLMock = (modalWindow as unknown as { loadURL: { mock: { calls: Array<[string]> } } }).loadURL;
  const loadedUrl = loadURLMock.mock.calls.at(0)?.[0];

  expect(loadedUrl).toMatch(/^data:text\/html;charset=utf-8,/);

  return decodeURIComponent(loadedUrl?.replace("data:text/html;charset=utf-8,", "") ?? "");
}
