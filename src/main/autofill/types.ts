import type { WebContents } from "electron";

export interface AutofillResult {
  success: boolean;
  reason: string;
}

export interface PlatformAutofillAdapter {
  readonly platformId: string;
  attemptFill(webContents: WebContents, prompt: string): Promise<AutofillResult>;
  attemptSend(webContents: WebContents): Promise<AutofillResult>;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
}
