import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PromptHistoryStore } from "./prompt-history-store";
import type { PromptHistoryItem, PromptRetentionPolicy } from "../shared/prompt-history";

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

  it("连续发送相同 prompt 时合并记录并更新发送时间", () => {
    const time1 = new Date("2026-08-05T10:00:00.000Z");
    const time2 = new Date("2026-08-05T10:05:00.000Z");

    const store = new PromptHistoryStore(storeDir);
    store.load();

    store.savePrompt("iOS的隐根和无根越狱有什么区别？", { type: "forever" }, time1);
    store.savePrompt("iOS的隐根和无根越狱有什么区别？", { type: "forever" }, time2);

    const history = store.list();
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe("iOS的隐根和无根越狱有什么区别？");
    expect(history[0].createdAt).toBe(time2.toISOString());
  });

  it("隔开发送相同 prompt 时不合并", () => {
    const time1 = new Date("2026-08-05T10:00:00.000Z");
    const time2 = new Date("2026-08-05T10:01:00.000Z");
    const time3 = new Date("2026-08-05T10:02:00.000Z");

    const store = new PromptHistoryStore(storeDir);
    store.load();

    store.savePrompt("iOS的隐根和无根越狱有什么区别？", { type: "forever" }, time1);
    store.savePrompt("英文缩写 tho 什么意思", { type: "forever" }, time2);
    store.savePrompt("iOS的隐根和无根越狱有什么区别？", { type: "forever" }, time3);

    const history = store.list();
    expect(history).toHaveLength(3);
    expect(history.map((item) => item.content)).toEqual([
      "iOS的隐根和无根越狱有什么区别？",
      "英文缩写 tho 什么意思",
      "iOS的隐根和无根越狱有什么区别？"
    ]);
  });

  it("加载已存磁盘文件时合并其中的连续重复记录", () => {
    const rawHistory: PromptHistoryItem[] = [
      { id: "1", content: "重复 prompt", createdAt: "2026-08-05T10:05:00.000Z", updatedAt: "2026-08-05T10:05:00.000Z" },
      { id: "2", content: "重复 prompt", createdAt: "2026-08-05T10:00:00.000Z", updatedAt: "2026-08-05T10:00:00.000Z" }
    ];
    writeFileSync(join(storeDir, "prompt-history.json"), JSON.stringify(rawHistory), "utf-8");

    const store = new PromptHistoryStore(storeDir);
    const history = store.load();

    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("1");
    expect(history[0].createdAt).toBe("2026-08-05T10:05:00.000Z");
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
