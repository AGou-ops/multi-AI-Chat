export type PromptRetentionPolicy =
  | { type: "forever" }
  | { type: "latest-count"; count: 50 | 200 }
  | { type: "latest-days"; days: 30 }
  | { type: "disabled" };

export interface PromptHistoryItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const defaultPromptRetentionPolicy: PromptRetentionPolicy = { type: "forever" };
