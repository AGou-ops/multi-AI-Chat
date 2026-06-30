import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PromptHistoryStore } from "./prompt-history-store";
import type { PromptRetentionPolicy } from "../shared/prompt-history";

describe("PromptHistoryStore", () => {
  let storeDir: string;

  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), "multi-aichat-prompts-"));
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  it("默认永久保存 prompt 历史并能重新加载", () => {
    const store = new PromptHistoryStore(storeDir);
    store.load();
    store.savePrompt("解释 WebContentsView", { type: "forever" });

    const reloaded = new PromptHistoryStore(storeDir);
    const history = reloaded.load();

    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("解释 WebContentsView");
  });

  it("按关键词搜索 prompt 历史", () => {
    const store = new PromptHistoryStore(storeDir);
    store.load();
    store.savePrompt("解释 Electron", { type: "forever" });
    store.savePrompt("生成 React 测试", { type: "forever" });

    expect(store.search("react").map((item) => item.content)).toEqual(["生成 React 测试"]);
  });

  it("可以清空历史", () => {
    const store = new PromptHistoryStore(storeDir);
    store.load();
    store.savePrompt("保留这条", { type: "forever" });

    expect(store.clear()).toEqual([]);

    const reloaded = new PromptHistoryStore(storeDir);
    expect(reloaded.load()).toEqual([]);
  });

  it("支持最近 50 条和最近 200 条保留策略", () => {
    const store = new PromptHistoryStore(storeDir);
    store.load();

    for (let i = 0; i < 55; i += 1) {
      store.savePrompt(`prompt ${i}`, { type: "latest-count", count: 50 });
    }

    expect(store.list()).toHaveLength(50);
    expect(store.list()[0].content).toBe("prompt 54");
    expect(store.list()[49].content).toBe("prompt 5");
  });

  it("支持最近 30 天保留策略", () => {
    const store = new PromptHistoryStore(storeDir, () => new Date("2026-06-25T00:00:00.000Z"));
    store.load();
    store.savePrompt("旧 prompt", { type: "forever" }, new Date("2026-05-01T00:00:00.000Z"));
    store.savePrompt("新 prompt", { type: "latest-days", days: 30 }, new Date("2026-06-20T00:00:00.000Z"));

    expect(store.list().map((item) => item.content)).toEqual(["新 prompt"]);
  });

  it("禁用策略不保存 prompt", () => {
    const store = new PromptHistoryStore(storeDir);
    store.load();

    expect(store.savePrompt("不要保存", { type: "disabled" })).toEqual([]);
    expect(store.list()).toEqual([]);
  });
});
