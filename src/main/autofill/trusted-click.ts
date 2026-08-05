import type { WebContents } from "electron";

export interface AutosendScriptResult {
  sent?: boolean;
  method?: string;
  x?: number;
  y?: number;
}

export function dispatchTrustedClick(webContents: WebContents, result: AutosendScriptResult): void {
  if (!result.sent || typeof result.x !== "number" || typeof result.y !== "number") {
    return;
  }
  if (typeof webContents.sendInputEvent !== "function") {
    return;
  }

  webContents.sendInputEvent({ type: "mouseMove", x: result.x, y: result.y });
  webContents.sendInputEvent({ type: "mouseDown", x: result.x, y: result.y, button: "left", clickCount: 1 });
  webContents.sendInputEvent({ type: "mouseUp", x: result.x, y: result.y, button: "left", clickCount: 1 });
}

export function dispatchEnterKey(webContents: WebContents): void {
  if (typeof webContents.sendInputEvent !== "function") {
    return;
  }

  webContents.sendInputEvent({ type: "keyDown", keyCode: "Enter" });
  webContents.sendInputEvent({ type: "keyUp", keyCode: "Enter" });
}
