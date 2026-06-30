export function buildGenericAutofillScript(prompt: string): string {
  return `
    (function() {
      const promptText = ${JSON.stringify(prompt)};
      const selectors = [
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
        if (nestedEditable && nestedEditable !== element) {
          return editableTarget(nestedEditable);
        }
        return element;
      }

      function score(element, index) {
        const rect = element.getBoundingClientRect?.() ?? { width: 0, height: 0, bottom: 0 };
        const width = Math.max(rect.width ?? 0, element.offsetWidth ?? 0, element.clientWidth ?? 0);
        const height = Math.max(rect.height ?? 0, element.offsetHeight ?? 0, element.clientHeight ?? 0);
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        const tag = element.tagName?.toLowerCase?.() ?? '';
        let value = 0;

        if (width >= 320 || width / viewportWidth >= 0.42) {
          value += 80;
        }
        if (height >= 32 && height <= 180) {
          value += 24;
        }
        if ((rect.bottom ?? 0) >= viewportHeight * 0.55) {
          value += 45;
        }
        if (tag === 'textarea' || tag === 'rich-textarea') {
          value += 30;
        }
        if (element.matches?.('[role="textbox"], [contenteditable="true"], .ProseMirror, [data-placeholder]')) {
          value += 18;
        }
        if (element.matches?.('input, textarea') && (element.placeholder || element.getAttribute('aria-label'))) {
          value += 12;
        }
        if (width === 0 && height === 0) {
          value -= 20;
        }
        return value - index * 0.01;
      }

      function dispatchInputEvent(element, type) {
        const InputEventCtor = window.InputEvent || Event;
        try {
          element.dispatchEvent(new InputEventCtor(type, {
            bubbles: true,
            cancelable: type === 'beforeinput',
            composed: true,
            inputType: 'insertText',
            data: promptText
          }));
        } catch {
          element.dispatchEvent(new Event(type, { bubbles: true, cancelable: type === 'beforeinput', composed: true }));
        }
      }

      function shadowHostFor(element) {
        const root = element.getRootNode?.();
        return root instanceof ShadowRoot ? root.host : null;
      }

      function dispatchTextInput(element) {
        dispatchInputEvent(element, 'input');

        const host = shadowHostFor(element);
        if (host) {
          dispatchInputEvent(host, 'input');
        }
      }

      function selectEditableContents(element) {
        const root = element.getRootNode?.();
        const selection = root?.getSelection?.() ?? window.getSelection?.();
        if (!selection || !document.createRange) {
          return false;
        }

        const range = document.createRange();
        range.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }

      function writePlainTextPreservingEditor(element) {
        const textContainer = element.querySelector?.('p, [data-node-type], [data-testid*="paragraph"], div:not([contenteditable])');
        if (textContainer && textContainer !== element) {
          textContainer.textContent = promptText;
          return;
        }

        element.textContent = promptText;
      }

      const candidates = selectors
        .flatMap((selector) => Array.from((document.body ?? document).querySelectorAll(selector)))
        .map(editableTarget)
        .filter((element, index, all) => element && all.indexOf(element) === index && isUsable(element));

      if (candidates.length === 0) {
        return { found: false };
      }

      const editable = candidates
        .map((element, index) => ({ element, score: score(element, index) }))
        .sort((a, b) => b.score - a.score)[0]?.element;

      if (!editable) {
        return { found: false };
      }

      const tag = editable.tagName?.toLowerCase?.() ?? '';
      editable.focus?.();
      dispatchInputEvent(editable, 'beforeinput');

      if (tag === 'textarea' || tag === 'input') {
        const prototype = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(editable, promptText);
        } else {
          editable.value = promptText;
        }
        dispatchTextInput(editable);
        editable.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        selectEditableContents(editable);
        const inserted = document.execCommand?.('insertText', false, promptText);
        if (!inserted) {
          writePlainTextPreservingEditor(editable);
        }
        dispatchTextInput(editable);
      }

      return { found: true };
    })()
  `;
}
