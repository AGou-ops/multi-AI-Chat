import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type AppConfig, defaultConfig } from "../shared/config";
import type { PlatformConfig } from "../shared/types";

const CONFIG_FILENAME = "config.json";

export class ConfigStore {
  private readonly configDir: string;
  private config: AppConfig;

  constructor(configDir: string) {
    this.configDir = configDir;
    this.config = { ...defaultConfig, customPlatforms: [] };
  }

  load(): AppConfig {
    const filePath = join(this.configDir, CONFIG_FILENAME);

    if (!existsSync(filePath)) {
      this.config = { ...defaultConfig, customPlatforms: [] };
      return { ...this.config };
    }

    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<AppConfig>;
      this.config = {
        enabledPlatformIds: parsed.enabledPlatformIds ?? defaultConfig.enabledPlatformIds,
        customPlatforms: parsed.customPlatforms ?? [],
        promptRetentionPolicy: parsed.promptRetentionPolicy ?? defaultConfig.promptRetentionPolicy,
        autoSendEnabledPlatformIds: parsed.autoSendEnabledPlatformIds ?? defaultConfig.autoSendEnabledPlatformIds,
        platformLayoutMode: parsed.platformLayoutMode ?? defaultConfig.platformLayoutMode,
        themePreference: parsed.themePreference ?? defaultConfig.themePreference
      };
    } catch {
      this.config = { ...defaultConfig, customPlatforms: [] };
    }

    return { ...this.config };
  }

  update(partial: Partial<AppConfig>): AppConfig {
    this.config = { ...this.config, ...partial };
    this.save();
    return { ...this.config };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  addCustomPlatform(platform: PlatformConfig): AppConfig {
    this.config = {
      ...this.config,
      customPlatforms: [...this.config.customPlatforms, platform]
    };
    this.save();
    return { ...this.config };
  }

  updateCustomPlatform(platformId: string, partial: Partial<PlatformConfig>): AppConfig {
    this.config = {
      ...this.config,
      customPlatforms: this.config.customPlatforms.map((p) =>
        p.id === platformId ? { ...p, ...partial, id: p.id, kind: p.kind } : p
      )
    };
    this.save();
    return { ...this.config };
  }

  removeCustomPlatform(platformId: string): AppConfig {
    this.config = {
      ...this.config,
      customPlatforms: this.config.customPlatforms.filter((p) => p.id !== platformId),
      enabledPlatformIds: this.config.enabledPlatformIds.filter((id) => id !== platformId)
    };
    this.save();
    return { ...this.config };
  }

  private save(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }

    const filePath = join(this.configDir, CONFIG_FILENAME);
    writeFileSync(filePath, JSON.stringify(this.config, null, 2), "utf-8");
  }
}
