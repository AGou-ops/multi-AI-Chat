import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("开发模式缓存策略", () => {
  it("每次 npm run dev 前清理 Vite 预构建缓存", () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["dev:clean"]).toBe("rm -rf node_modules/.vite");
    expect(packageJson.scripts.dev).toBe("npm run dev:clean && electron-vite dev");
  });

  it("开发模式加载 renderer 前清理 Electron HTTP 缓存", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main/index.ts"), "utf8");
    const clearCacheIndex = mainSource.indexOf("await session.defaultSession.clearCache();");
    const loadDevUrlIndex = mainSource.indexOf("await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);");

    expect(clearCacheIndex).toBeGreaterThan(-1);
    expect(loadDevUrlIndex).toBeGreaterThan(-1);
    expect(clearCacheIndex).toBeLessThan(loadDevUrlIndex);
  });
});
