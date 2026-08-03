import type { BrowserWindowConstructorOptions } from "electron";

export const APPLICATION_NAME = "Multi AI Chat";

export function configureAppIdentity(app: { setName: (name: string) => void }) {
  app.setName(APPLICATION_NAME);
}

export function createMainWindowOptions(
  preloadPath: string,
): BrowserWindowConstructorOptions {
  return {
    width: 1500,
    height: 840,
    minWidth: 1500,
    minHeight: 840,
    title: APPLICATION_NAME,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  };
}
