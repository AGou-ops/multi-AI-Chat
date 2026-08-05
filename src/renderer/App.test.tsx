import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AppConfig } from "../shared/config";
import type { PromptExecutionRecord } from "../shared/execution-record";
import type { PlatformConfig } from "../shared/types";
import { App } from "./App";

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: target.getBoundingClientRect()
        } as ResizeObserverEntry
      ],
      this as unknown as ResizeObserver
    );
  }

  unobserve() {}

  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  Element.prototype.getBoundingClientRect = function mockRect() {
    if (this.getAttribute("aria-label") === "平台工作区") {
      return {
        x: 242,
        y: 54,
        width: 1424,
        height: 1042,
        top: 54,
        right: 1666,
        bottom: 1096,
        left: 242,
        toJSON() {
          return this;
        }
      } satisfies DOMRect;
    }

    const platformId = (this as HTMLElement).dataset.platformViewHost;

    if (platformId === "chatgpt") {
      return {
        x: 254,
        y: 109,
        width: 700,
        height: 464,
        top: 109,
        right: 954,
        bottom: 573,
        left: 254,
        toJSON() {
          return this;
        }
      } satisfies DOMRect;
    }

    if (platformId === "claude") {
      return {
        x: 964,
        y: 109,
        width: 700,
        height: 464,
        top: 109,
        right: 1664,
        bottom: 573,
        left: 964,
        toJSON() {
          return this;
        }
      } satisfies DOMRect;
    }

    if (platformId === "gemini") {
      return {
        x: 254,
        y: 631,
        width: 700,
        height: 464,
        top: 631,
        right: 954,
        bottom: 1095,
        left: 254,
        toJSON() {
          return this;
        }
      } satisfies DOMRect;
    }

    if (platformId === "deepseek") {
      return {
        x: 964,
        y: 631,
        width: 700,
        height: 464,
        top: 631,
        right: 1664,
        bottom: 1095,
        left: 964,
        toJSON() {
          return this;
        }
      } satisfies DOMRect;
    }

    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      toJSON() {
        return this;
      }
    } satisfies DOMRect;
  };
});

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

function mockBridge(overrides: Partial<{
  setPlatformLayout: ReturnType<typeof vi.fn>;
  toggleWindowMaximize: ReturnType<typeof vi.fn>;
  getConfig: ReturnType<typeof vi.fn>;
  updateConfig: ReturnType<typeof vi.fn>;
  addCustomPlatform: ReturnType<typeof vi.fn>;
  openAddPlatformDialog: ReturnType<typeof vi.fn>;
  openSettingsDialog: ReturnType<typeof vi.fn>;
  onThemePreferenceChanged: ReturnType<typeof vi.fn>;
  showPlatformLimitDialog: ReturnType<typeof vi.fn>;
  updateCustomPlatform: ReturnType<typeof vi.fn>;
  removeCustomPlatform: ReturnType<typeof vi.fn>;
  copyPrompt: ReturnType<typeof vi.fn>;
  executePrompt: ReturnType<typeof vi.fn>;
  listExecutionRecords: ReturnType<typeof vi.fn>;
  confirmBatchSend: ReturnType<typeof vi.fn>;
  savePrompt: ReturnType<typeof vi.fn>;
  listPromptHistory: ReturnType<typeof vi.fn>;
  clearPromptHistory: ReturnType<typeof vi.fn>;
  reloadPlatform: ReturnType<typeof vi.fn>;
  onPlatformLoadingState: ReturnType<typeof vi.fn>;
}> = {}) {
  Object.defineProperty(window, "multiAIChat", {
    configurable: true,
    value: {
      setPlatformLayout: overrides.setPlatformLayout ?? vi.fn(),
      toggleWindowMaximize: overrides.toggleWindowMaximize ?? vi.fn().mockResolvedValue(undefined),
      getConfig: overrides.getConfig ?? vi.fn().mockResolvedValue({ enabledPlatformIds: ["chatgpt"], customPlatforms: [] }),
      updateConfig: overrides.updateConfig ?? vi.fn(),
      addCustomPlatform: overrides.addCustomPlatform ?? vi.fn().mockResolvedValue(undefined),
      openAddPlatformDialog: overrides.openAddPlatformDialog ?? vi.fn().mockResolvedValue(null),
      openSettingsDialog: overrides.openSettingsDialog ?? vi.fn().mockResolvedValue(null),
      onThemePreferenceChanged: overrides.onThemePreferenceChanged ?? vi.fn().mockReturnValue(() => undefined),
      showPlatformLimitDialog: overrides.showPlatformLimitDialog ?? vi.fn().mockResolvedValue(undefined),
      updateCustomPlatform: overrides.updateCustomPlatform ?? vi.fn().mockResolvedValue(undefined),
      removeCustomPlatform: overrides.removeCustomPlatform ?? vi.fn().mockResolvedValue(undefined),
      copyPrompt: overrides.copyPrompt ?? vi.fn().mockResolvedValue(undefined),
      executePrompt: overrides.executePrompt ?? vi.fn().mockResolvedValue({
        record: {
          id: "exec-1",
          promptId: "prompt-1",
          promptSnapshot: "默认执行 prompt",
          targetPlatformIds: ["chatgpt"],
          attemptedAction: "fill",
          createdAt: "2026-06-26T08:00:00.000Z",
          results: [
            {
              platformId: "chatgpt",
              action: "fill",
              status: "skipped",
              reason: "自动填入 Beta 尚未接入，请先手动粘贴后发送",
              retryCount: 0,
              timestamp: "2026-06-26T08:00:00.000Z"
            }
          ]
        },
        promptHistory: []
      }),
      listExecutionRecords: overrides.listExecutionRecords ?? vi.fn().mockResolvedValue([]),
      confirmBatchSend: overrides.confirmBatchSend ?? vi.fn().mockResolvedValue(true),
      savePrompt: overrides.savePrompt ?? vi.fn().mockResolvedValue([]),
      listPromptHistory: overrides.listPromptHistory ?? vi.fn().mockResolvedValue([]),
      clearPromptHistory: overrides.clearPromptHistory ?? vi.fn().mockResolvedValue([]),
      reloadPlatform: overrides.reloadPlatform ?? vi.fn().mockResolvedValue(undefined),
      onPlatformLoadingState: overrides.onPlatformLoadingState ?? vi.fn().mockReturnValue(() => undefined)
    }
  });
}

