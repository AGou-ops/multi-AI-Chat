import { BrowserWindow, dialog, ipcMain } from "electron";
import type { ThemePreference } from "../shared/config";
import type {
  CustomPlatformDialogOptions,
  CustomPlatformInput,
  SettingsDialogOptions,
  SettingsDialogResult
} from "../shared/types";

const ADD_PLATFORM_SUBMIT_CHANNEL = "modal:add-platform:submit";
const ADD_PLATFORM_CANCEL_CHANNEL = "modal:add-platform:cancel";
const SETTINGS_SUBMIT_CHANNEL = "modal:settings:submit";
const SETTINGS_CANCEL_CHANNEL = "modal:settings:cancel";
const SETTINGS_THEME_CHANGE_CHANNEL = "modal:settings:theme-change";

type ShowSettingsDialogOptions = SettingsDialogOptions & {
  onThemePreferenceChange?: (themePreference: ThemePreference) => void;
};

export async function showPlatformLimitDialog(window: BrowserWindow): Promise<void> {
  await dialog.showMessageBox(window, {
    type: "warning",
    buttons: ["我知道了"],
    defaultId: 0,
    cancelId: 0,
    title: "平台数量已达上限",
    message: "平台数量已达上限",
    detail: "当前版本最多同时打开 4 个聊天平台，请先关闭一个再继续。"
  });
}

export async function showAddPlatformDialog(
  parentWindow: BrowserWindow,
  options: CustomPlatformDialogOptions
): Promise<CustomPlatformInput | null> {
  const theme = options.theme === "dark" ? "dark" : "light";
  const backgroundColor = theme === "dark" ? "#111827" : "#f8fafc";
  const modalWindow = new BrowserWindow({
    parent: parentWindow,
    modal: true,
    show: false,
    width: 560,
    height: 360,
    minWidth: 560,
    minHeight: 360,
    useContentSize: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "添加自定义平台",
    backgroundColor,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  return await new Promise<CustomPlatformInput | null>((resolve) => {
    let settled = false;

    const cleanup = () => {
      ipcMain.off(ADD_PLATFORM_SUBMIT_CHANNEL, handleSubmit);
      ipcMain.off(ADD_PLATFORM_CANCEL_CHANNEL, handleCancel);
    };

    const finish = (value: CustomPlatformInput | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (!modalWindow.isDestroyed()) {
        modalWindow.close();
      }
      resolve(value);
    };

    const handleSubmit = (
      event: Electron.IpcMainEvent,
      payload: {
        name: string;
        url: string;
      }
    ) => {
      if (event.sender !== modalWindow.webContents) {
        return;
      }

      finish({
        name: payload.name.trim(),
        url: payload.url.trim()
      });
    };

    const handleCancel = (event: Electron.IpcMainEvent) => {
      if (event.sender !== modalWindow.webContents) {
        return;
      }

      finish(null);
    };

    ipcMain.on(ADD_PLATFORM_SUBMIT_CHANNEL, handleSubmit);
    ipcMain.on(ADD_PLATFORM_CANCEL_CHANNEL, handleCancel);

    modalWindow.on("closed", () => finish(null));
    modalWindow.once("ready-to-show", () => {
      modalWindow.show();
    });

    void modalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildAddPlatformDialogHtml(options.existingUrls, theme))}`);
  });
}

export async function showSettingsDialog(
  parentWindow: BrowserWindow,
  options: ShowSettingsDialogOptions
): Promise<SettingsDialogResult | null> {
  const theme = options.resolvedTheme === "dark" ? "dark" : "light";
  const modalWindow = new BrowserWindow({
    parent: parentWindow,
    modal: true,
    show: false,
    width: 560,
    height: 520,
    minWidth: 560,
    minHeight: 520,
    useContentSize: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    title: "工作台偏好",
    backgroundColor: theme === "dark" ? "#111827" : "#f8fafc",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  return await new Promise<SettingsDialogResult | null>((resolve) => {
    let settled = false;

    const cleanup = () => {
      ipcMain.off(SETTINGS_SUBMIT_CHANNEL, handleSubmit);
      ipcMain.off(SETTINGS_CANCEL_CHANNEL, handleCancel);
      ipcMain.off(SETTINGS_THEME_CHANGE_CHANNEL, handleThemeChange);
    };

    const finish = (value: SettingsDialogResult | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (!modalWindow.isDestroyed()) {
        modalWindow.close();
      }
      resolve(value);
    };

    const handleSubmit = (event: Electron.IpcMainEvent, payload: SettingsDialogResult) => {
      if (event.sender !== modalWindow.webContents) {
        return;
      }

      finish(payload);
    };

    const handleCancel = (event: Electron.IpcMainEvent) => {
      if (event.sender !== modalWindow.webContents) {
        return;
      }

      finish(null);
    };

    const handleThemeChange = (
      event: Electron.IpcMainEvent,
      payload: { themePreference?: ThemePreference }
    ) => {
      if (event.sender !== modalWindow.webContents) {
        return;
      }

      if (
        payload.themePreference !== "light" &&
        payload.themePreference !== "dark" &&
        payload.themePreference !== "system"
      ) {
        return;
      }

      options.onThemePreferenceChange?.(payload.themePreference);
    };

    ipcMain.on(SETTINGS_SUBMIT_CHANNEL, handleSubmit);
    ipcMain.on(SETTINGS_CANCEL_CHANNEL, handleCancel);
    ipcMain.on(SETTINGS_THEME_CHANGE_CHANNEL, handleThemeChange);

    modalWindow.on("close", (event) => {
      if (settled) {
        return;
      }

      event.preventDefault();
      void modalWindow.webContents
        .executeJavaScript("collectResult()", true)
        .then((payload) => finish(payload as SettingsDialogResult))
        .catch(() => finish(null));
    });
    modalWindow.on("closed", () => finish(null));
    modalWindow.once("ready-to-show", () => {
      modalWindow.show();
    });

    void modalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(buildSettingsDialogHtml(options))}`);
  });
}

