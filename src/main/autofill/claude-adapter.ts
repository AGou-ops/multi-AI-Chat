import type { WebContents } from "electron";
import type { AutofillResult } from "./types";
import { buildGenericAutofillScript } from "./generic-fill-script";
import { buildGenericAutosendScript } from "./generic-send-script";
import { dispatchTrustedClick } from "./trusted-click";

export class ClaudeAdapter {
  readonly platformId = "claude";

  async attemptFill(webContents: WebContents, prompt: string): Promise<AutofillResult> {
    const script = buildGenericAutofillScript(prompt);

    try {
      const result = await webContents.executeJavaScript(script);

      if (result && result.found) {
        return { success: true, reason: "已填入 prompt" };
      }

      return { success: false, reason: "未找到 Claude 输入框，请手动粘贴" };
    } catch {
      return { success: false, reason: "自动填入失败，请手动粘贴" };
    }
  }

  async attemptSend(webContents: WebContents): Promise<AutofillResult> {
    const script = buildGenericAutosendScript();

    try {
      const result = await webContents.executeJavaScript(script);

      if (result && result.sent) {
        dispatchTrustedClick(webContents, result);
        return { success: true, reason: result.method === "enter" ? "已通过回车触发自动发送" : "已点击输入区发送按钮" };
      }

      return { success: false, reason: "未找到 Claude 发送按钮，请手动发送" };
    } catch {
      return { success: false, reason: "自动发送失败，请手动发送" };
    }
  }
}