const sampleCustomPlatform: PlatformConfig = {
  id: "custom-perplexity-abc",
  kind: "custom",
  name: "Perplexity",
  url: "https://perplexity.ai",
  partition: "persist:custom-perplexity-abc",
  allowedAuthDomains: [],
  autoFillEnabled: false,
  autoSendEnabled: false
};

const sampleExecutionRecord: PromptExecutionRecord = {
  id: "exec-1",
  promptId: "prompt-1",
  promptSnapshot: "总结这段需求",
  targetPlatformIds: ["chatgpt", "claude"],
  attemptedAction: "fill",
  createdAt: "2026-06-26T08:00:00.000Z",
  results: [
    {
      platformId: "chatgpt",
      action: "fill",
      status: "skipped",
      reason: "自动填入 Beta 尚未接入，请先手动粘贴后发送",
      retryCount: 0,
      timestamp: "2026-06-26T08:00:00.000Z"
    },
    {
      platformId: "claude",
      action: "fill",
      status: "skipped",
      reason: "自动填入 Beta 尚未接入，请先手动粘贴后发送",
      retryCount: 0,
      timestamp: "2026-06-26T08:00:00.000Z"
    }
  ]
};

describe("多 AI 工作台外壳", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "multiAIChat");
  });

  it("渲染平台栏、prompt 命令栏和平台区域", () => {
    render(<App />);

    expect(screen.getByRole("navigation", { name: "AI 平台" })).toHaveClass("has-titlebar-safe-area");
    expect(screen.getByRole("button", { name: "双击切换窗口大小" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI 也会犯错，谨记。")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "平台工作区" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ChatGPT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gemini" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DeepSeek" })).toBeInTheDocument();
  });

  it("双击左上角标题栏空白区域切换窗口大小", () => {
    const toggleWindowMaximize = vi.fn().mockResolvedValue(undefined);
    mockBridge({ toggleWindowMaximize });

    render(<App />);
    fireEvent.doubleClick(screen.getByRole("button", { name: "双击切换窗口大小" }));

    expect(toggleWindowMaximize).toHaveBeenCalledOnce();
  });

  it("把 renderer 实测的平台内容区边界同步给主进程，避免真实视图遮挡 prompt 区", async () => {
    const setPlatformLayout = vi.fn();
    mockBridge({ setPlatformLayout });

    render(<App />);

    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt"],
          focusedPlatformId: null,
          mode: "grid",
          visiblePlatformBounds: {
            chatgpt: {
              x: 254,
              y: 109,
              width: 700,
              height: 464
            }
          }
        })
      );
    });
  });

  it("AI 也会犯错，谨记。 位于平台工作区下方", () => {
    render(<App />);

    const workspace = screen.getByRole("main", { name: "平台工作区" });
    const promptBar = screen.getByLabelText("AI 也会犯错，谨记。").closest("footer");

    expect(promptBar).not.toBeNull();
    expect(workspace.compareDocumentPosition(promptBar as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("启用第二个平台后显示双平台网格", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Claude" }));

    const workspace = screen.getByRole("main", { name: "平台工作区" });
    expect(workspace).toHaveAttribute("data-layout-count", "2");
    expect(within(workspace).getByRole("region", { name: "ChatGPT 视图" })).toBeInTheDocument();
    expect(within(workspace).getByRole("region", { name: "Claude 视图" })).toBeInTheDocument();
  });

  it("点击刷新平台时显示该平台加载进度条直到刷新结束", async () => {
    let resolveReload: () => void = () => undefined;
    const reloadPlatform = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReload = resolve;
        })
    );
    mockBridge({ reloadPlatform });

    render(<App />);

    const chatgptFrame = screen.getByRole("region", { name: "ChatGPT 视图" });

    fireEvent.click(within(chatgptFrame).getByRole("button", { name: "重新加载 ChatGPT" }));

    expect(reloadPlatform).toHaveBeenCalledWith("chatgpt");
    expect(within(chatgptFrame).getByRole("progressbar", { name: "ChatGPT 加载进度" })).toBeInTheDocument();
    expect(screen.getByText("正在重新加载 ChatGPT...")).toBeInTheDocument();

    resolveReload();

    await waitFor(() => {
      expect(within(chatgptFrame).queryByRole("progressbar", { name: "ChatGPT 加载进度" })).not.toBeInTheDocument();
    });
  });

  it("收到宿主加载状态时只显示对应平台的加载进度条", async () => {
    let emitLoadingState: ((state: { platformId: string; isLoading: boolean }) => void) | null = null;
    const onPlatformLoadingState = vi.fn((handler) => {
      emitLoadingState = handler;
      return () => undefined;
    });
    mockBridge({
      onPlatformLoadingState,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: []
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    await waitFor(() => {
      expect(onPlatformLoadingState).toHaveBeenCalled();
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    act(() => {
      emitLoadingState?.({ platformId: "claude", isLoading: true });
    });

    const chatgptFrame = screen.getByRole("region", { name: "ChatGPT 视图" });
    const claudeFrame = screen.getByRole("region", { name: "Claude 视图" });

    expect(within(claudeFrame).getByRole("progressbar", { name: "Claude 加载进度" })).toBeInTheDocument();
    expect(within(chatgptFrame).queryByRole("progressbar", { name: "ChatGPT 加载进度" })).not.toBeInTheDocument();

    act(() => {
      emitLoadingState?.({ platformId: "claude", isLoading: false });
    });

    await waitFor(() => {
      expect(within(claudeFrame).queryByRole("progressbar", { name: "Claude 加载进度" })).not.toBeInTheDocument();
    });
  });

  it("可切换为垂直布局并持久化该偏好", async () => {
    const updateConfig = vi.fn();
    const setPlatformLayout = vi.fn();
    mockBridge({
      updateConfig,
      setPlatformLayout,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude", "gemini"],
        customPlatforms: []
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    const workspace = await waitFor(() => screen.getByRole("main", { name: "平台工作区" }));
    expect(workspace).toHaveAttribute("data-layout-mode", "grid");

    fireEvent.click(screen.getByRole("button", { name: "切换为垂直布局" }));

    expect(workspace).toHaveAttribute("data-layout-mode", "columns");

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        platformLayoutMode: "columns"
      });
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt", "claude", "gemini"],
          focusedPlatformId: null,
          mode: "columns"
        })
      );
    });
  });

  it("布局模式切换控件位于平台栏，与工作区隔离", async () => {
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude", "gemini"],
        customPlatforms: []
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    const rail = await waitFor(() => screen.getByRole("navigation", { name: "AI 平台" }));
    const workspace = screen.getByRole("main", { name: "平台工作区" });

    expect(within(rail).getByRole("button", { name: "切换为垂直布局" })).toBeInTheDocument();
    expect(within(workspace).queryByRole("button", { name: "切换为垂直布局" })).toBeNull();
  });

  it("从左下角打开设置弹窗并切换暗黑主题", async () => {
    const updateConfig = vi.fn();
    const openSettingsDialog = vi.fn().mockResolvedValue({
      themePreference: "dark",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoSendEnabledPlatformIds: []
    });
    mockBridge({ updateConfig, openSettingsDialog });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          themePreference: "system",
          resolvedTheme: "light",
          platformLayoutMode: "grid",
          autoClearPromptEnabled: true
        })
      );
    });

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          themePreference: "dark"
        })
      );
    });
    expect(screen.getByText("工作台偏好已更新")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开设置" }).closest(".app-shell")).toHaveAttribute("data-theme", "dark");
  });

  it("启用自动清空时点击填入已启用平台会清空输入框", async () => {
    const executePrompt = vi.fn().mockResolvedValue({
      record: sampleExecutionRecord,
      promptHistory: []
    });
    mockBridge({ executePrompt });

    render(<App />);

    const promptInput = screen.getByLabelText("AI 也会犯错，谨记。");
    fireEvent.change(promptInput, { target: { value: "需要填入的平台内容" } });
    fireEvent.click(screen.getByRole("button", { name: "填入已启用平台" }));

    await waitFor(() => {
      expect(executePrompt).toHaveBeenCalledWith("需要填入的平台内容", ["chatgpt"], []);
      expect(promptInput).toHaveValue("");
    });
  });

  it("禁用自动清空时点击填入已启用平台会保留输入框内容", async () => {
    const executePrompt = vi.fn().mockResolvedValue({
      record: sampleExecutionRecord,
      promptHistory: []
    });
    mockBridge({
      executePrompt,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [],
        autoClearPromptEnabled: false
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    const promptInput = screen.getByLabelText("AI 也会犯错，谨记。");
    fireEvent.change(promptInput, { target: { value: "保留这段输入内容" } });
    fireEvent.click(screen.getByRole("button", { name: "填入已启用平台" }));

    await waitFor(() => {
      expect(executePrompt).toHaveBeenCalledWith("保留这段输入内容", ["chatgpt"], []);
      expect(promptInput).toHaveValue("保留这段输入内容");
    });
  });

  it("设置弹窗内切换主题时立即同步到工作台并用于下次打开设置", async () => {
    let themePreferenceHandler: ((themePreference: "light" | "dark" | "system") => void) | undefined;
    const onThemePreferenceChanged = vi.fn((handler) => {
      themePreferenceHandler = handler;
      return vi.fn();
    });
    const openSettingsDialog = vi.fn().mockResolvedValue(null);
    mockBridge({ openSettingsDialog, onThemePreferenceChanged });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));
    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          themePreference: "system",
          resolvedTheme: "light"
        })
      );
    });

    act(() => {
      themePreferenceHandler?.("dark");
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "打开设置" }).closest(".app-shell")).toHaveAttribute("data-theme", "dark");
    });

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          themePreference: "dark",
          resolvedTheme: "dark"
        })
      );
    });
  });

  it("打开宿主设置弹窗时保持平台视图原样显示", async () => {
    const setPlatformLayout = vi.fn();
    const openSettingsDialog = vi.fn().mockResolvedValue(null);
    mockBridge({
      setPlatformLayout,
      openSettingsDialog,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: []
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt", "claude"],
          hidePlatformViews: false
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenCalled();
    });
    expect(screen.queryByRole("dialog", { name: "工作台偏好" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt", "claude"],
          hidePlatformViews: false
        })
      );
    });
  });

  it("宿主设置弹窗返回后可以调整布局、历史保留和自动发送目标", async () => {
    const updateConfig = vi.fn();
    const openSettingsDialog = vi.fn().mockResolvedValue({
      themePreference: "system",
      platformLayoutMode: "columns",
      promptRetentionPolicy: { type: "latest-days", days: 30 },
      autoClearPromptEnabled: false,
      autoSendEnabledPlatformIds: ["claude"]
    });
    mockBridge({
      updateConfig,
      openSettingsDialog,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: []
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          platformLayoutMode: "columns",
          promptRetentionPolicy: { type: "latest-days", days: 30 },
          autoClearPromptEnabled: false,
          autoSendEnabledPlatformIds: ["claude"]
        })
      );
    });
  });

  it("第五个平台被启用时弹出上限告警并保持四个平台", async () => {
    const showPlatformLimitDialog = vi.fn().mockResolvedValue(undefined);
    mockBridge({
      showPlatformLimitDialog,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude", "gemini", "deepseek"],
        customPlatforms: [sampleCustomPlatform]
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "4");
    });

    fireEvent.click(screen.getByRole("button", { name: "Perplexity" }));

    await waitFor(() => {
      expect(showPlatformLimitDialog).toHaveBeenCalled();
    });
    expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "4");
    expect(screen.getByRole("button", { name: "Perplexity" })).toHaveAttribute("aria-pressed", "false");
  });

  it("执行填入后显示平台级结果与回退提示", async () => {
    const executePrompt = vi.fn().mockResolvedValue({
      record: sampleExecutionRecord,
      promptHistory: [
        {
          id: "prompt-1",
          content: "总结这段需求",
          createdAt: "2026-06-26T08:00:00.000Z",
          updatedAt: "2026-06-26T08:00:00.000Z"
        }
      ]
    });
    mockBridge({
      executePrompt,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: []
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    fireEvent.change(screen.getByLabelText("AI 也会犯错，谨记。"), {
      target: { value: "总结这段需求" }
    });
    fireEvent.click(screen.getByRole("button", { name: "填入已启用平台" }));

    await waitFor(() => {
      expect(executePrompt).toHaveBeenCalledWith("总结这段需求", ["chatgpt", "claude"], []);
    });

    const executionSection = screen.getByText("最近执行").closest("section");

    expect(executionSection).not.toBeNull();
    expect(within(executionSection as HTMLElement).getAllByText("待手动操作")).toHaveLength(2);
    expect(within(executionSection as HTMLElement).getAllByText("自动填入 Beta 尚未接入，请先手动粘贴后发送")).toHaveLength(2);
    expect(screen.getByText("已记录 2 个平台结果。")).toBeInTheDocument();
  });

  it("自动发送确认被取消时不执行", async () => {
    const executePrompt = vi.fn();
    const confirmBatchSend = vi.fn().mockResolvedValue(false);
    mockBridge({
      executePrompt,
      confirmBatchSend,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: ["chatgpt"]
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "1");
    });

    fireEvent.change(screen.getByLabelText("AI 也会犯错，谨记。"), {
      target: { value: "自动发送测试" }
    });
    fireEvent.click(screen.getByRole("button", { name: "填入已启用平台" }));

    await waitFor(() => {
      expect(confirmBatchSend).toHaveBeenCalled();
      expect(executePrompt).not.toHaveBeenCalled();
    });

    expect(screen.getByText("已取消自动发送")).toBeInTheDocument();
  });

  it("切换内置平台自动发送设置", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      updateConfig,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: []
      })
    });

    render(<App />);

    const chatgptCheckbox = screen.getByRole("checkbox", { name: "自动发送 ChatGPT" });
    expect(chatgptCheckbox).not.toBeChecked();

    fireEvent.click(chatgptCheckbox);

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        autoSendEnabledPlatformIds: ["chatgpt"]
      });
    });

    expect(screen.getByText("自动发送设置已更新")).toBeInTheDocument();
  });

  it("自动发送勾选框只跟随当前打开的平台显示", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      updateConfig,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: ["chatgpt", "deepseek"]
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    expect(screen.getByRole("checkbox", { name: "自动发送 ChatGPT" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "自动发送 Claude" })).not.toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "自动发送 Gemini" })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: "自动发送 DeepSeek" })).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "自动发送 Claude" }));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        autoSendEnabledPlatformIds: ["chatgpt", "claude"]
      });
    });
  });

  it("可一键全选当前打开平台作为自动发送目标", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      updateConfig,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: []
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    fireEvent.click(screen.getByRole("button", { name: "全选自动发送平台" }));

    expect(screen.getByRole("checkbox", { name: "自动发送 ChatGPT" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "自动发送 Claude" })).toBeChecked();

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        autoSendEnabledPlatformIds: ["chatgpt", "claude"]
      });
    });
    expect(screen.getByText("已全选当前打开平台作为自动发送目标")).toBeInTheDocument();
  });

  it("已全选自动发送目标时可一键取消全选", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      updateConfig,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: [],
        autoSendEnabledPlatformIds: ["chatgpt", "claude"]
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "自动发送 ChatGPT" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "自动发送 Claude" })).toBeChecked();
    });

    fireEvent.click(screen.getByRole("button", { name: "取消全选自动发送平台" }));

    expect(screen.getByRole("checkbox", { name: "自动发送 ChatGPT" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "自动发送 Claude" })).not.toBeChecked();

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        autoSendEnabledPlatformIds: []
      });
    });
    expect(screen.getByText("已取消全选自动发送目标")).toBeInTheDocument();
  });

  it("自动发送勾选框包含当前打开的自定义平台", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      updateConfig,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "custom-perplexity-abc"],
        customPlatforms: [sampleCustomPlatform],
        autoSendEnabledPlatformIds: []
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    const perplexityCheckbox = screen.getByRole("checkbox", { name: "自动发送 Perplexity" });
    expect(perplexityCheckbox).not.toBeChecked();

    fireEvent.click(perplexityCheckbox);

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        autoSendEnabledPlatformIds: ["custom-perplexity-abc"]
      });
    });
  });

  it("启动时不恢复上次退出前的执行状态", async () => {
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude"],
        customPlatforms: []
      }),
      listExecutionRecords: vi.fn().mockResolvedValue([sampleExecutionRecord])
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    const executionSection = screen.getByText("最近执行").closest("section");
    expect(executionSection).not.toBeNull();
    expect(within(executionSection as HTMLElement).getByText("暂无执行记录")).toBeInTheDocument();
    expect(screen.queryByText("待手动操作")).not.toBeInTheDocument();
    expect(screen.queryByText("执行失败")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("加载失败")).not.toBeInTheDocument();
  });

  const sampleFailedRecord: PromptExecutionRecord = {
    id: "exec-fail",
    promptId: "prompt-fail",
    promptSnapshot: "失败的 prompt",
    targetPlatformIds: ["chatgpt"],
    attemptedAction: "fill",
    createdAt: "2026-06-26T09:00:00.000Z",
    results: [
      {
        platformId: "chatgpt",
        action: "fill",
        status: "failed",
        reason: "未找到输入框，请手动粘贴",
        retryCount: 2,
        timestamp: "2026-06-26T09:00:00.000Z"
      }
    ]
  };

  const sampleSuccessRecord: PromptExecutionRecord = {
    id: "exec-ok",
    promptId: "prompt-ok",
    promptSnapshot: "成功的 prompt",
    targetPlatformIds: ["chatgpt"],
    attemptedAction: "fill",
    createdAt: "2026-06-26T09:01:00.000Z",
    results: [
      {
        platformId: "chatgpt",
        action: "fill",
        status: "success",
        reason: "已自动填入",
        retryCount: 0,
        timestamp: "2026-06-26T09:01:00.000Z"
      }
    ]
  };

  const sampleMixedRecord: PromptExecutionRecord = {
    id: "exec-mixed",
    promptId: "prompt-mixed",
    promptSnapshot: "混合结果的 prompt",
    targetPlatformIds: ["chatgpt", "claude", "gemini"],
    attemptedAction: "fill",
    createdAt: "2026-06-26T09:02:00.000Z",
    results: [
      {
        platformId: "chatgpt",
        action: "fill",
        status: "success",
        reason: "已自动填入",
        retryCount: 0,
        timestamp: "2026-06-26T09:02:00.000Z"
      },
      {
        platformId: "claude",
        action: "fill",
        status: "skipped",
        reason: "自动填入 Beta 尚未接入",
        retryCount: 0,
        timestamp: "2026-06-26T09:02:00.000Z"
      },
      {
        platformId: "gemini",
        action: "fill",
        status: "failed",
        reason: "平台页面加载超时",
        retryCount: 2,
        timestamp: "2026-06-26T09:02:00.000Z"
      }
    ]
  };

  async function renderAndExecute(record: PromptExecutionRecord) {
    const executePrompt = vi.fn().mockResolvedValue({
      record,
      promptHistory: [
        {
          id: record.promptId ?? "prompt-current",
          content: record.promptSnapshot,
          createdAt: record.createdAt,
          updatedAt: record.createdAt
        }
      ]
    });

    mockBridge({
      executePrompt,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: record.targetPlatformIds,
        customPlatforms: []
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute(
        "data-layout-count",
        String(record.targetPlatformIds.length)
      );
    });

    fireEvent.change(screen.getByLabelText("AI 也会犯错，谨记。"), {
      target: { value: record.promptSnapshot }
    });
    fireEvent.click(screen.getByRole("button", { name: "填入已启用平台" }));

    await waitFor(() => {
      expect(executePrompt).toHaveBeenCalledWith(record.promptSnapshot, record.targetPlatformIds, []);
    });
  }

  it("显示 failed 状态的执行记录和失败原因", async () => {
    await renderAndExecute(sampleFailedRecord);

    const executionSection = screen.getByText("最近执行").closest("section");
    expect(within(executionSection as HTMLElement).getByText("执行失败")).toBeInTheDocument();
    expect(within(executionSection as HTMLElement).getByText("未找到输入框，请手动粘贴")).toBeInTheDocument();
  });

  it("显示 success 状态的执行记录", async () => {
    await renderAndExecute(sampleSuccessRecord);

    const executionSection = screen.getByText("最近执行").closest("section");
    expect(within(executionSection as HTMLElement).getByText("已完成")).toBeInTheDocument();
    expect(within(executionSection as HTMLElement).getByText("已自动填入")).toBeInTheDocument();
  });

  it("同一执行记录中混合 success/skipped/failed 状态均正确显示", async () => {
    await renderAndExecute(sampleMixedRecord);

    const executionSection = screen.getByText("最近执行").closest("section");
    expect(within(executionSection as HTMLElement).getByText("已完成")).toBeInTheDocument();
    expect(within(executionSection as HTMLElement).getByText("待手动操作")).toBeInTheDocument();
    expect(within(executionSection as HTMLElement).getByText("执行失败")).toBeInTheDocument();
  });

  it("平台标题栏显示对应执行结果状态", async () => {
    await renderAndExecute(sampleMixedRecord);

    const chatgptFrame = screen.getByRole("region", { name: "ChatGPT 视图" });
    const claudeFrame = screen.getByRole("region", { name: "Claude 视图" });
    const geminiFrame = screen.getByRole("region", { name: "Gemini 视图" });

    expect(within(chatgptFrame).getByText("已完成")).toBeInTheDocument();
    expect(within(claudeFrame).getByText("待手动操作")).toBeInTheDocument();
    expect(within(geminiFrame).getByText("执行失败")).toBeInTheDocument();
  });

  it("点击最近执行条目后恢复对应 Prompt 到输入框", async () => {
    await renderAndExecute(sampleExecutionRecord);

    const restoreButton = screen.getByRole("button", { name: "恢复 ChatGPT 的执行 Prompt" });

    fireEvent.click(restoreButton);

    expect(screen.getByLabelText("AI 也会犯错，谨记。")).toHaveValue("总结这段需求");
    expect(screen.getByText("已从最近执行恢复 Prompt")).toBeInTheDocument();
  });

  it("可以聚焦一个平台并退出聚焦模式回到网格", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    fireEvent.click(screen.getByRole("button", { name: "聚焦 Claude" }));

    const workspace = screen.getByRole("main", { name: "平台工作区" });
    expect(workspace).toHaveAttribute("data-focus-platform", "claude");
    expect(within(workspace).getByRole("region", { name: "Claude 视图" })).toBeInTheDocument();
    expect(within(workspace).queryByRole("region", { name: "ChatGPT 视图" })).not.toBeInTheDocument();
    expect(within(workspace).queryByRole("button", { name: "聚焦 Claude" })).not.toBeInTheDocument();

    const claudeFrame = within(workspace).getByRole("region", { name: "Claude 视图" });
    const reloadButton = within(claudeFrame).getByRole("button", { name: "重新加载 Claude" });
    const exitFocusButton = within(claudeFrame).getByRole("button", { name: "退出聚焦模式" });
    expect(exitFocusButton.parentElement).toBe(reloadButton.parentElement);
    expect(reloadButton.compareDocumentPosition(exitFocusButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "退出聚焦模式" }));

    expect(workspace).not.toHaveAttribute("data-focus-platform");
    expect(within(workspace).getByRole("region", { name: "ChatGPT 视图" })).toBeInTheDocument();
    expect(within(workspace).getByRole("region", { name: "Claude 视图" })).toBeInTheDocument();
    expect(within(workspace).getByRole("button", { name: "聚焦 Claude" })).toBeInTheDocument();
  });

  it("可以分别隐藏和展开平台侧边栏与 Prompt 历史侧边栏", async () => {
    mockBridge({
      listPromptHistory: vi.fn().mockResolvedValue([
        {
          id: "prompt-1",
          content: "解释 Electron",
          createdAt: "2026-06-25T06:00:00.000Z",
          updatedAt: "2026-06-25T06:00:00.000Z"
        }
      ])
    });

    render(<App />);

    expect(screen.getByRole("navigation", { name: "AI 平台" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Prompt 历史" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "隐藏平台侧边栏" }));
    expect(screen.queryByRole("navigation", { name: "AI 平台" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开平台侧边栏" }).parentElement).toHaveClass("has-titlebar-safe-area");
    expect(screen.getByRole("main", { name: "平台工作区" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "隐藏 Prompt 历史侧边栏" }));
    expect(screen.queryByRole("complementary", { name: "Prompt 历史" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开 Prompt 历史侧边栏" })).toBeInTheDocument();
    expect(screen.getByLabelText("AI 也会犯错，谨记。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开平台侧边栏" }));
    expect(screen.getByRole("navigation", { name: "AI 平台" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "展开 Prompt 历史侧边栏" }));
    expect(screen.getByRole("complementary", { name: "Prompt 历史" })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "解释 Electron" })).toBeInTheDocument();
    });
  });

  it("启用和聚焦平台时通知宿主壳更新平台视图布局", async () => {
    const setPlatformLayout = vi.fn();
    mockBridge({ setPlatformLayout });

    render(<App />);

    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt"],
          focusedPlatformId: null,
          mode: "grid"
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt", "claude"],
          focusedPlatformId: null,
          mode: "grid"
        })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "聚焦 Claude" }));
    await waitFor(() => {
      expect(setPlatformLayout).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabledPlatformIds: ["chatgpt", "claude"],
          focusedPlatformId: "claude",
          mode: "grid"
        })
      );
    });
  });
});

