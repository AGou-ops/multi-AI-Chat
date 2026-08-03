import { app, BrowserWindow, clipboard, dialog, ipcMain, session, shell, WebContentsView } from "electron";
import { join } from "node:path";
import { createAutofillRegistry } from "./autofill/registry";
import { GenericAutofillAdapter } from "./autofill/generic-adapter";
import { executeAutofillWithRetry, executeAutosendWithRetry } from "./autofill/retry-executor";
import { ConfigStore } from "./config-store";
import { ExecutionLogStore } from "./execution-log-store";
import { showAddPlatformDialog, showPlatformLimitDialog, showSettingsDialog } from "./modal-dialogs";
import { decideNavigation } from "./navigation-policy";
import { decidePermissionRequest } from "./permission-policy";
import { boundsForLayout, type Bounds } from "./platform-layout";
import { PromptHistoryStore } from "./prompt-history-store";
import { toggleWindowMaximize } from "./window-controls";
import { configureAppIdentity, createMainWindowOptions } from "./window-identity";
import type { AppConfig, ThemePreference } from "../shared/config";
import { defaultConfig } from "../shared/config";
import type { PlatformExecutionResult, PromptExecutionResponse, PromptExecutionRecord } from "../shared/execution-record";
import { IPC_CHANNELS } from "../shared/ipc-channels";
import type { PlatformLoadingState } from "../shared/platform-loading";
import type { PlatformLayoutState } from "../shared/platformLayout";
import { builtInPlatforms } from "../shared/platforms";
import type { PromptHistoryItem } from "../shared/prompt-history";
import type {
  CustomPlatformDialogOptions,
  CustomPlatformInput,
  PlatformConfig,
  SettingsDialogOptions,
  SettingsDialogResult
} from "../shared/types";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

configureAppIdentity(app);

let mainWindow: BrowserWindow | null = null;
let configStore: ConfigStore | null = null;
let promptHistoryStore: PromptHistoryStore | null = null;
let executionLogStore: ExecutionLogStore | null = null;
let autofillRegistry: Map<string, import("./autofill/types").PlatformAutofillAdapter> | null = null;
const platformViews = new Map<string, WebContentsView>();
const platformLoadingStates = new Map<string, boolean>();
let currentLayout: PlatformLayoutState = {
  enabledPlatformIds: ["chatgpt"],
  focusedPlatformId: null,
  mode: "grid"
};

function hideBounds(): Bounds {
  return {
    x: -10000,
    y: -10000,
    width: 1,
    height: 1
  };
}

function resolvePlatform(platformId: string): { id: string; url: string; partition: string; allowedAuthDomains: string[] } | null {
  const builtIn = builtInPlatforms.find((item) => item.id === platformId);

  if (builtIn) {
    return builtIn;
  }

  const custom = configStore?.getConfig().customPlatforms.find((p) => p.id === platformId);

  if (custom) {
    return { id: custom.id, url: custom.url, partition: custom.partition, allowedAuthDomains: custom.allowedAuthDomains };
  }

  return null;
}

function setPlatformLoadingState(platformId: string, isLoading: boolean) {
  const current = platformLoadingStates.get(platformId) ?? false;

  if (current === isLoading) {
    return;
  }

  platformLoadingStates.set(platformId, isLoading);

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.PLATFORM_LOADING_STATE, {
    platformId,
    isLoading
  } satisfies PlatformLoadingState);
}

