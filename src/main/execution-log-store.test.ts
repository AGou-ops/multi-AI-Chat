import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ExecutionLogStore } from "./execution-log-store";

describe("ExecutionLogStore", () => {
  let storeDir: string;

  beforeEach(() => {
    storeDir = mkdtempSync(join(tmpdir(), "multi-aichat-executions-"));
  });

  afterEach(() => {
    rmSync(storeDir, { recursive: true, force: true });
  });

  it("保存执行记录并可重新加载", () => {
    const store = new ExecutionLogStore(storeDir);
    store.load();
    store.saveRecord({
      id: "exec-1",
      promptId: "prompt-1",
      promptSnapshot: "解释 Electron WebContentsView",
      targetPlatformIds: ["chatgpt", "claude"],
      attemptedAction: "fill",
      createdAt: "2026-06-26T00:00:00.000Z",
      results: [
        {
          platformId: "chatgpt",
          action: "fill",
          status: "skipped",
          reason: "自动填入尚未接入",
          retryCount: 0,
          timestamp: "2026-06-26T00:00:00.000Z"
        }
      ]
    });

    const reloaded = new ExecutionLogStore(storeDir);
    const records = reloaded.load();

    expect(records).toHaveLength(1);
    expect(records[0].promptSnapshot).toBe("解释 Electron WebContentsView");
    expect(records[0].results[0].platformId).toBe("chatgpt");
  });

  it("清空执行记录，避免下次启动恢复上次退出前的状态", () => {
    const store = new ExecutionLogStore(storeDir);
    store.load();
    store.saveRecord({
      id: "exec-1",
      promptId: "prompt-1",
      promptSnapshot: "解释 Electron WebContentsView",
      targetPlatformIds: ["chatgpt"],
      attemptedAction: "fill",
      createdAt: "2026-06-26T00:00:00.000Z",
      results: [
        {
          platformId: "chatgpt",
          action: "fill",
          status: "failed",
          reason: "平台页面加载超时",
          retryCount: 2,
          timestamp: "2026-06-26T00:00:00.000Z"
        }
      ]
    });

    expect(store.clear()).toEqual([]);

    const reloaded = new ExecutionLogStore(storeDir);
    expect(reloaded.load()).toEqual([]);
  });
});