describe("配置持久化", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "multiAIChat");
  });

  it("从主进程加载已保存的启用平台和布局偏好", async () => {
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt", "claude", "gemini"],
        customPlatforms: []
      })
    });

    render(<App />);

    await waitFor(() => {
      const workspace = screen.getByRole("main", { name: "平台工作区" });
      expect(workspace).toHaveAttribute("data-layout-count", "3");
    });

    expect(screen.getByRole("region", { name: "ChatGPT 视图" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Claude 视图" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Gemini 视图" })).toBeInTheDocument();
  });

  it("切换平台时通过 IPC 持久化配置变更", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({ enabledPlatformIds: ["chatgpt"], customPlatforms: [] }),
      updateConfig
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "1");
    });

    fireEvent.click(screen.getByRole("button", { name: "DeepSeek" }));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        enabledPlatformIds: ["chatgpt", "deepseek"]
      });
    });
  });

  it("禁用平台时通过 IPC 持久化配置变更", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({ enabledPlatformIds: ["chatgpt", "claude"], customPlatforms: [] }),
      updateConfig
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("main", { name: "平台工作区" })).toHaveAttribute("data-layout-count", "2");
    });

    fireEvent.click(screen.getByRole("button", { name: "Claude" }));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        enabledPlatformIds: ["chatgpt"]
      });
    });
  });
});