function buildAddPlatformDialogHtml(existingUrls: string[], theme: "light" | "dark"): string {
  const existingUrlsJson = JSON.stringify(existingUrls);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>添加自定义平台</title>
    <style>
      :root {
        color-scheme: ${theme};
        font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        display: grid;
        width: 100vw;
        height: 100vh;
        margin: 0;
        background: #f8fafc;
        color: #134e4a;
        overflow: hidden;
      }
      .settings-dialog {
        display: flex;
        flex-direction: column;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        overflow: hidden;
        border: 0;
        border-radius: 0;
        background: #ffffff;
        color: #134e4a;
        box-shadow: none;
      }
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 10px;
        border-bottom: 1px solid #e2e8f0;
      }
      .settings-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .dialog-header h1 {
        margin: 0;
        color: #0f172a;
        font-size: 15px;
        font-weight: 700;
      }
      form {
        display: flex;
        flex-direction: column;
        min-height: 0;
        flex: 1;
      }
      .settings-dialog-body {
        display: grid;
        align-content: start;
        gap: 12px;
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 14px;
      }
      .settings-section {
        display: grid;
        align-self: start;
        gap: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        padding: 12px;
      }
      .settings-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .settings-section-heading h2 {
        margin: 0;
        color: #0f172a;
        font-size: 13px;
      }
      .settings-section-heading span {
        color: #64748b;
        font-size: 12px;
      }
      .settings-field {
        display: grid;
        grid-template-columns: minmax(112px, 1fr) minmax(240px, 1.45fr);
        align-items: start;
        gap: 12px;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
      }
      .field-control {
        display: grid;
        gap: 5px;
        min-width: 0;
      }
      input {
        min-height: 34px;
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #0f172a;
        padding: 7px 10px;
        font: inherit;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease;
      }
      input:focus {
        outline: 2px solid #0d9488;
        outline-offset: 2px;
        border-color: #0d9488;
        box-shadow: 0 0 0 3px rgb(13 148 136 / 16%);
      }
      .form-error {
        min-height: 16px;
        color: #dc2626;
        font-size: 12px;
        font-weight: 600;
      }
      .dialog-footer {
        display: flex;
        flex: 0 0 auto;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 16px;
        border-top: 1px solid #e2e8f0;
      }
      button {
        font: inherit;
        cursor: pointer;
      }
      .pane-toggle-button,
      .secondary-action,
      .primary-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #134e4a;
        padding: 0 11px;
        font-weight: 600;
        transition:
          background-color 160ms ease,
          border-color 160ms ease,
          color 160ms ease;
      }
      .pane-toggle-button {
        width: 32px;
        min-height: 32px;
        padding: 0;
      }
      .pane-toggle-button:hover,
      .secondary-action:hover,
      .primary-action:hover {
        border-color: #14b8a6;
        background: #f0fdfa;
      }
      .primary-action {
        border-color: #0d9488;
        background: #0d9488;
        color: #ffffff;
        font-weight: 700;
      }
      .primary-action:hover {
        border-color: #0f766e;
        background: #0f766e;
      }
      body[data-theme="dark"] {
        background: #0f172a;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .settings-dialog {
        border-color: #334155;
        background: #111827;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .dialog-header,
      body[data-theme="dark"] .dialog-footer {
        border-color: #334155;
      }
      body[data-theme="dark"] .settings-section {
        border-color: #334155;
        background: #0f172a;
      }
      body[data-theme="dark"] .dialog-header h1,
      body[data-theme="dark"] .settings-section-heading h2 {
        color: #f8fafc;
      }
      body[data-theme="dark"] .settings-section-heading span,
      body[data-theme="dark"] .settings-field {
        color: #94a3b8;
      }
      body[data-theme="dark"] input {
        border-color: #475569;
        background: #0f172a;
        color: #f8fafc;
      }
      body[data-theme="dark"] .pane-toggle-button,
      body[data-theme="dark"] .secondary-action {
        border-color: transparent;
        background: transparent;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .pane-toggle-button:hover,
      body[data-theme="dark"] .secondary-action:hover {
        border-color: #2dd4bf;
        background: #134e4a;
        color: #f8fafc;
      }
      @media (max-width: 520px) {
        .settings-field {
          grid-template-columns: 1fr;
          gap: 6px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          transition-duration: 0.01ms !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    </style>
  </head>
  <body data-theme="${theme}">
    <main class="settings-dialog add-platform-dialog" role="dialog" aria-modal="true" aria-labelledby="add-platform-title">
      <div class="dialog-header">
        <div class="settings-title">
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12h8"></path>
            <path d="M12 8v8"></path>
          </svg>
          <h1 id="add-platform-title">添加自定义平台</h1>
        </div>
        <button class="pane-toggle-button" id="close-button" type="button" aria-label="关闭添加自定义平台" title="关闭添加自定义平台">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <form id="dialog-form">
        <div class="settings-dialog-body">
          <section class="settings-section" aria-labelledby="custom-platform-heading">
            <div class="settings-section-heading">
              <h2 id="custom-platform-heading">平台信息</h2>
              <span>自定义 URL</span>
            </div>
            <label class="settings-field" for="platform-name">
              <span>平台名称</span>
              <span class="field-control">
                <input id="platform-name" type="text" placeholder="例如: Perplexity" autofocus />
                <span class="form-error" id="name-error" aria-live="polite"></span>
              </span>
            </label>
            <label class="settings-field" for="platform-url">
              <span>平台 URL</span>
              <span class="field-control">
                <input id="platform-url" type="url" placeholder="https://example.com" />
                <span class="form-error" id="url-error" aria-live="polite"></span>
              </span>
            </label>
          </section>
        </div>
        <div class="dialog-footer">
          <button class="secondary-action" id="cancel-button" type="button">取消</button>
          <button class="primary-action" type="submit">添加</button>
        </div>
      </form>
    </main>
    <script>
      const { ipcRenderer } = require("electron");
      const existingUrls = ${existingUrlsJson};
      const form = document.getElementById("dialog-form");
      const nameInput = document.getElementById("platform-name");
      const urlInput = document.getElementById("platform-url");
      const nameError = document.getElementById("name-error");
      const urlError = document.getElementById("url-error");
      const cancelButton = document.getElementById("cancel-button");
      const closeButton = document.getElementById("close-button");

      function validate() {
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        let valid = true;

        nameError.textContent = "";
        urlError.textContent = "";

        if (!name) {
          nameError.textContent = "平台名称不能为空";
          valid = false;
        }

        if (!url) {
          urlError.textContent = "URL 不能为空";
          valid = false;
        } else {
          try {
            const parsed = new URL(url);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
              urlError.textContent = "URL 必须使用 http 或 https 协议";
              valid = false;
            } else if (existingUrls.includes(url)) {
              urlError.textContent = "该平台 URL 已被其他平台使用";
              valid = false;
            }
          } catch {
            urlError.textContent = "URL 格式无效";
            valid = false;
          }
        }

        return valid;
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validate()) {
          return;
        }
        ipcRenderer.send("${ADD_PLATFORM_SUBMIT_CHANNEL}", {
          name: nameInput.value,
          url: urlInput.value
        });
      });

      cancelButton.addEventListener("click", () => {
        ipcRenderer.send("${ADD_PLATFORM_CANCEL_CHANNEL}");
      });

      closeButton.addEventListener("click", () => {
        ipcRenderer.send("${ADD_PLATFORM_CANCEL_CHANNEL}");
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          ipcRenderer.send("${ADD_PLATFORM_CANCEL_CHANNEL}");
        }
      });
    </script>
  </body>