function ensurePlatformView(window: BrowserWindow, platformId: string) {
  const existingView = platformViews.get(platformId);

  if (existingView) {
    return existingView;
  }

  const platform = resolvePlatform(platformId);

  if (!platform) {
    return null;
  }

  const platformSession = session.fromPartition(platform.partition);

  platformSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const decision = decidePermissionRequest(permission);

    if (decision.action === "deny") {
      callback(false);
      return;
    }

    const parentWindow = BrowserWindow.fromWebContents(webContents) ?? window;

    dialog
      .showMessageBox(parentWindow, {
        type: "question",
        buttons: ["允许", "拒绝"],
        defaultId: 1,
        cancelId: 1,
        title: "权限请求",
        message: `${platform.id} 请求 ${permission} 权限`,
        detail: "第一版不会记住权限决定，每次敏感权限请求都会重新确认。"
      })
      .then((result) => callback(result.response === 0))
      .catch(() => callback(false));
  });

  platformSession.on("will-download", (event, item) => {
    item.pause();

    dialog
      .showSaveDialog(window, {
        title: "保存下载文件",
        defaultPath: item.getFilename()
      })
      .then((result) => {
        if (result.canceled || !result.filePath) {
          item.cancel();
          return;
        }
        item.setSavePath(result.filePath);
        item.resume();
      })
      .catch(() => undefined);
  });

  const platformView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      session: platformSession
    }
  });

  window.contentView.addChildView(platformView);
  platformView.setBounds(hideBounds());
  platformView.webContents.setWindowOpenHandler(({ url }) => {
    const decision = decideNavigation(platform, url);

    if (decision.action === "allow-in-app") {
      void platformView.webContents.loadURL(url);
      return { action: "deny" };
    }

    if (decision.action === "open-external") {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  platformView.webContents.on("will-navigate", (event, url) => {
    const decision = decideNavigation(platform, url);

    if (decision.action === "allow-in-app") {
      return;
    }

    event.preventDefault();

    if (decision.action === "open-external") {
      void shell.openExternal(url);
    }
  });

  platformView.webContents.on("did-start-loading", () => {
    setPlatformLoadingState(platform.id, true);
  });
  platformView.webContents.on("did-stop-loading", () => {
    setPlatformLoadingState(platform.id, false);
  });
  platformView.webContents.on("did-fail-load", () => {
    setPlatformLoadingState(platform.id, false);
  });
  platformView.webContents.on("render-process-gone", () => {
    setPlatformLoadingState(platform.id, false);
  });

  void platformView.webContents.loadURL(platform.url);

  platformViews.set(platform.id, platformView);

  return platformView;
}

function applyPlatformLayout(window: BrowserWindow, layout: PlatformLayoutState) {
  currentLayout = layout;
  const [width, height] = window.getContentSize();
  const visibleBounds = boundsForLayout({ width, height }, layout);

  for (const platformId of layout.enabledPlatformIds) {
    ensurePlatformView(window, platformId);
  }

  for (const [platformId, platformView] of platformViews) {
    platformView.setBounds(visibleBounds.get(platformId) ?? hideBounds());
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow(createMainWindowOptions(join(__dirname, "../preload/index.js")));

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await session.defaultSession.clearCache();
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  applyPlatformLayout(mainWindow, currentLayout);

  mainWindow.on("resize", () => {
    if (mainWindow) {
      applyPlatformLayout(mainWindow, currentLayout);
    }
  });
}

ipcMain.on(IPC_CHANNELS.LAYOUT_UPDATE, (event, layout: PlatformLayoutState) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) {
    return;
  }

  applyPlatformLayout(mainWindow, layout);
});

ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE_TOGGLE, (event): void => {
  if (!mainWindow || event.sender !== mainWindow.webContents || mainWindow.isDestroyed()) {
    return;
  }

  toggleWindowMaximize(mainWindow);
});

ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (): AppConfig => {
  if (!configStore) {
    return { ...defaultConfig };
  }
  return configStore.getConfig();
});

ipcMain.handle(IPC_CHANNELS.CONFIG_UPDATE, (_event, partial: Partial<AppConfig>): AppConfig => {
  if (!configStore) {
    return { ...defaultConfig };
  }
  return configStore.update(partial);
});

ipcMain.handle(
  IPC_CHANNELS.CUSTOM_PLATFORM_DIALOG_OPEN,
  async (_event, options: CustomPlatformDialogOptions): Promise<CustomPlatformInput | null> => {
    if (!mainWindow) {
      return null;
    }

    return await showAddPlatformDialog(mainWindow, options);
  }
);

ipcMain.handle(
  IPC_CHANNELS.SETTINGS_DIALOG_OPEN,
  async (_event, options: SettingsDialogOptions): Promise<SettingsDialogResult | null> => {
    if (!mainWindow) {
      return null;
    }

    return await showSettingsDialog(mainWindow, {
      ...options,
      onThemePreferenceChange: (themePreference: ThemePreference) => {
        configStore?.update({ themePreference });
        mainWindow?.webContents.send(IPC_CHANNELS.THEME_PREFERENCE_CHANGED, themePreference);
      }
    });
  }
);