describe("prompt 历史", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "multiAIChat");
  });

  it("复制当前 prompt 时写入系统剪贴板并保存历史", async () => {
    const copyPrompt = vi.fn().mockResolvedValue(undefined);
    const savePrompt = vi.fn().mockResolvedValue([
      {
        id: "prompt-1",
        content: "请解释 Electron WebContentsView",
        createdAt: "2026-06-25T06:00:00.000Z",
        updatedAt: "2026-06-25T06:00:00.000Z"
      }
    ]);
    mockBridge({ copyPrompt, savePrompt });

    render(<App />);

    fireEvent.change(screen.getByLabelText("AI 也会犯错，谨记。"), {
      target: { value: "请解释 Electron WebContentsView" }
    });
    fireEvent.click(screen.getByRole("button", { name: "复制 Prompt" }));

    await waitFor(() => {
      expect(copyPrompt).toHaveBeenCalledWith("请解释 Electron WebContentsView");
      expect(savePrompt).toHaveBeenCalledWith("请解释 Electron WebContentsView");
    });
    expect(screen.getByText("已复制并保存到本地历史")).toBeInTheDocument();
  });

  it("按关键词搜索 prompt 历史并可点击复用", async () => {
    const listPromptHistory = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: "prompt-1",
          content: "解释 Electron",
          createdAt: "2026-06-25T06:00:00.000Z",
          updatedAt: "2026-06-25T06:00:00.000Z"
        },
        {
          id: "prompt-2",
          content: "生成 React 测试",
          createdAt: "2026-06-25T06:01:00.000Z",
          updatedAt: "2026-06-25T06:01:00.000Z"
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "prompt-2",
          content: "生成 React 测试",
          createdAt: "2026-06-25T06:01:00.000Z",
          updatedAt: "2026-06-25T06:01:00.000Z"
        }
      ]);
    mockBridge({ listPromptHistory });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "解释 Electron" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("搜索 Prompt 历史"), {
      target: { value: "react" }
    });

    await waitFor(() => {
      expect(listPromptHistory).toHaveBeenLastCalledWith("react");
      expect(screen.queryByRole("button", { name: "解释 Electron" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "生成 React 测试" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "生成 React 测试" }));
    expect(screen.getByLabelText("AI 也会犯错，谨记。")).toHaveValue("生成 React 测试");
  });

  it("可以清空 prompt 历史", async () => {
    const clearPromptHistory = vi.fn().mockResolvedValue([]);
    mockBridge({
      listPromptHistory: vi.fn().mockResolvedValue([
        {
          id: "prompt-1",
          content: "需要清空",
          createdAt: "2026-06-25T06:00:00.000Z",
          updatedAt: "2026-06-25T06:00:00.000Z"
        }
      ]),
      clearPromptHistory
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "需要清空" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "清空历史" }));

    await waitFor(() => {
      expect(clearPromptHistory).toHaveBeenCalled();
      expect(screen.getByText("暂无本地历史")).toBeInTheDocument();
    });
  });

  it("可以选择 prompt 历史保留策略", async () => {
    const updateConfig = vi.fn();
    mockBridge({ updateConfig });

    render(<App />);

    fireEvent.change(screen.getByLabelText("历史保留策略"), {
      target: { value: "latest-50" }
    });

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        promptRetentionPolicy: { type: "latest-count", count: 50 }
      });
    });
  });
});

