import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { PromptExecutionRecord } from "../shared/execution-record";

const EXECUTION_LOG_FILENAME = "execution-log.json";

export class ExecutionLogStore {
  private records: PromptExecutionRecord[] = [];

  constructor(
    private readonly storeDir: string
  ) {}

  load(): PromptExecutionRecord[] {
    const filePath = this.filePath();

    if (!existsSync(filePath)) {
      this.records = [];
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as PromptExecutionRecord[];
      this.records = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.records = [];
    }

    return this.list();
  }

  list(): PromptExecutionRecord[] {
    return [...this.records];
  }

  saveRecord(record: PromptExecutionRecord): PromptExecutionRecord[] {
    this.records = [record, ...this.records];
    this.save();
    return this.list();
  }

  clear(): PromptExecutionRecord[] {
    this.records = [];
    rmSync(this.filePath(), { force: true });
    return [];
  }

  private save(): void {
    if (!existsSync(this.storeDir)) {
      mkdirSync(this.storeDir, { recursive: true });
    }

    writeFileSync(this.filePath(), JSON.stringify(this.records, null, 2), "utf-8");
  }

  private filePath(): string {
    return join(this.storeDir, EXECUTION_LOG_FILENAME);
  }
}
