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
    const script = buildClaudeSendScript();

    try {
      const result = await webContents.executeJavaScript(script);

      if (result && result.sent) {
        dispatchTrustedClick(webContents, result);
        return { success: true, reason: result.method === "enter" ? "已通过回车触发自动发送" : "已点击输入区发送按钮" };
      }

      const fallbackScript = buildGenericAutosendScript();
      const fallbackResult = await webContents.executeJavaScript(fallbackScript);

      if (fallbackResult && fallbackResult.sent) {
        dispatchTrustedClick(webContents, fallbackResult);
        return { success: true, reason: "已点击输入区发送按钮" };
      }

      return { success: false, reason: "未找到 Claude 发送按钮，请手动发送" };
    } catch {
      return { success: false, reason: "自动发送失败，请手动发送" };
    }
  }
}

function buildClaudeSendScript(): string {
  return `
    (function() {
      function rectOf(el) {
        return el ? el.getBoundingClientRect() : { width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
      }

      function isVisible(el) {
        if (!el) return false;
        var s = window.getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
      }

      function isUsable(el) {
        if (!el || !isVisible(el)) return false;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
        return true;
      }

      function textFor(el) {
        if (!el) return '';
        var own = [
          el.getAttribute('aria-label'),
          el.getAttribute('title'),
          el.getAttribute('data-testid'),
          el.id,
          typeof el.className === 'string' ? el.className : '',
          el.textContent
        ].filter(Boolean).join(' ');

        var children = el.querySelectorAll('*');
        var childText = [];
        for (var i = 0; i < children.length && i < 20; i++) {
          var c = children[i];
          childText.push(
            c.getAttribute('aria-label'),
            c.getAttribute('title'),
            c.getAttribute('data-testid'),
            c.getAttribute('alt'),
            c.id,
            typeof c.className === 'string' ? c.className : ''
          );
        }
        return [own, childText.filter(Boolean).join(' ')].filter(Boolean).join(' ').toLowerCase();
      }

      function isRejectedControl(el) {
        var text = textFor(el);
        return /(microphone|mic|voice|audio|record|recording|dictate|dictation|speak|speech|transcribe|talk|stt|whisper|listen|sound|attach|upload|image|file|media|add|plus|paperclip|camera|photo|document|menu|sidebar|drawer|history|search|close|settings|expand|collapse|new chat|profile|account|avatar|model|select|dropdown|option|麦克风|话筒|语音|录音|录制|转文字|声控|说话|上传|附件|图片|文件|添加|相册|菜单|侧边栏|搜索|关闭|设置|新建|个人|账户|模型|选择)/.test(text);
      }

      function isExplicitSend(el) {
        var text = textFor(el);
        if (!text || isRejectedControl(el)) return false;
        return /(^|\\b|_|-)(send|submit|send-button|send-prompt)(\\b|_|-|$)/.test(text) || /发送|提交/.test(text);
      }

      var input = document.querySelector('.ProseMirror, [contenteditable="true"], textarea, #prompt-textarea');
      if (!input) return { sent: false, reason: 'no-input' };

      var container = input;
      for (var i = 0; i < 15; i++) {
        if (container.parentElement && container.parentElement !== document.body) {
          container = container.parentElement;
          var cr = rectOf(container);
          if (cr.width >= 300 && cr.height >= 80) break;
        }
      }

      var buttons = Array.from(container.querySelectorAll('button, [role="button"]'));

      var explicitButtons = buttons.filter(function(btn) {
        return isExplicitSend(btn) && isUsable(btn);
      });

      if (explicitButtons.length > 0) {
        explicitButtons.sort(function(a, b) { return rectOf(b).right - rectOf(a).right; });
        var target = explicitButtons[0];
        var r = rectOf(target);
        var cx = Math.round(r.left + r.width / 2);
        var cy = Math.round(r.top + r.height / 2);

        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(evt) {
          try {
            var e = new (window.PointerEvent || MouseEvent)(evt, {
              bubbles: true, cancelable: true, composed: true,
              clientX: cx, clientY: cy, button: 0,
              buttons: evt.endsWith('down') ? 1 : 0
            });
            target.dispatchEvent(e);
          } catch(err) {}
        });
        try { target.click(); } catch(err) {}

        return { sent: true, method: 'explicit-button', x: cx, y: cy };
      }

      var candidateButtons = buttons.filter(function(btn) {
        return isUsable(btn) && !isRejectedControl(btn);
      });

      if (candidateButtons.length > 0) {
        candidateButtons.sort(function(a, b) { return rectOf(b).right - rectOf(a).right; });
        var rightmost = candidateButtons[0];
        var inputRect = rectOf(input);
        var rmRect = rectOf(rightmost);

        if (rmRect.right >= inputRect.left + inputRect.width * 0.4) {
          var cx = Math.round(rmRect.left + rmRect.width / 2);
          var cy = Math.round(rmRect.top + rmRect.height / 2);

          ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function(evt) {
            try {
              var e = new (window.PointerEvent || MouseEvent)(evt, {
                bubbles: true, cancelable: true, composed: true,
                clientX: cx, clientY: cy, button: 0,
                buttons: evt.endsWith('down') ? 1 : 0
              });
              rightmost.dispatchEvent(e);
            } catch(err) {}
          });
          try { rightmost.click(); } catch(err) {}

          return { sent: true, method: 'rightmost-button', x: cx, y: cy };
        }
      }

      return { sent: false };
    })()
  `;
}
