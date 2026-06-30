import type { PlatformLayoutMode } from "./platformLayout";
import type { PlatformConfig } from "./types";
import { defaultPromptRetentionPolicy, type PromptRetentionPolicy } from "./prompt-history";

export type ThemePreference = "light" | "dark" | "system";

export interface AppConfig {
  enabledPlatformIds: string[];
  customPlatforms: PlatformConfig[];
  promptRetentionPolicy: PromptRetentionPolicy;
  autoSendEnabledPlatformIds: string[];
  platformLayoutMode: PlatformLayoutMode;
  themePreference: ThemePreference;
}

export const defaultConfig: AppConfig = {
  enabledPlatformIds: ["chatgpt"],
  customPlatforms: [],
  promptRetentionPolicy: defaultPromptRetentionPolicy,
  autoSendEnabledPlatformIds: [],
  platformLayoutMode: "grid",
  themePreference: "system"
};