ipcMain.handle(IPC_CHANNELS.CUSTOM_PLATFORM_ADD, (_event, platform: PlatformConfig): AppConfig => {
  if (!configStore) {
    return { ...defaultConfig };
  }
  const updated = configStore.addCustomPlatform(platform);

  if (mainWindow) {
    ensurePlatformView(mainWindow, platform.id);
    applyPlatformLayout(mainWindow, currentLayout);
  }

  return updated;
});

ipcMain.handle(
  IPC_CHANNELS.CUSTOM_PLATFORM_UPDATE,
  (_event, platformId: string, partial: Partial<PlatformConfig>): AppConfig => {
    if (!configStore) {
      return { ...defaultConfig };
    }
    const updated = configStore.updateCustomPlatform(platformId, partial);

    if (mainWindow) {
      applyPlatformLayout(mainWindow, currentLayout);
    }

    return updated;
  }
);

ipcMain.handle(IPC_CHANNELS.CUSTOM_PLATFORM_REMOVE, (_event, platformId: string): AppConfig => {
  if (!configStore) {
    return { ...defaultConfig };
  }

  const platformView = platformViews.get(platformId);

  if (platformView && mainWindow) {
    mainWindow.contentView.removeChildView(platformView);
    platformViews.delete(platformId);
    platformLoadingStates.delete(platformId);
  }

  const updated = configStore.removeCustomPlatform(platformId);

  if (mainWindow) {
    applyPlatformLayout(mainWindow, currentLayout);
  }

  return updated;
});

ipcMain.handle(IPC_CHANNELS.PROMPT_COPY, (_event, content: string): void => {
  clipboard.writeText(content);
});

ipcMain.handle(IPC_CHANNELS.EXECUTION_RECORD_LIST, (): PromptExecutionRecord[] => {
  return executionLogStore?.list() ?? [];
});

ipcMain.handle(
  IPC_CHANNELS.PROMPT_EXECUTE,
  async (_event, content: string, targetPlatformIds: string[], autoSendPlatformIds: string[]): Promise<PromptExecutionResponse> => {
    const trimmedContent = content.trim();
    const createdAt = new Date();
    const policy = configStore?.getConfig().promptRetentionPolicy ?? defaultConfig.promptRetentionPolicy;
    const promptHistory = promptHistoryStore?.savePrompt(trimmedContent, policy, createdAt) ?? [];
    const promptId =
      policy.type === "disabled" || !trimmedContent ? null : (promptHistory.find((item) => item.content === trimmedContent)?.id ?? null);
    const registry = autofillRegistry;
    const retryConfig = { maxRetries: 2, retryDelayMs: 1500 };
    const autoSendSet = new Set(autoSendPlatformIds ?? []);

    const results: PlatformExecutionResult[] = await Promise.all(
      targetPlatformIds.map(async (platformId) => {
        const adapter = registry?.get(platformId) ?? new GenericAutofillAdapter(platformId);

        const view = platformViews.get(platformId);

        if (!view) {
          return {
            platformId,
            action: "fill" as const,
            status: "failed" as const,
            reason: "平台视图未就绪，请重新启用该平台",
            retryCount: 0,
            timestamp: createdAt.toISOString()
          };
        }

        const autofillResult = await executeAutofillWithRetry(adapter, view.webContents, trimmedContent, retryConfig);

        if (!autofillResult.success) {
          clipboard.writeText(trimmedContent);

          return {
            platformId,
            action: "fill" as const,
            status: "failed" as const,
            reason: `${autofillResult.reason}（已复制到剪贴板）`,
            retryCount: autofillResult.retryCount,
            timestamp: createdAt.toISOString()
          };
        }

        if (!autoSendSet.has(platformId)) {
          return {
            platformId,
            action: "fill" as const,
            status: "success" as const,
            reason: autofillResult.reason,
            retryCount: autofillResult.retryCount,
            timestamp: createdAt.toISOString()
          };
        }

        const autosendResult = await executeAutosendWithRetry(adapter, view.webContents, retryConfig);

        if (autosendResult.success) {
          return {
            platformId,
            action: "send" as const,
            status: "success" as const,
            reason: `已填入并自动发送（${autosendResult.reason}）`,
            retryCount: autofillResult.retryCount + autosendResult.retryCount,
            timestamp: createdAt.toISOString()
          };
        }

        return {
          platformId,
          action: "send" as const,
          status: "failed" as const,
          reason: `已填入但自动发送失败：${autosendResult.reason}，请手动发送`,
          retryCount: autofillResult.retryCount + autosendResult.retryCount,
          timestamp: createdAt.toISOString()
        };
      })
    );

    const record: PromptExecutionRecord = {
      id: `execution-${createdAt.getTime()}`,
      promptId,
      promptSnapshot: trimmedContent,
      targetPlatformIds,
      attemptedAction: "fill",
      results,
      createdAt: createdAt.toISOString()
    };

    executionLogStore?.saveRecord(record);

    return {
      record,
      promptHistory
    };
  }
);