</html>`;
}

function buildSettingsDialogHtml(options: SettingsDialogOptions): string {
  const optionsJson = JSON.stringify(options);
  const isAutoClearPromptEnabled = options.autoClearPromptEnabled ?? true;
  const isConfirmBatchSendEnabled = options.confirmBatchSendEnabled ?? true;
  const theme = options.resolvedTheme === "dark" ? "dark" : "light";

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>工作台偏好</title>
    <style>
      :root {
        color-scheme: ${theme};
        font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        width: 100vw;
        height: 100vh;
        margin: 0;
        background: #f8fafc;
        color: #134e4a;
        overflow: hidden;
      }
      .settings-dialog {
        display: flex;
        flex-direction: column;
        width: 100vw;
        height: 100vh;
        overflow: hidden;
        background: #ffffff;
        color: #134e4a;
      }
      .dialog-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px 10px;
        border-bottom: 1px solid #e2e8f0;
      }
      .settings-title {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      h1, h2 {
        margin: 0;
        color: #0f172a;
      }
      h1 {
        font-size: 15px;
      }
      h2 {
        font-size: 13px;
      }
      .settings-dialog-body {
        display: grid;
        gap: 12px;
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 14px;
      }
      .settings-section {
        display: grid;
        gap: 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        padding: 12px;
      }
      .settings-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .settings-section-heading span {
        color: #64748b;
        font-size: 12px;
      }
      .theme-choice-group {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .theme-choice,
      .settings-check {
        cursor: pointer;
      }
      .theme-choice {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 36px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #334155;
        font-size: 12px;
        font-weight: 700;
      }
      .theme-choice:has(input:checked) {
        border-color: #14b8a6;
        background: #ccfbf1;
        color: #0f766e;
      }
      .settings-field {
        display: grid;
        grid-template-columns: minmax(120px, 1fr) minmax(160px, 220px);
        align-items: center;
        gap: 12px;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
      }
      select {
        min-height: 34px;
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        color: #0f172a;
        padding: 6px 9px;
        font: inherit;
      }
      .settings-toggle-list {
        display: grid;
        gap: 7px;
      }
      .settings-check {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        color: #334155;
        font-size: 13px;
      }
      input {
        accent-color: #0d9488;
      }
      button {
        font: inherit;
        cursor: pointer;
      }
      .pane-toggle-button,
      .secondary-action,
      .primary-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #134e4a;
        padding: 0 11px;
        font-weight: 600;
      }
      .pane-toggle-button {
        width: 32px;
        min-height: 32px;
        padding: 0;
      }
      .pane-toggle-button:hover,
      .secondary-action:hover {
        border-color: #14b8a6;
        background: #f0fdfa;
      }
      .close-icon {
        display: block;
        width: 16px;
        height: 16px;
        pointer-events: none;
      }
      .primary-action {
        border-color: #0d9488;
        background: #0d9488;
        color: #ffffff;
        font-weight: 700;
      }
      .dialog-footer {
        display: flex;
        flex: 0 0 auto;
        justify-content: flex-end;
        gap: 8px;
        padding: 10px 16px;
        border-top: 1px solid #e2e8f0;
      }
      body[data-theme="dark"] {
        background: #0f172a;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .settings-dialog {
        background: #111827;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .dialog-header,
      body[data-theme="dark"] .dialog-footer,
      body[data-theme="dark"] .settings-section {
        border-color: #334155;
      }
      body[data-theme="dark"] .settings-section {
        background: #0f172a;
      }
      body[data-theme="dark"] h1,
      body[data-theme="dark"] h2 {
        color: #f8fafc;
      }
      body[data-theme="dark"] .settings-section-heading span,
      body[data-theme="dark"] .settings-field,
      body[data-theme="dark"] .settings-check {
        color: #94a3b8;
      }
      body[data-theme="dark"] select,
      body[data-theme="dark"] .theme-choice {
        border-color: #475569;
        background: #0f172a;
        color: #f8fafc;
      }
      body[data-theme="dark"] .theme-choice:has(input:checked) {
        border-color: #2dd4bf;
        background: #134e4a;
      }
      body[data-theme="dark"] .pane-toggle-button,
      body[data-theme="dark"] .secondary-action {
        border-color: transparent;
        background: transparent;
        color: #cbd5e1;
      }
      body[data-theme="dark"] .pane-toggle-button:hover,
      body[data-theme="dark"] .secondary-action:hover {
        border-color: #2dd4bf;
        background: #134e4a;
        color: #f8fafc;
      }
    </style>
  </head>
  <body data-theme="${theme}">
    <main class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
      <div class="dialog-header">
        <div class="settings-title">
          <h1 id="settings-dialog-title">工作台偏好</h1>
        </div>
        <button class="pane-toggle-button" id="close-button" type="button" aria-label="关闭设置" title="关闭设置">
          <svg class="close-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <form id="settings-form">
        <div class="settings-dialog-body">
          <section class="settings-section" aria-labelledby="theme-settings-heading">
            <div class="settings-section-heading">
              <h2 id="theme-settings-heading">主题</h2>
              <span>跟随工作台</span>
            </div>
            <div class="theme-choice-group" role="radiogroup" aria-label="主题偏好">
              <label class="theme-choice"><input type="radio" name="themePreference" value="light" />明亮</label>
              <label class="theme-choice"><input type="radio" name="themePreference" value="dark" />暗黑</label>
              <label class="theme-choice"><input type="radio" name="themePreference" value="system" />跟随系统</label>
            </div>
          </section>
          <section class="settings-section" aria-labelledby="workspace-settings-heading">
            <div class="settings-section-heading">
              <h2 id="workspace-settings-heading">工作台</h2>
              <span>默认操作</span>
            </div>
            <label class="settings-field" for="settings-layout-mode">
              <span>布局模式</span>
              <select id="settings-layout-mode" name="platformLayoutMode">
                <option value="grid">网格</option>
                <option value="columns">垂直</option>
              </select>
            </label>
            <label class="settings-field" for="settings-prompt-retention">
              <span>Prompt 历史保留</span>
              <select id="settings-prompt-retention" name="promptRetention">
                <option value="forever">永久保存</option>
                <option value="latest-50">最近 50 条</option>
                <option value="latest-200">最近 200 条</option>
                <option value="latest-30-days">最近 30 天</option>
                <option value="disabled">不保存</option>
              </select>
            </label>
            <label class="settings-check">
              <input id="settings-auto-clear-prompt" type="checkbox" name="autoClearPromptEnabled" ${isAutoClearPromptEnabled ? "checked" : ""} />
              <span>是否自动清空输入框</span>
            </label>
            <label class="settings-check">
              <input id="settings-confirm-batch-send" type="checkbox" name="confirmBatchSendEnabled" ${isConfirmBatchSendEnabled ? "checked" : ""} />
              <span>“填入已启用平台”是否弹窗提示确认</span>
            </label>
          </section>
          <section class="settings-section" aria-labelledby="send-settings-heading">
            <div class="settings-section-heading">
              <h2 id="send-settings-heading">发送</h2>
              <span>自动发送目标</span>
            </div>
            <div class="settings-toggle-list" id="auto-send-list" aria-label="设置自动发送目标"></div>
          </section>
        </div>
        <div class="dialog-footer">
          <button class="secondary-action" id="cancel-button" type="button">取消</button>
          <button class="primary-action" type="submit">完成</button>
        </div>
      </form>
    </main>
    <script>
      const { ipcRenderer } = require("electron");
      const options = ${optionsJson};
      const form = document.getElementById("settings-form");
      const closeButton = document.getElementById("close-button");
      const cancelButton = document.getElementById("cancel-button");
      const autoSendList = document.getElementById("auto-send-list");

      function retentionPolicyToValue(policy) {
        if (policy.type === "latest-count") return policy.count === 50 ? "latest-50" : "latest-200";
        if (policy.type === "latest-days") return "latest-30-days";
        if (policy.type === "disabled") return "disabled";
        return "forever";
      }

      function retentionPolicyFromValue(value) {
        if (value === "latest-50") return { type: "latest-count", count: 50 };
        if (value === "latest-200") return { type: "latest-count", count: 200 };
        if (value === "latest-30-days") return { type: "latest-days", days: 30 };
        if (value === "disabled") return { type: "disabled" };
        return { type: "forever" };
      }

      form.elements.themePreference.value = options.themePreference;
      form.elements.platformLayoutMode.value = options.platformLayoutMode;
      form.elements.promptRetention.value = retentionPolicyToValue(options.promptRetentionPolicy);
      form.elements.autoClearPromptEnabled.checked = options.autoClearPromptEnabled ?? true;
      form.elements.confirmBatchSendEnabled.checked = options.confirmBatchSendEnabled ?? true;
      autoSendList.innerHTML = options.autoSendPlatforms.map((platform) => \`
        <label class="settings-check">
          <input type="checkbox" name="autoSendTarget" value="\${platform.id}" \${options.autoSendEnabledPlatformIds.includes(platform.id) ? "checked" : ""} />
          <span>自动发送 \${platform.name}</span>
        </label>
      \`).join("");

      function collectResult() {
        const autoClearInput = document.getElementById("settings-auto-clear-prompt");
        const confirmBatchInput = document.getElementById("settings-confirm-batch-send");
        return {
          themePreference: form.elements.themePreference.value,
          platformLayoutMode: form.elements.platformLayoutMode.value,
          promptRetentionPolicy: retentionPolicyFromValue(form.elements.promptRetention.value),
          autoClearPromptEnabled: autoClearInput ? autoClearInput.checked : Boolean(form.elements.autoClearPromptEnabled.checked),
          confirmBatchSendEnabled: confirmBatchInput ? confirmBatchInput.checked : Boolean(form.elements.confirmBatchSendEnabled.checked),
          autoSendEnabledPlatformIds: Array.from(form.querySelectorAll("input[name='autoSendTarget']:checked")).map((input) => input.value)
        };
      }

      function syncThemePreview() {
        const preference = form.elements.themePreference.value;
        const previewTheme = preference === "system" ? options.resolvedTheme : preference;
        document.body.dataset.theme = previewTheme;
        document.documentElement.style.colorScheme = previewTheme;
        ipcRenderer.send("${SETTINGS_THEME_CHANGE_CHANNEL}", { themePreference: preference });
      }

      for (const input of form.querySelectorAll('input[name="themePreference"]')) {
        input.addEventListener("change", syncThemePreview);
      }
      syncThemePreview();

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        ipcRenderer.send("${SETTINGS_SUBMIT_CHANNEL}", collectResult());
      });
      cancelButton.addEventListener("click", () => ipcRenderer.send("${SETTINGS_CANCEL_CHANNEL}"));
      closeButton.addEventListener("click", () => form.requestSubmit());
      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          ipcRenderer.send("${SETTINGS_CANCEL_CHANNEL}");
        }
      });
    </script>
  </body>
</html>`;
}