describe("自定义平台管理", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "multiAIChat");
  });

  it("从配置加载自定义平台并显示在平台栏中", async () => {
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [sampleCustomPlatform]
      })
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Perplexity" })).toBeInTheDocument();
    });
  });

  it("可以启用自定义平台并显示在工作区网格中", async () => {
    const updateConfig = vi.fn();
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [sampleCustomPlatform]
      }),
      updateConfig
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Perplexity" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Perplexity" }));

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith({
        enabledPlatformIds: ["chatgpt", "custom-perplexity-abc"]
      });
    });
  });

  it("显示添加自定义平台的按钮", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "添加自定义平台" })).toBeInTheDocument();
  });

  it("点击添加按钮调用宿主自定义平台弹窗", async () => {
    const openAddPlatformDialog = vi.fn().mockResolvedValue(null);
    mockBridge({ openAddPlatformDialog });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "添加自定义平台" }));

    await waitFor(() => {
      expect(openAddPlatformDialog).toHaveBeenCalledWith({
        existingUrls: expect.arrayContaining(["https://chatgpt.com"]),
        theme: "light"
      });
    });
  });

  it("暗黑主题下添加自定义平台弹窗跟随当前主题", async () => {
    const openAddPlatformDialog = vi.fn().mockResolvedValue(null);
    mockBridge({
      openAddPlatformDialog,
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [],
        themePreference: "dark"
      } satisfies Partial<AppConfig>)
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "打开设置" }).closest(".app-shell")).toHaveAttribute("data-theme", "dark");
    });

    fireEvent.click(screen.getByRole("button", { name: "添加自定义平台" }));

    await waitFor(() => {
      expect(openAddPlatformDialog).toHaveBeenCalledWith({
        existingUrls: expect.arrayContaining(["https://chatgpt.com"]),
        theme: "dark"
      });
    });
  });

  it("宿主自定义平台弹窗取消时不创建平台", async () => {
    const addCustomPlatform = vi.fn().mockResolvedValue(undefined);
    const openAddPlatformDialog = vi.fn().mockResolvedValue(null);
    mockBridge({ addCustomPlatform, openAddPlatformDialog });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "添加自定义平台" }));

    await waitFor(() => {
      expect(openAddPlatformDialog).toHaveBeenCalled();
    });

    expect(addCustomPlatform).not.toHaveBeenCalled();
  });

  it("宿主自定义平台弹窗返回合法输入后通过 IPC 创建平台", async () => {
    const addCustomPlatform = vi.fn().mockResolvedValue(undefined);
    const openAddPlatformDialog = vi.fn().mockResolvedValue({
      name: "Perplexity",
      url: "https://perplexity.ai"
    });
    mockBridge({ addCustomPlatform, openAddPlatformDialog });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "添加自定义平台" }));

    await waitFor(() => {
      expect(addCustomPlatform).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "custom",
          name: "Perplexity",
          url: "https://perplexity.ai",
          partition: expect.stringMatching(/^persist:custom-/)
        })
      );
    });
  });

  it("可以删除自定义平台", async () => {
    const removeCustomPlatform = vi.fn().mockResolvedValue(undefined);
    mockBridge({
      getConfig: vi.fn().mockResolvedValue({
        enabledPlatformIds: ["chatgpt"],
        customPlatforms: [sampleCustomPlatform]
      }),
      removeCustomPlatform
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Perplexity" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "删除 Perplexity" }));

    await waitFor(() => {
      expect(removeCustomPlatform).toHaveBeenCalledWith("custom-perplexity-abc");
    });
  });

  it("宿主设置弹窗返回后可以调整批量发送确认配置并作用于后续打开", async () => {
    const updateConfig = vi.fn();
    const openSettingsDialog = vi.fn().mockResolvedValueOnce({
      themePreference: "system",
      platformLayoutMode: "grid",
      promptRetentionPolicy: { type: "forever" },
      autoClearPromptEnabled: true,
      confirmBatchSendEnabled: false,
      autoSendEnabledPlatformIds: []
    }).mockResolvedValueOnce(null);
    mockBridge({ updateConfig, openSettingsDialog });

    render(<App />);

    // Open settings for the first time
    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          confirmBatchSendEnabled: true
        })
      );
    });

    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ confirmBatchSendEnabled: false }));
    });

    fireEvent.click(screen.getByRole("button", { name: "打开设置" }));

    await waitFor(() => {
      expect(openSettingsDialog).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          confirmBatchSendEnabled: false
        })
      );
    });
  });
});
