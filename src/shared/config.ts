import type { PlatformLayoutMode } from "./platformLayout";
import type { PlatformConfig } from "./types";
import { defaultPromptRetentionPolicy, type PromptRetentionPolicy } from "./prompt-history";

export type ThemePreference = "light" | "dark" | "system";

export interface AppConfig {
  enabledPlatformIds: string[];
  customPlatforms: PlatformConfig[];
  promptRetentionPolicy: PromptRetentionPolicy;
  autoSendEnabledPlatformIds: string[];
  autoClearPromptEnabled: boolean;
  platformLayoutMode: PlatformLayoutMode;
  themePreference: ThemePreference;
}

export const defaultConfig: AppConfig = {
  enabledPlatformIds: ["chatgpt"],
  customPlatforms: [],
  promptRetentionPolicy: defaultPromptRetentionPolicy,
  autoSendEnabledPlatformIds: [],
  autoClearPromptEnabled: true,
  platformLayoutMode: "grid",
  themePreference: "system"
};
