import type { WebContents } from "electron";
import type { AutofillResult } from "./types";
import { buildGenericAutofillScript } from "./generic-fill-script";
import { dispatchCommandEnter } from "./trusted-click";

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
    // Give the WebContents programmatic focus so that JS focus() and
    // native sendInputEvent work even when the user's focus is on
    // another platform view.
    webContents.focus();

    const script = buildClaudeFocusScript();

    try {
      const result = await webContents.executeJavaScript(script);

      if (result && result.focused) {
        dispatchCommandEnter(webContents);
        return {
          success: true,
          reason: "已通过 Command+Enter 快捷键自动发送"
        };
      }

      return { success: false, reason: "未找到 Claude 输入框，请手动发送" };
    } catch {
      return { success: false, reason: "自动发送失败，请手动发送" };
    }
  }
}

function buildClaudeFocusScript(): string {
  return `
    (function() {
      var input = document.querySelector('.ProseMirror, [contenteditable="true"], textarea, #prompt-textarea');

      if (!input) {
        var hosts = document.querySelectorAll('rich-textarea');
        for (var i = 0; i < hosts.length; i++) {
          if (hosts[i].shadowRoot) {
            input = hosts[i].shadowRoot.querySelector('.ProseMirror, [contenteditable="true"], textarea');
            if (input) break;
          }
        }
      }

      if (!input) return { focused: false, reason: 'no-input' };

      try {
        input.focus();
        var range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        var sel = window.getSelection();
        if (sel) { sel.removeAllRanges(); sel.addRange(range); }
      } catch(e) {}

      try {
        input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      } catch(e) {}

      return { focused: true };
    })()
  `;
}
