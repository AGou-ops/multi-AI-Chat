import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { IPC_CHANNELS } from "../shared/ipc-channels";
import type { PromptExecutionRecord, PromptExecutionResponse } from "../shared/execution-record";
import type { PlatformLayoutState } from "../shared/platformLayout";
import type { AppConfig, ThemePreference } from "../shared/config";
import type { PlatformLoadingState } from "../shared/platform-loading";
import type { PromptHistoryItem } from "../shared/prompt-history";
import type {
  CustomPlatformDialogOptions,
  CustomPlatformInput,
  PlatformConfig,
  SettingsDialogOptions,
  SettingsDialogResult
} from "../shared/types";

contextBridge.exposeInMainWorld("multiAIChat", {
  version: "0.1.0",
  setPlatformLayout(layout: PlatformLayoutState) {
    ipcRenderer.send(IPC_CHANNELS.LAYOUT_UPDATE, layout);
  },
  toggleWindowMaximize(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE_TOGGLE);
  },
  getConfig(): Promise<AppConfig> {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET);
  },
  updateConfig(config: Partial<AppConfig>): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_UPDATE, config);
  },
  openAddPlatformDialog(options: CustomPlatformDialogOptions): Promise<CustomPlatformInput | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_PLATFORM_DIALOG_OPEN, options);
  },
  openSettingsDialog(options: SettingsDialogOptions): Promise<SettingsDialogResult | null> {
    return ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_DIALOG_OPEN, options);
  },
  onThemePreferenceChanged(handler: (themePreference: ThemePreference) => void): () => void {
    const listener = (_event: IpcRendererEvent, themePreference: ThemePreference) => {
      handler(themePreference);
    };

    ipcRenderer.on(IPC_CHANNELS.THEME_PREFERENCE_CHANGED, listener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.THEME_PREFERENCE_CHANGED, listener);
    };
  },
  addCustomPlatform(platform: PlatformConfig): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_PLATFORM_ADD, platform);
  },
  showPlatformLimitDialog(): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_LIMIT_DIALOG_SHOW);
  },
  updateCustomPlatform(id: string, partial: Partial<PlatformConfig>): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_PLATFORM_UPDATE, id, partial);
  },
  removeCustomPlatform(id: string): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.CUSTOM_PLATFORM_REMOVE, id);
  },
  copyPrompt(content: string): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.PROMPT_COPY, content);
  },
  executePrompt(content: string, targetPlatformIds: string[], autoSendPlatformIds: string[]): Promise<PromptExecutionResponse> {
    return ipcRenderer.invoke(IPC_CHANNELS.PROMPT_EXECUTE, content, targetPlatformIds, autoSendPlatformIds);
  },
  confirmBatchSend(targetPlatformIds: string[], autoSendPlatformIds: string[], promptPreview: string): Promise<boolean> {
    return ipcRenderer.invoke("confirm-batch-send:show", targetPlatformIds, autoSendPlatformIds, promptPreview);
  },
  reloadPlatform(platformId: string): Promise<void> {
    return ipcRenderer.invoke(IPC_CHANNELS.PLATFORM_RELOAD, platformId);
  },
  onPlatformLoadingState(handler: (state: PlatformLoadingState) => void): () => void {
    const listener = (_event: IpcRendererEvent, state: PlatformLoadingState) => {
      handler(state);
    };

    ipcRenderer.on(IPC_CHANNELS.PLATFORM_LOADING_STATE, listener);

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PLATFORM_LOADING_STATE, listener);
    };
  },
  listExecutionRecords(): Promise<PromptExecutionRecord[]> {
    return ipcRenderer.invoke(IPC_CHANNELS.EXECUTION_RECORD_LIST);
  },
  savePrompt(content: string): Promise<PromptHistoryItem[]> {
    return ipcRenderer.invoke(IPC_CHANNELS.PROMPT_HISTORY_SAVE, content);
  },
  listPromptHistory(query?: string): Promise<PromptHistoryItem[]> {
    return ipcRenderer.invoke(IPC_CHANNELS.PROMPT_HISTORY_LIST, query);
  },
  clearPromptHistory(): Promise<PromptHistoryItem[]> {
    return ipcRenderer.invoke(IPC_CHANNELS.PROMPT_HISTORY_CLEAR);
  }
});
