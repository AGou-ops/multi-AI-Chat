import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore } from "./config-store";
import { builtInPlatforms } from "../shared/platforms";
import type { PlatformConfig } from "../shared/types";

describe("ConfigStore", () => {
  let configDir: string;

  beforeEach(() => {
    configDir = mkdtempSync(join(tmpdir(), "multi-aichat-test-"));
  });

  afterEach(() => {
    rmSync(configDir, { recursive: true, force: true });
  });

  it("没有配置文件时返回默认启用平台", () => {
    const store = new ConfigStore(configDir);
    const config = store.load();

    expect(config.enabledPlatformIds).toEqual(["chatgpt"]);
    expect(config.platformLayoutMode).toBe("grid");
    expect(config.themePreference).toBe("system");
  });

  it("持久化配置到磁盘并能重新加载", () => {
    const store = new ConfigStore(configDir);
    store.load();
    store.update({
      enabledPlatformIds: ["chatgpt", "claude", "gemini"],
      platformLayoutMode: "columns",
      themePreference: "dark"
    });

    const store2 = new ConfigStore(configDir);
    const config = store2.load();

    expect(config.enabledPlatformIds).toEqual(["chatgpt", "claude", "gemini"]);
    expect(config.platformLayoutMode).toBe("columns");
    expect(config.themePreference).toBe("dark");
  });

  it("部分更新与现有配置合并", () => {
    const store = new ConfigStore(configDir);
    store.load();
    store.update({ enabledPlatformIds: ["chatgpt", "deepseek"] });

    const updated = store.update({ enabledPlatformIds: ["claude"] });

    expect(updated.enabledPlatformIds).toEqual(["claude"]);
  });

  it("在 userData 目录中写入 config.json", () => {
    const store = new ConfigStore(configDir);
    store.load();
    store.update({ enabledPlatformIds: ["chatgpt", "claude"] });

    const raw = JSON.parse(readFileSync(join(configDir, "config.json"), "utf-8"));

    expect(raw.enabledPlatformIds).toEqual(["chatgpt", "claude"]);
  });

  it("配置文件不存在时 load 不抛出异常", () => {
    const store = new ConfigStore(configDir);

    expect(() => store.load()).not.toThrow();
  });

  it("从损坏的 JSON 文件恢复为默认值", () => {
    writeFileSync(join(configDir, "config.json"), "not-valid-json{{{");

    const store = new ConfigStore(configDir);
    const config = store.load();

    expect(config.enabledPlatformIds).toEqual(["chatgpt"]);
  });

  it("默认为空自定义平台列表", () => {
    const store = new ConfigStore(configDir);
    const config = store.load();

    expect(config.customPlatforms).toEqual([]);
  });

  it("添加自定义平台并持久化", () => {
    const store = new ConfigStore(configDir);
    store.load();

    const platform = makeCustomPlatform("perplexity", "Perplexity", "https://perplexity.ai");
    const config = store.addCustomPlatform(platform);

    expect(config.customPlatforms).toHaveLength(1);
    expect(config.customPlatforms[0].id).toBe("perplexity");
    expect(config.customPlatforms[0].name).toBe("Perplexity");
    expect(config.customPlatforms[0].partition).toBe("persist:custom-perplexity");

    const store2 = new ConfigStore(configDir);
    const loaded = store2.load();
    expect(loaded.customPlatforms).toHaveLength(1);
    expect(loaded.customPlatforms[0].id).toBe("perplexity");
  });

  it("更新自定义平台配置", () => {
    const store = new ConfigStore(configDir);
    store.load();

    const platform = makeCustomPlatform("test-1", "Test AI", "https://test.example.com");
    store.addCustomPlatform(platform);

    const updated = store.updateCustomPlatform("test-1", {
      name: "Updated AI",
      url: "https://updated.example.com",
      allowedAuthDomains: ["login.example.com"]
    });

    expect(updated.customPlatforms[0].name).toBe("Updated AI");
    expect(updated.customPlatforms[0].url).toBe("https://updated.example.com");
    expect(updated.customPlatforms[0].allowedAuthDomains).toEqual(["login.example.com"]);
  });

  it("删除自定义平台", () => {
    const store = new ConfigStore(configDir);
    store.load();

    store.addCustomPlatform(makeCustomPlatform("del-1", "Delete Me", "https://del.example.com"));
    store.addCustomPlatform(makeCustomPlatform("del-2", "Keep Me", "https://keep.example.com"));

    const config = store.removeCustomPlatform("del-1");

    expect(config.customPlatforms).toHaveLength(1);
    expect(config.customPlatforms[0].id).toBe("del-2");
  });

  it("自定义平台 partition 使用 persist:custom-{id} 格式", () => {
    const store = new ConfigStore(configDir);
    store.load();

    const platform = makeCustomPlatform("my-ai", "My AI", "https://my-ai.example.com");
    const config = store.addCustomPlatform(platform);

    expect(config.customPlatforms[0].partition).toBe("persist:custom-my-ai");
  });
});

function makeCustomPlatform(id: string, name: string, url: string): PlatformConfig {
  return {
    id,
    kind: "custom",
    name,
    url,
    partition: `persist:custom-${id}`,
    allowedAuthDomains: [],
    autoFillEnabled: false,
    autoSendEnabled: false
  };
}

describe("平台 session partition", () => {
  it("每个内置平台 partition 以 persist: 开头", () => {
    for (const platform of builtInPlatforms) {
      expect(platform.partition).toMatch(/^persist:/);
    }
  });

  it("每个内置平台 partition 全局唯一", () => {
    const partitions = builtInPlatforms.map((p) => p.partition);
    expect(new Set(partitions).size).toBe(partitions.length);
  });

  it("partition 遵循 persist:provider-{id} 命名规则", () => {
    for (const platform of builtInPlatforms) {
      expect(platform.partition).toBe(`persist:provider-${platform.id}`);
    }
  });
});
