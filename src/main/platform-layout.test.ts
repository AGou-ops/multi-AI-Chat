import { boundsForLayout } from "./platform-layout";

describe("boundsForLayout", () => {
  const windowSize = { width: 1280, height: 800 };

  it("优先使用 renderer 上报的平台内容区边界，避免遮挡底部 prompt 区", () => {
    const bounds = boundsForLayout(windowSize, {
      enabledPlatformIds: ["chatgpt", "claude", "gemini", "deepseek"],
      focusedPlatformId: null,
      mode: "grid",
      visiblePlatformBounds: {
        chatgpt: { x: 252, y: 110, width: 702, height: 463 },
        claude: { x: 964, y: 110, width: 702, height: 463 },
        gemini: { x: 252, y: 631, width: 702, height: 463 },
        deepseek: { x: 964, y: 631, width: 702, height: 463 }
      }
    });

    expect(bounds.get("chatgpt")).toEqual({ x: 252, y: 110, width: 702, height: 463 });
    expect(bounds.get("deepseek")).toEqual({ x: 964, y: 631, width: 702, height: 463 });
  });

  it("设置等 renderer 弹窗打开时不返回任何平台视图边界，避免 WebContentsView 盖住弹窗", () => {
    const bounds = boundsForLayout(windowSize, {
      enabledPlatformIds: ["chatgpt", "claude"],
      focusedPlatformId: null,
      mode: "grid",
      hidePlatformViews: true
    });

    expect(bounds.size).toBe(0);
  });

  it("网格布局下四个平台按两行两列排布", () => {
    const bounds = boundsForLayout(windowSize, {
      enabledPlatformIds: ["chatgpt", "claude", "gemini", "deepseek"],
      focusedPlatformId: null,
      mode: "grid"
    });

    expect(bounds.get("chatgpt")?.x).toBe(bounds.get("gemini")?.x);
    expect(bounds.get("chatgpt")?.y).toBe(bounds.get("claude")?.y);
    expect(bounds.get("claude")?.x).toBeGreaterThan(bounds.get("chatgpt")?.x ?? 0);
    expect(bounds.get("gemini")?.y).toBeGreaterThan(bounds.get("chatgpt")?.y ?? 0);
  });

  it("垂直布局下三个平台按三列并排", () => {
    const bounds = boundsForLayout(windowSize, {
      enabledPlatformIds: ["chatgpt", "claude", "gemini"],
      focusedPlatformId: null,
      mode: "columns"
    });

    expect(bounds.get("chatgpt")?.y).toBe(bounds.get("claude")?.y);
    expect(bounds.get("claude")?.y).toBe(bounds.get("gemini")?.y);
    expect(bounds.get("claude")?.x).toBeGreaterThan(bounds.get("chatgpt")?.x ?? 0);
    expect(bounds.get("gemini")?.x).toBeGreaterThan(bounds.get("claude")?.x ?? 0);
  });
});
