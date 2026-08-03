export type PlatformKind = "builtin" | "custom";

export interface PlatformConfig {
  id: string;
  kind: PlatformKind;
  name: string;
  url: string;
  partition: string;
  iconUrl?: string;
  userAgent?: string;
  layoutSize?: "small" | "medium" | "large";
  allowedAuthDomains: string[];
  autoFillEnabled: boolean;
  autoSendEnabled: boolean;
}

export interface CustomPlatformInput {
  name: string;
  url: string;
  iconUrl?: string;
  userAgent?: string;
  layoutSize?: "small" | "medium" | "large";
  allowedAuthDomains?: string[];
}

export interface CustomPlatformDialogOptions {
  existingUrls: string[];
  theme?: "light" | "dark";
}

export interface SettingsDialogOptions {
  themePreference: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  platformLayoutMode: "grid" | "columns";
  promptRetentionPolicy:
    | { type: "forever" }
    | { type: "latest-count"; count: 50 | 200 }
    | { type: "latest-days"; days: 30 }
    | { type: "disabled" };
  autoClearPromptEnabled: boolean;
  autoSendEnabledPlatformIds: string[];
  autoSendPlatforms: Array<{ id: string; name: string }>;
}

export interface SettingsDialogResult {
  themePreference: SettingsDialogOptions["themePreference"];
  platformLayoutMode: SettingsDialogOptions["platformLayoutMode"];
  promptRetentionPolicy: SettingsDialogOptions["promptRetentionPolicy"];
  autoClearPromptEnabled: boolean;
  autoSendEnabledPlatformIds: string[];
}

export interface PlatformValidationErrors {
  name?: string;
  url?: string;
  id?: string;
}
