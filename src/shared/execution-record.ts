import type { PromptHistoryItem } from "./prompt-history";

export type ExecutionAction = "fill" | "send";
export type ExecutionStatus = "success" | "failed" | "skipped";

export interface PlatformExecutionResult {
  platformId: string;
  action: ExecutionAction;
  status: ExecutionStatus;
  reason?: string;
  retryCount: number;
  timestamp: string;
}

export interface PromptExecutionRecord {
  id: string;
  promptId: string | null;
  promptSnapshot: string;
  targetPlatformIds: string[];
  attemptedAction: ExecutionAction;
  results: PlatformExecutionResult[];
  createdAt: string;
}

export interface PromptExecutionResponse {
  record: PromptExecutionRecord;
  promptHistory: PromptHistoryItem[];
}
