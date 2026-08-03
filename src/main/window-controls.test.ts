import { describe, expect, it, vi } from "vitest";
import { toggleWindowMaximize } from "./window-controls";

describe("主窗口最大化控制", () => {
  it("窗口未最大化时切换到最大化", () => {
    const window = {
      isMaximized: vi.fn().mockReturnValue(false),
      maximize: vi.fn(),
      unmaximize: vi.fn()
    };

    toggleWindowMaximize(window);

    expect(window.maximize).toHaveBeenCalledOnce();
    expect(window.unmaximize).not.toHaveBeenCalled();
  });

  it("窗口已最大化时恢复到上次窗口大小", () => {
    const window = {
      isMaximized: vi.fn().mockReturnValue(true),
      maximize: vi.fn(),
      unmaximize: vi.fn()
    };

    toggleWindowMaximize(window);

    expect(window.unmaximize).toHaveBeenCalledOnce();
    expect(window.maximize).not.toHaveBeenCalled();
  });
});