ipcMain.handle(IPC_CHANNELS.PROMPT_HISTORY_SAVE, (_event, content: string): PromptHistoryItem[] => {
  const policy = configStore?.getConfig().promptRetentionPolicy ?? defaultConfig.promptRetentionPolicy;
  return promptHistoryStore?.savePrompt(content, policy) ?? [];
});

ipcMain.handle(IPC_CHANNELS.PROMPT_HISTORY_LIST, (_event, query?: string): PromptHistoryItem[] => {
  if (!promptHistoryStore) {
    return [];
  }
  return query ? promptHistoryStore.search(query) : promptHistoryStore.list();
});

ipcMain.handle(IPC_CHANNELS.PROMPT_HISTORY_CLEAR, (): PromptHistoryItem[] => {
  return promptHistoryStore?.clear() ?? [];
});

ipcMain.handle(IPC_CHANNELS.PLATFORM_LIMIT_DIALOG_SHOW, async (): Promise<void> => {
  if (!mainWindow) {
    return;
  }

  await showPlatformLimitDialog(mainWindow);
});

ipcMain.handle(
  "confirm-batch-send:show",
  async (_event, targetPlatformIds: string[], autoSendPlatformIds: string[], promptPreview: string): Promise<boolean> => {
    if (!mainWindow) {
      return false;
    }

    const config = configStore?.getConfig() ?? defaultConfig;
    const allPlatforms = [
      ...builtInPlatforms.map((p) => ({ id: p.id, name: p.name })),
      ...config.customPlatforms.map((p) => ({ id: p.id, name: p.name }))
    ];

    const targetNames = targetPlatformIds
      .map((id) => allPlatforms.find((p) => p.id === id)?.name ?? id)
      .join("、");

    const autoSendNames = autoSendPlatformIds
      .map((id) => allPlatforms.find((p) => p.id === id)?.name ?? id)
      .join("、");

    const promptLine = promptPreview.length > 80
      ? `${promptPreview.slice(0, 80)}...`
      : promptPreview;

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["确认发送", "取消"],
      defaultId: 1,
      cancelId: 1,
      title: "确认自动发送",
      message: `将在以下平台填入并自动发送 prompt：${autoSendNames}`,
      detail: [
        `目标平台：${targetNames}`,
        `自动发送平台：${autoSendNames}`,
        `Prompt：${promptLine}`
      ].join("\n")
    });

    return response === 0;
  }
);

ipcMain.handle(IPC_CHANNELS.PLATFORM_RELOAD, async (_event, platformId: string): Promise<void> => {
  const view = platformViews.get(platformId);

  if (!view) {
    return;
  }

  const platform = resolvePlatform(platformId);

  if (!platform) {
    return;
  }

  try {
    await view.webContents.loadURL(platform.url);
  } catch {
    // 重新尝试加载
    try {
      await view.webContents.loadURL(platform.url);
    } catch {
      // 忽略二次失败
    }
  }
});

app.whenReady().then(async () => {
  configStore = new ConfigStore(app.getPath("userData"));
  promptHistoryStore = new PromptHistoryStore(app.getPath("userData"));
  executionLogStore = new ExecutionLogStore(app.getPath("userData"));
  autofillRegistry = createAutofillRegistry();
  const savedConfig = configStore.load();
  promptHistoryStore.load();
  executionLogStore.load();
  currentLayout = {
    enabledPlatformIds: savedConfig.enabledPlatformIds,
    focusedPlatformId: null,
    mode: savedConfig.platformLayoutMode
  };

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", () => {
  executionLogStore?.clear();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
