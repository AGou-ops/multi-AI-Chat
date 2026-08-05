import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collapseConsecutivePrompts, type PromptHistoryItem, type PromptRetentionPolicy } from "../shared/prompt-history";

const HISTORY_FILENAME = "prompt-history.json";

export class PromptHistoryStore {
  private history: PromptHistoryItem[] = [];

  constructor(
    private readonly storeDir: string,
    private readonly now: () => Date = () => new Date()
  ) {}

  load(): PromptHistoryItem[] {
    const filePath = this.filePath();

    if (!existsSync(filePath)) {
      this.history = [];
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf-8")) as PromptHistoryItem[];
      this.history = Array.isArray(parsed) ? collapseConsecutivePrompts(parsed) : [];
    } catch {
      this.history = [];
    }

    return this.list();
  }

  list(): PromptHistoryItem[] {
    return [...this.history];
  }

  search(query: string): PromptHistoryItem[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.list();
    }

    const filtered = this.history.filter((item) => item.content.toLowerCase().includes(normalizedQuery));
    return collapseConsecutivePrompts(filtered);
  }

  savePrompt(content: string, policy: PromptRetentionPolicy, createdAt: Date = this.now()): PromptHistoryItem[] {
    const trimmedContent = content.trim();

    if (!trimmedContent || policy.type === "disabled") {
      return this.list();
    }

    const timestamp = createdAt.toISOString();

    if (this.history.length > 0 && this.history[0].content === trimmedContent) {
      this.history[0] = {
        ...this.history[0],
        createdAt: timestamp,
        updatedAt: timestamp
      };
    } else {
      const item: PromptHistoryItem = {
        id: `prompt-${createdAt.getTime()}-${this.history.length + 1}`,
        content: trimmedContent,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      this.history = [item, ...this.history];
    }

    this.history = collapseConsecutivePrompts(this.applyRetention(this.history, policy));
    this.save();

    return this.list();
  }

  clear(): PromptHistoryItem[] {
    this.history = [];
    this.save();
    return [];
  }

  private applyRetention(history: PromptHistoryItem[], policy: PromptRetentionPolicy): PromptHistoryItem[] {
    if (policy.type === "forever") {
      return history;
    }

    if (policy.type === "latest-count") {
      return history.slice(0, policy.count);
    }

    if (policy.type === "latest-days") {
      const cutoff = this.now().getTime() - policy.days * 24 * 60 * 60 * 1000;
      return history.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
    }

    return [];
  }

  private save(): void {
    if (!existsSync(this.storeDir)) {
      mkdirSync(this.storeDir, { recursive: true });
    }

    writeFileSync(this.filePath(), JSON.stringify(this.history, null, 2), "utf-8");
  }

  private filePath(): string {
    return join(this.storeDir, HISTORY_FILENAME);
  }
}
