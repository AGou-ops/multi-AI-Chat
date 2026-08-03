import { describe, expect, it, vi } from "vitest";
import { APPLICATION_NAME, configureAppIdentity, createMainWindowOptions } from "./window-identity";

describe("主窗口身份配置", () => {
  it("保留原生标题栏和窗口标题，支持原生窗口操作", () => {
    const options = createMainWindowOptions("/tmp/preload.js");

    expect(options).toEqual(
      expect.objectContaining({
        minWidth: 1100,
        minHeight: 720,
        title: APPLICATION_NAME,
        titleBarStyle: "default",
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
