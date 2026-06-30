import type { AppConfig, ThemePreference } from "../shared/config";
import type { PromptExecutionRecord, PromptExecutionResponse } from "../shared/execution-record";
import type { PlatformLoadingState } from "../shared/platform-loading";
import type { PlatformLayoutState } from "../shared/platformLayout";
import type { PromptHistoryItem } from "../shared/prompt-history";
import type {
  CustomPlatformDialogOptions,
  CustomPlatformInput,
  PlatformConfig,
  SettingsDialogOptions,
  SettingsDialogResult
} from "../shared/types";

declare global {
  interface Window {
    multiAIChat?: {
      setPlatformLayout(layout: PlatformLayoutState): void;
      getConfig(): Promise<AppConfig>;
      updateConfig(config: Partial<AppConfig>): Promise<void>;
      openAddPlatformDialog(options: CustomPlatformDialogOptions): Promise<CustomPlatformInput | null>;
      openSettingsDialog(options: SettingsDialogOptions): Promise<SettingsDialogResult | null>;
      onThemePreferenceChanged(handler: (themePreference: ThemePreference) => void): () => void;
      addCustomPlatform(platform: PlatformConfig): Promise<void>;
      showPlatformLimitDialog(): Promise<void>;
      updateCustomPlatform(id: string, partial: Partial<PlatformConfig>): Promise<void>;
      removeCustomPlatform(id: string): Promise<void>;
      copyPrompt(content: string): Promise<void>;
      executePrompt(content: string, targetPlatformIds: string[], autoSendPlatformIds: string[]): Promise<PromptExecutionResponse>;
      confirmBatchSend(targetPlatformIds: string[], autoSendPlatformIds: string[], promptPreview: string): Promise<boolean>;
      reloadPlatform(platformId: string): Promise<void>;
      onPlatformLoadingState(handler: (state: PlatformLoadingState) => void): () => void;
      listExecutionRecords(): Promise<PromptExecutionRecord[]>;
      savePrompt(content: string): Promise<PromptHistoryItem[]>;
      listPromptHistory(query?: string): Promise<PromptHistoryItem[]>;
      clearPromptHistory(): Promise<PromptHistoryItem[]>;
      version?: string;
    };
  }
}

export {};
