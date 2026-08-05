export function buildGenericAutosendScript(options: { activate?: boolean; activation?: "events" | "dom" } = {}): string {
  const activate = options.activate !== false;
  const activation = options.activation ?? "events";

  return `
    (function() {
      const inputSelectors = [
        'textarea',
        '#prompt-textarea',
        'rich-textarea',
        '[contenteditable="true"]',
        'div[contenteditable]',
        '[role="textbox"]',
        '.ProseMirror',
        '[data-placeholder]',
        'input[type="text"]:not([type="hidden"])',
        'input:not([type]):not([type="hidden"])'
      ];
      const buttonSelectors = [
        '[data-testid="send-button"]',
        '[data-testid*="send"]',
        '[class*="send" i]',
        '[class*="submit" i]',
        'button[aria-label]',
        'button[type="submit"]',
        'button.send-button',
        'button',
        '[role="button"]',
        'svg'
      ];

      function isUsable(element) {
        if (!element || element.closest?.('[aria-hidden="true"], [hidden], dialog:not([open])')) {
          return false;
        }
        if (element.disabled || element.readOnly || element.getAttribute?.('aria-disabled') === 'true') {
          return false;
        }
        const style = window.getComputedStyle?.(element);
        if (style && (style.display === 'none' || style.visibility === 'hidden' || (style.opacity !== '' && Number(style.opacity) === 0))) {
          return false;
        }
        return true;
      }

      function editableTarget(element) {
        if (!element) {
          return null;
        }
        const tag = element.tagName?.toLowerCase?.() ?? '';
        if (tag === 'rich-textarea') {
          return element.shadowRoot?.querySelector?.('[contenteditable="true"], [contenteditable], [role="textbox"], textarea') ?? element;
        }
        if (tag === 'textarea' || tag === 'input' || element.matches?.('[contenteditable="true"], [contenteditable], .ProseMirror')) {
          return element;
        }
        const nestedEditable = element.querySelector?.('textarea, input[type="text"]:not([type="hidden"]), input:not([type]):not([type="hidden"]), [contenteditable="true"], [contenteditable], .ProseMirror, [role="textbox"]');
        return nestedEditable && nestedEditable !== element ? editableTarget(nestedEditable) : element;
      }

      function rectOf(element) {
        return element.getBoundingClientRect?.() ?? { width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
      }

      function scoreInput(element, index) {
        const rect = rectOf(element);
        const width = Math.max(rect.width ?? 0, element.offsetWidth ?? 0, element.clientWidth ?? 0);
        const height = Math.max(rect.height ?? 0, element.offsetHeight ?? 0, element.clientHeight ?? 0);
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        const tag = element.tagName?.toLowerCase?.() ?? '';
        let value = 0;

        if (width >= 320 || width / viewportWidth >= 0.42) {
          value += 80;
        }
        if (height >= 28 && height <= 220) {
          value += 24;
        }
        if ((rect.bottom ?? 0) >= viewportHeight * 0.5) {
          value += 45;
        }
        if (tag === 'textarea' || tag === 'rich-textarea') {
          value += 30;
        }
        if (element.matches?.('[role="textbox"], [contenteditable="true"], .ProseMirror, [data-placeholder]')) {
          value += 18;
        }
        return value - index * 0.01;
      }

      function textFor(element) {
        if (!element) return '';
        const ownText = [
          element.getAttribute?.('aria-label'),
          element.getAttribute?.('title'),
          element.getAttribute?.('data-testid'),
          element.id,
          typeof element.className === 'string' ? element.className : '',
          element.textContent
        ].filter(Boolean).join(' ');

        const children = element.querySelectorAll?.('*') || [];
        const childText = [];
        for (let i = 0; i < children.length && i < 30; i++) {
          const c = children[i];
          childText.push(
            c.getAttribute?.('aria-label'),
            c.getAttribute?.('title'),
            c.getAttribute?.('data-testid'),
            c.getAttribute?.('alt'),
            c.id,
            typeof c.className === 'string' ? c.className : ''
          );
        }
        return [ownText, childText.filter(Boolean).join(' ')].filter(Boolean).join(' ').toLowerCase();
      }

      function isRejectedControl(element) {
        const text = textFor(element);
        return /(microphone|mic|voice|audio|record|recording|dictate|dictation|speak|speech|transcribe|talk|stt|whisper|listen|sound|attach|attachment|upload|image|file|media|add|plus|paperclip|camera|photo|document|menu|sidebar|drawer|history|search|close|settings|expand|collapse|new chat|profile|account|avatar|user menu|log ?out|model|select|dropdown|option|tools|plugin|web-search|reasoning|thinking|canvas|artifact|麦克风|话筒|语音|录音|录制|转文字|声控|说话|上传|附件|图片|文件|添加|相册|菜单|侧边栏|展开|收起|搜索|关闭|设置|新建|个人|账户|头像|模型|选择|插件|联网)/.test(text);
      }

      function isExplicitSend(element) {
        const text = textFor(element);
        if (!text || isRejectedControl(element)) {
          return false;
        }
        return /(^|\\b|_|-)(send|submit|send-button)(\\b|_|-|$)/.test(text) || /发送|提交/.test(text);
      }

      function ancestorChain(element) {
        const ancestors = [];
        let current = element;
        while (current && ancestors.length < 7) {
          ancestors.push(current);
          current = current.parentElement;
        }
        return ancestors;
      }

      function hasRightwardSiblingButton(button, composerButtons) {
        const r = rectOf(button);
        if ((r.width ?? 0) === 0 && (r.height ?? 0) === 0) return false;
        for (let i = 0; i < composerButtons.length; i++) {
          const other = composerButtons[i];
          if (other === button) continue;
          const or = rectOf(other);
          if ((or.width ?? 0) === 0 && (or.height ?? 0) === 0) continue;
          const vertOverlap = Math.max(0, Math.min(r.bottom, or.bottom) - Math.max(r.top, or.top));
          const nearVert = vertOverlap > 0 || Math.abs(((r.top + r.bottom) / 2) - ((or.top + or.bottom) / 2)) <= 40;
          if (nearVert && or.left >= r.left + 12) {
            return true;
          }
        }
        return false;
      }

      function geometryScore(button, inputRect) {
        const rect = rectOf(button);
        const hasRealRect = (rect.width ?? 0) > 0 || (rect.height ?? 0) > 0;
        if (!hasRealRect) {
          return 12;
        }
        const verticalOverlap = Math.max(0, Math.min(rect.bottom, inputRect.bottom) - Math.max(rect.top, inputRect.top));
        const nearVertically = verticalOverlap > 0 || Math.abs(((rect.top + rect.bottom) / 2) - ((inputRect.top + inputRect.bottom) / 2)) <= 96;
        const onRightSide = rect.left >= inputRect.left || rect.right >= inputRect.right - 120;

        if (!nearVertically || !onRightSide) {
          return -80;
        }
        const horizontalSpan = Math.max(inputRect.right - inputRect.left, 1);
        const rightwardScore = Math.max(0, ((rect.right - inputRect.left) / horizontalSpan) * 42);
        const rightmostBonus = rect.right >= inputRect.right - 40 ? 35 : 0;
        return 30 + (rect.left >= inputRect.right - 160 ? 25 : 0) + rightwardScore + rightmostBonus;
      }

      function centerOf(element) {
        const rect = rectOf(element);
        return {
          x: Math.round((rect.left ?? 0) + Math.max((rect.width ?? 0) / 2, 1)),
          y: Math.round((rect.top ?? 0) + Math.max((rect.height ?? 0) / 2, 1))
        };
      }

      function dispatchPointerMouseEvent(element, eventName) {
        const rect = rectOf(element);
        const eventInit = {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: (rect.left ?? 0) + Math.max((rect.width ?? 0) / 2, 1),
          clientY: (rect.top ?? 0) + Math.max((rect.height ?? 0) / 2, 1),
          button: 0,
          buttons: eventName === 'pointerup' || eventName === 'mouseup' || eventName === 'click' ? 0 : 1
        };
        const EventCtor = eventName.startsWith('pointer') && window.PointerEvent ? window.PointerEvent : window.MouseEvent;
        element.dispatchEvent(new EventCtor(eventName, eventInit));
      }

      function activateButton(button) {
        ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((eventName) => {
          dispatchPointerMouseEvent(button, eventName);
        });
        button.click?.();
      }

      function activationTargets(element) {
        if (!element || element.tagName?.toLowerCase?.() !== 'svg') {
          return [element];
        }

        const targets = [];
        const nearest = element.closest?.('button, [role="button"], [class*="send" i], [class*="submit" i], div, span');
        if (nearest) {
          targets.push(nearest);
        }

        let current = element.parentElement;
        while (current && current !== document.body && targets.length < 4) {
          const style = window.getComputedStyle?.(current);
          if (
            current.matches?.('button, [role="button"], [tabindex], [class*="send" i], [class*="submit" i]') ||
            style?.cursor === 'pointer'
          ) {
            targets.push(current);
          }
          current = current.parentElement;
        }

        return targets.length > 0 ? targets : [element];
      }

      const inputs = inputSelectors
        .flatMap((selector) => Array.from((document.body ?? document).querySelectorAll(selector)))
        .map(editableTarget)
        .filter((element, index, all) => element && all.indexOf(element) === index && isUsable(element));
      const editable = inputs
        .map((element, index) => ({ element, score: scoreInput(element, index) }))
        .sort((a, b) => b.score - a.score)[0]?.element;
      const editableRect = editable ? rectOf(editable) : { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0 };
      const ancestors = editable ? ancestorChain(editable) : [];
      const allButtons = buttonSelectors
        .flatMap((selector) => Array.from((document.body ?? document).querySelectorAll(selector)))
        .flatMap(activationTargets)
        .filter((element, index, all) => element && all.indexOf(element) === index && isUsable(element) && !isRejectedControl(element));

      const composerButtons = allButtons.filter((btn) => ancestors.some((ancestor) => ancestor !== btn && ancestor.contains?.(btn)));

      const candidates = allButtons
        .map((button, index) => {
          const inComposer = ancestors.some((ancestor) => ancestor !== button && ancestor.contains?.(button));
          const explicit = isExplicitSend(button);
          const typeSubmit = button.matches?.('button[type="submit"]') || button.getAttribute?.('role') === 'button';
          const iconOnly = !!button.querySelector?.('svg') && !button.textContent?.trim();
          const pointerLike = window.getComputedStyle?.(button)?.cursor === 'pointer';
          const wrapsEditable = editable ? button.contains?.(editable) : false;
          const hasRightSibling = hasRightwardSiblingButton(button, composerButtons);
          let score = 0;

          if (explicit) {
            score += 120;
          }
          if (inComposer) {
            score += 70;
          }
          if (typeSubmit) {
            score += 20;
          }
          if (iconOnly) {
            score += 12;
          }
          if (pointerLike) {
            score += 22;
          }
          if (wrapsEditable) {
            score += 18;
          }
          if (editable) {
            score += geometryScore(button, editableRect);
          }
          if (!explicit && hasRightSibling) {
            score -= 200;
          }
          return { button, score: score - index * 0.01 };
        })
        .filter(({ score }) => score >= 70)
        .sort((a, b) => b.score - a.score);

      const sendButton = candidates[0]?.button;
      if (sendButton) {
        if (${activate && activation === "dom" ? "true" : "false"}) {
          sendButton.click?.();
        } else if (${activate ? "true" : "false"}) {
          activateButton(sendButton);
        }
        const center = centerOf(sendButton);
        return { sent: true, method: 'button', x: center.x, y: center.y };
      }

      return { sent: false };
    })()
  `;
}
