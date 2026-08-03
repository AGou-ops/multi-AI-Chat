import { describe, expect, it, vi } from "vitest";
import { APPLICATION_NAME, configureAppIdentity, createMainWindowOptions } from "./window-identity";

describe("主窗口身份配置", () => {
  it("保留窗口标题并让原生标题栏透出应用主题背景", () => {
    const options = createMainWindowOptions("/tmp/preload.js");

    expect(options).toEqual(
      expect.objectContaining({
        title: APPLICATION_NAME,
        titleBarStyle: "hiddenInset",
        backgroundColor: "#f8fafc"
      })
    );
  });

  it("把 macOS Dock 悬停名称设置为应用显示名称", () => {
    const app = {
      setName: vi.fn()
    };

    configureAppIdentity(app);

    expect(app.setName).toHaveBeenCalledWith("Multi AI Chat");
  });
});
