import {
  AlertTriangle,
  CheckCheck,
  Columns3,
  Copy,
  LayoutGrid,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ThemePreference } from "../shared/config";
import type { PlatformExecutionResult, PromptExecutionRecord } from "../shared/execution-record";
import type { PlatformLoadingState } from "../shared/platform-loading";
import type { PlatformLayoutMode, PlatformViewBounds } from "../shared/platformLayout";
import { generatePlatformId, validateCustomPlatform } from "../shared/platformValidation";
import { builtInPlatforms, initialPlatform } from "../shared/platforms";
import { defaultPromptRetentionPolicy, type PromptHistoryItem, type PromptRetentionPolicy } from "../shared/prompt-history";
import type { PlatformConfig } from "../shared/types";
import "./styles.css";

interface DisplayPlatform {
  id: string;
  name: string;
  url: string;
  kind: "builtin" | "custom";
}

const MAX_ENABLED_PLATFORMS = 4;

function toDisplayPlatforms(): DisplayPlatform[] {
  const builtIn: DisplayPlatform[] = builtInPlatforms.map((p) => ({
    id: p.id,
    name: p.name,
    url: p.url,
    kind: "builtin"
  }));
  return builtIn;
}

export function App() {
  const [enabledPlatformIds, setEnabledPlatformIds] = useState<string[]>([initialPlatform.id]);
  const [customPlatforms, setCustomPlatforms] = useState<PlatformConfig[]>([]);
  const [focusedPlatformId, setFocusedPlatformId] = useState<string | null>(null);
  const [platformLayoutMode, setPlatformLayoutMode] = useState<PlatformLayoutMode>("grid");
  const [prompt, setPrompt] = useState("");
  const [promptStatus, setPromptStatus] = useState("");
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([]);
  const [executionRecords, setExecutionRecords] = useState<PromptExecutionRecord[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [promptRetentionPolicy, setPromptRetentionPolicy] =
    useState<PromptRetentionPolicy>(defaultPromptRetentionPolicy);
  const [autoSendPlatformIds, setAutoSendPlatformIds] = useState<string[]>([]);
  const [autoClearPromptEnabled, setAutoClearPromptEnabled] = useState(true);
  const [loadingPlatformIds, setLoadingPlatformIds] = useState<Set<string>>(new Set());
  const [isPlatformSidebarOpen, setIsPlatformSidebarOpen] = useState(true);
  const [isPromptHistorySidebarOpen, setIsPromptHistorySidebarOpen] = useState(true);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const historySearchRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const platformViewHostRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const loadConfig = async () => {
      const config = await window.multiAIChat?.getConfig();
      if (config) {
        if (config.enabledPlatformIds) {
          setEnabledPlatformIds(config.enabledPlatformIds);
        }
        if (config.customPlatforms) {
          setCustomPlatforms(config.customPlatforms);
        }
        if (config.promptRetentionPolicy) {
          setPromptRetentionPolicy(config.promptRetentionPolicy);
        }
        if (config.autoSendEnabledPlatformIds) {
          setAutoSendPlatformIds(config.autoSendEnabledPlatformIds);
        }
        if (typeof config.autoClearPromptEnabled === "boolean") {
          setAutoClearPromptEnabled(config.autoClearPromptEnabled);
        }
        if (config.platformLayoutMode) {
          setPlatformLayoutMode(config.platformLayoutMode);
        }
        if (config.themePreference) {
          setThemePreference(config.themePreference);
        }
      }
      const history = await window.multiAIChat?.listPromptHistory();
      if (history) {
        setPromptHistory(history);
      }
    };
    void loadConfig();
  }, []);

  useEffect(() => {
    const unsubscribe = window.multiAIChat?.onPlatformLoadingState?.((state) => {
      updatePlatformLoadingState(state);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.multiAIChat?.onThemePreferenceChanged?.((nextThemePreference) => {
      setThemePreference(nextThemePreference);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");

    syncSystemTheme();
    mediaQuery.addEventListener?.("change", syncSystemTheme);

    return () => {
      mediaQuery.removeEventListener?.("change", syncSystemTheme);
    };
  }, []);

  const allPlatforms = useMemo<DisplayPlatform[]>(() => {
    const builtIn = toDisplayPlatforms();
    const custom: DisplayPlatform[] = customPlatforms.map((p) => ({
      id: p.id,
      name: p.name,
      url: p.url,
      kind: "custom"
    }));
    return [...builtIn, ...custom];
  }, [customPlatforms]);

  const enabledPlatforms = useMemo(
    () => allPlatforms.filter((platform) => enabledPlatformIds.includes(platform.id)),
    [allPlatforms, enabledPlatformIds]
  );
  const visiblePlatforms = useMemo(
    () => enabledPlatforms.filter((platform) => focusedPlatformId === null || platform.id === focusedPlatformId),
    [enabledPlatforms, focusedPlatformId]
  );
  const autoSendPlatforms = useMemo(
    () => enabledPlatforms,
    [enabledPlatforms]
  );
  const activeAutoSendPlatformIds = useMemo(() => {
    const enabledAutoSendPlatformIds = new Set(autoSendPlatforms.map((platform) => platform.id));
    return autoSendPlatformIds.filter((id) => enabledAutoSendPlatformIds.has(id));
  }, [autoSendPlatformIds, autoSendPlatforms]);
  const isAllAutoSendPlatformsSelected =
    autoSendPlatforms.length > 0 && activeAutoSendPlatformIds.length === autoSendPlatforms.length;

  useLayoutEffect(() => {
    const collectVisiblePlatformBounds = (): Partial<Record<string, PlatformViewBounds>> | undefined => {
      const boundsEntries = visiblePlatforms.flatMap((platform) => {
        const host = platformViewHostRefs.current.get(platform.id);

        if (!host) {
          return [];
        }

        const rect = host.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) {
          return [];
        }

        return [[
          platform.id,
          {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          } satisfies PlatformViewBounds
        ]];
      });

      if (boundsEntries.length === 0) {
        return undefined;
      }

      return Object.fromEntries(boundsEntries);
    };

    const syncPlatformLayout = () => {
      window.multiAIChat?.setPlatformLayout({
        enabledPlatformIds,
        focusedPlatformId,
        mode: platformLayoutMode,
        visiblePlatformBounds: collectVisiblePlatformBounds(),
        hidePlatformViews: false
      });
    };

    syncPlatformLayout();

    const workspace = workspaceRef.current;

    if (!workspace || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      syncPlatformLayout();
    });

    observer.observe(workspace);

    for (const host of platformViewHostRefs.current.values()) {
      observer.observe(host);
    }

    return () => {
      observer.disconnect();
    };
  }, [enabledPlatformIds, focusedPlatformId, platformLayoutMode, visiblePlatforms]);

  function setPlatformViewHostRef(platformId: string, node: HTMLDivElement | null) {
    if (node) {
      platformViewHostRefs.current.set(platformId, node);
      return;
    }

    platformViewHostRefs.current.delete(platformId);
  }

  function handleLayoutModeChange(mode: PlatformLayoutMode) {
    setPlatformLayoutMode(mode);
    void window.multiAIChat?.updateConfig({ platformLayoutMode: mode });
  }

  function handleWindowTitlebarKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    void window.multiAIChat?.toggleWindowMaximize();
  }

  function togglePlatform(platformId: string) {
    setEnabledPlatformIds((current) => {
      let next: string[];

      if (current.includes(platformId)) {
        if (current.length === 1) {
          return current;
        }

        if (focusedPlatformId === platformId) {
          setFocusedPlatformId(null);
        }

        next = current.filter((id) => id !== platformId);
      } else {
        if (current.length >= MAX_ENABLED_PLATFORMS) {
          void window.multiAIChat?.showPlatformLimitDialog();
          return current;
        }

        next = [...current, platformId];
      }

      void window.multiAIChat?.updateConfig({ enabledPlatformIds: next });
      return next;
    });
  }

  async function openAddForm() {
    const existingIds = allPlatforms.map((p) => p.id);
    const existingUrls = allPlatforms.map((p) => p.url);
    const input = await window.multiAIChat?.openAddPlatformDialog({ existingUrls, theme: resolvedTheme });

    if (!input) {
      return;
    }

    const errors = validateCustomPlatform(input, existingIds, existingUrls);
    if (Object.keys(errors).length > 0) {
      setPromptStatus(errors.name ?? errors.url ?? "自定义平台配置无效");
      return;
    }

    const id = generatePlatformId(input.name);
    const newPlatform: PlatformConfig = {
      id,
      kind: "custom",
      name: input.name.trim(),
      url: input.url.trim(),
      partition: `persist:custom-${id}`,
      allowedAuthDomains: [],
      autoFillEnabled: false,
      autoSendEnabled: false
    };

    void window.multiAIChat?.addCustomPlatform(newPlatform).then(() => {
      setCustomPlatforms((prev) => [...prev, newPlatform]);
    });
  }

  function handleDeleteCustomPlatform(platformId: string) {
    void window.multiAIChat?.removeCustomPlatform(platformId).then(() => {
      setCustomPlatforms((prev) => prev.filter((p) => p.id !== platformId));
      setEnabledPlatformIds((current) => {
        const next = current.filter((id) => id !== platformId);
        if (next.length === 0) {
          return [initialPlatform.id];
        }
        void window.multiAIChat?.updateConfig({ enabledPlatformIds: next });
        return next;
      });
      if (focusedPlatformId === platformId) {
        setFocusedPlatformId(null);
      }
    });
  }

  async function handleCopyPrompt() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setPromptStatus("Prompt 为空，未复制");
      return;
    }

    await window.multiAIChat?.copyPrompt(trimmedPrompt);
    const history = await window.multiAIChat?.savePrompt(trimmedPrompt);
    if (history) {
      setPromptHistory(history);
    }
    setPromptStatus("已复制并保存到本地历史");
  }

  async function handleHistorySearch(query: string) {
    setHistoryQuery(query);
    const history = await window.multiAIChat?.listPromptHistory(query);
    if (history) {
      setPromptHistory(history);
    }
  }

  async function handleClearHistory() {
    const history = await window.multiAIChat?.clearPromptHistory();
    if (history) {
      setPromptHistory(history);
    }
  }

  async function handleExecutePrompt() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setPromptStatus("Prompt 为空，无法执行填入");
      return;
    }

    const autoSendTargets = activeAutoSendPlatformIds;

    if (autoSendTargets.length > 0) {
      const confirmed = await window.multiAIChat?.confirmBatchSend(enabledPlatformIds, autoSendTargets, trimmedPrompt);

      if (!confirmed) {
        setPromptStatus("已取消自动发送");
        return;
      }
    }

    const response = await window.multiAIChat?.executePrompt(trimmedPrompt, enabledPlatformIds, autoSendTargets);

    if (!response) {
      setPromptStatus("执行记录写入失败，请稍后重试");
      return;
    }

    setExecutionRecords((prev) => [response.record, ...prev]);
    setPromptHistory(response.promptHistory);
    if (autoClearPromptEnabled) {
      setPrompt("");
    }
    setPromptStatus(`已记录 ${response.record.results.length} 个平台结果。`);
  }

  function handleRetentionChange(value: string) {
    const nextPolicy = retentionPolicyFromValue(value);
    setPromptRetentionPolicy(nextPolicy);
    void window.multiAIChat?.updateConfig({ promptRetentionPolicy: nextPolicy });
  }

  function handleAutoSendToggle(platformId: string) {
    setAutoSendPlatformIds(() => {
      const next = activeAutoSendPlatformIds.includes(platformId)
        ? activeAutoSendPlatformIds.filter((id) => id !== platformId)
        : [...activeAutoSendPlatformIds, platformId];

      void window.multiAIChat?.updateConfig({ autoSendEnabledPlatformIds: next });
      return next;
    });
    setPromptStatus("自动发送设置已更新");
  }

  function handleToggleAllAutoSendPlatforms() {
    const next = isAllAutoSendPlatformsSelected ? [] : autoSendPlatforms.map((platform) => platform.id);
    setAutoSendPlatformIds(next);
    void window.multiAIChat?.updateConfig({ autoSendEnabledPlatformIds: next });
    setPromptStatus(isAllAutoSendPlatformsSelected ? "已取消全选自动发送目标" : "已全选当前打开平台作为自动发送目标");
  }

  async function openSettingsDialog() {
    const result = await window.multiAIChat?.openSettingsDialog?.({
      themePreference,
      resolvedTheme,
      platformLayoutMode,
      promptRetentionPolicy,
      autoClearPromptEnabled,
      autoSendEnabledPlatformIds: activeAutoSendPlatformIds,
      autoSendPlatforms: autoSendPlatforms.map((platform) => ({ id: platform.id, name: platform.name }))
    });

    if (!result) {
      settingsButtonRef.current?.focus();
      return;
    }

    setThemePreference(result.themePreference);
    setPlatformLayoutMode(result.platformLayoutMode);
    setPromptRetentionPolicy(result.promptRetentionPolicy);
    setAutoClearPromptEnabled(result.autoClearPromptEnabled);
    setAutoSendPlatformIds(result.autoSendEnabledPlatformIds);
    await window.multiAIChat?.updateConfig({
      themePreference: result.themePreference,
      platformLayoutMode: result.platformLayoutMode,
      promptRetentionPolicy: result.promptRetentionPolicy,
      autoClearPromptEnabled: result.autoClearPromptEnabled,
      autoSendEnabledPlatformIds: result.autoSendEnabledPlatformIds
    });
    setPromptStatus("工作台偏好已更新");
    settingsButtonRef.current?.focus();
  }

  function handleReloadPlatform(platformId: string) {
    updatePlatformLoadingState({ platformId, isLoading: true });
    void (window.multiAIChat?.reloadPlatform(platformId) ?? Promise.resolve()).finally(() => {
      updatePlatformLoadingState({ platformId, isLoading: false });
    });
    setPromptStatus(`正在重新加载 ${allPlatforms.find((p) => p.id === platformId)?.name ?? platformId}...`);
  }

  function updatePlatformLoadingState(state: PlatformLoadingState) {
    setLoadingPlatformIds((prev) => {
      const next = new Set(prev);

      if (state.isLoading) {
        next.add(state.platformId);
      } else {
        next.delete(state.platformId);
      }

      return next;
    });
  }

  function restorePromptFromExecution(record: PromptExecutionRecord) {
    setPrompt(record.promptSnapshot);
    setPromptStatus("已从最近执行恢复 Prompt");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;

    if (mod && !e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      void handleExecutePrompt();
      return;
    }

    if (mod && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      void handleExecutePrompt();
      return;
    }

    if (mod && e.key === "l") {
      e.preventDefault();
      promptInputRef.current?.focus();
      return;
    }

    if (mod && e.key === "f") {
      e.preventDefault();
      historySearchRef.current?.focus();
      return;
    }

    if (e.key === "Escape" && focusedPlatformId) {
      e.preventDefault();
      setFocusedPlatformId(null);
      return;
    }

    if (mod && ["1", "2", "3", "4"].includes(e.key) && !focusedPlatformId) {
      e.preventDefault();
      const index = parseInt(e.key, 10) - 1;
      const platform = visiblePlatforms[index];
      if (platform) {
        setFocusedPlatformId(platform.id);
      }
    }
  }

  const latestExecution = executionRecords[0] ?? null;
  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;
  const latestResultByPlatformId = useMemo(() => {
    if (!latestExecution) {
      return new Map<string, PlatformExecutionResult>();
    }

    return new Map(latestExecution.results.map((result) => [result.platformId, result]));
  }, [latestExecution]);

  return (
    <div
      className={[
        "app-shell",
        !isPlatformSidebarOpen ? "is-platform-sidebar-collapsed" : "",
        !isPromptHistorySidebarOpen ? "is-history-sidebar-collapsed" : ""
      ].filter(Boolean).join(" ")}
      data-theme={resolvedTheme}
      data-theme-preference={themePreference}
      onKeyDown={handleKeyDown}
    >
      {isPlatformSidebarOpen ? (
      <nav className="platform-rail has-titlebar-safe-area" aria-label="AI 平台">
        <div
          className="window-titlebar-region"
          role="button"
          tabIndex={0}
          aria-label="双击切换窗口大小"
          title="双击切换窗口大小"
          onDoubleClick={() => void window.multiAIChat?.toggleWindowMaximize()}
          onKeyDown={handleWindowTitlebarKeyDown}
        />
        <div className="rail-header">
          <div className="pane-title">
            <PanelLeft aria-hidden="true" size={18} />
            <span>平台</span>
          </div>
          <button
            className="pane-toggle-button"
            type="button"
            aria-label="隐藏平台侧边栏"
            title="隐藏平台侧边栏"
            onClick={() => setIsPlatformSidebarOpen(false)}
          >
            <PanelLeftClose aria-hidden="true" size={16} />
          </button>
        </div>

        <ul className="platform-list" aria-label="内置平台">
          {builtInPlatforms.map((platform) => (
            <li key={platform.id}>
              <button
                className={enabledPlatformIds.includes(platform.id) ? "platform-button is-active" : "platform-button"}
                type="button"
                aria-pressed={enabledPlatformIds.includes(platform.id)}
                onClick={() => togglePlatform(platform.id)}
              >
                <span className="platform-dot" aria-hidden="true" />
                <span>{platform.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {customPlatforms.length > 0 ? (
          <ul className="platform-list" aria-label="自定义平台">
            {customPlatforms.map((platform) => (
              <li key={platform.id} className="custom-platform-item">
                <button
                  className={enabledPlatformIds.includes(platform.id) ? "platform-button is-active" : "platform-button"}
                  type="button"
                  aria-pressed={enabledPlatformIds.includes(platform.id)}
                  onClick={() => togglePlatform(platform.id)}
                >
                  <span className="platform-dot platform-dot-custom" aria-hidden="true" />
                  <span>{platform.name}</span>
                </button>
                <button
                  className="custom-delete-button"
                  type="button"
                  aria-label={`删除 ${platform.name}`}
                  title={`删除 ${platform.name}`}
                  onClick={() => handleDeleteCustomPlatform(platform.id)}
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button className="rail-add" type="button" aria-label="添加自定义平台" onClick={openAddForm}>
          <Plus aria-hidden="true" size={16} />
          <span>添加自定义平台</span>
        </button>

        {!focusedPlatformId && enabledPlatforms.length > 1 ? (
          <div className="rail-layout-mode" role="group" aria-label="布局模式">
            <span className="rail-layout-mode-label">布局模式</span>
            <div className="layout-mode-toolbar">
              <button
                className={platformLayoutMode === "grid" ? "toolbar-toggle is-active" : "toolbar-toggle"}
                type="button"
                aria-pressed={platformLayoutMode === "grid"}
                aria-label="切换为网格布局"
                onClick={() => handleLayoutModeChange("grid")}
              >
                <LayoutGrid aria-hidden="true" size={15} />
                <span>网格</span>
              </button>
              <button
                className={platformLayoutMode === "columns" ? "toolbar-toggle is-active" : "toolbar-toggle"}
                type="button"
                aria-pressed={platformLayoutMode === "columns"}
                aria-label="切换为垂直布局"
                onClick={() => handleLayoutModeChange("columns")}
              >
                <Columns3 aria-hidden="true" size={15} />
                <span>垂直</span>
              </button>
            </div>
          </div>
        ) : null}

        <button
          className="rail-settings"
          type="button"
          aria-label="打开设置"
          onClick={() => void openSettingsDialog()}
          ref={settingsButtonRef}
        >
          <Settings aria-hidden="true" size={16} />
          <span>设置</span>
        </button>
      </nav>
      ) : (
        <div className="collapsed-sidebar platform-sidebar-toggle has-titlebar-safe-area">
          <div
            className="window-titlebar-region"
            role="button"
            tabIndex={0}
            aria-label="双击切换窗口大小"
            title="双击切换窗口大小"
            onDoubleClick={() => void window.multiAIChat?.toggleWindowMaximize()}
            onKeyDown={handleWindowTitlebarKeyDown}
          />
          <button
            className="pane-toggle-button"
            type="button"
            aria-label="展开平台侧边栏"
            title="展开平台侧边栏"
            onClick={() => setIsPlatformSidebarOpen(true)}
          >
            <PanelLeftOpen aria-hidden="true" size={18} />
          </button>
        </div>
      )}

      <section className="workbench">
        <main
          className="platform-workspace"
          aria-label="平台工作区"
          ref={workspaceRef}
          data-layout-count={enabledPlatforms.length}
          data-layout-mode={platformLayoutMode}
          data-focus-platform={focusedPlatformId ?? undefined}
        >
          <div
            className={[
              "platform-grid",
              focusedPlatformId ? "is-focused" : "",
              platformLayoutMode === "columns" ? "is-columns" : ""
            ].filter(Boolean).join(" ")}
            data-grid-count={visiblePlatforms.length}
          >
            {visiblePlatforms.map((platform) => {
              const latestResult = latestResultByPlatformId.get(platform.id);
              const isPlatformLoading = loadingPlatformIds.has(platform.id);
              const statusMeta = isPlatformLoading
                ? { label: "加载中", className: "is-loading" }
                : latestResult
                  ? statusMetaFromResult(latestResult)
                  : defaultStatusMeta();

              return (
                <section className="platform-frame" aria-label={`${platform.name} 视图`} key={platform.id}>
                  <div className="platform-titlebar">
                    <div className="platform-title-meta">
                      <div className="platform-title-main">
                        <strong>{platform.name}</strong>
                        <span className={`status-pill ${statusMeta.className}`} aria-live="polite">
                          {statusMeta.label}
                        </span>
                        {!isPlatformLoading && latestResult?.status === "failed" ? (
                          <span className="status-pill is-failed" aria-label="加载失败">
                            <AlertTriangle aria-hidden="true" size={12} />
                            <span>加载失败</span>
                          </span>
                        ) : null}
                      </div>
                      <span className="platform-url">{platform.url}</span>
                    </div>
                    <div className="platform-titlebar-actions">
                      <button
                        className="frame-icon-button"
                        type="button"
                        aria-label={`重新加载 ${platform.name}`}
                        title={`重新加载 ${platform.name}`}
                        disabled={isPlatformLoading}
                        onClick={() => handleReloadPlatform(platform.id)}
                      >
                        <RefreshCw aria-hidden="true" size={14} className={isPlatformLoading ? "spinning" : ""} />
                      </button>
                      {focusedPlatformId === platform.id ? (
                        <button className="exit-focus-button" type="button" onClick={() => setFocusedPlatformId(null)}>
                          <Minimize2 aria-hidden="true" size={15} />
                          <span>退出聚焦模式</span>
                        </button>
                      ) : null}
                    </div>
                    {isPlatformLoading ? (
                      <div
                        className="platform-load-progress"
                        role="progressbar"
                        aria-label={`${platform.name} 加载进度`}
                        aria-valuetext="正在加载"
                      />
                    ) : null}
                  </div>
                  {focusedPlatformId !== platform.id ? (
                    <button
                      className="frame-icon-button frame-focus-button"
                      type="button"
                      aria-label={`聚焦 ${platform.name}`}
                      title={`聚焦 ${platform.name}`}
                      onClick={() => setFocusedPlatformId(platform.id)}
                    >
                      <Maximize2 aria-hidden="true" size={15} />
                    </button>
                  ) : null}
                  <div
                    className="platform-view-placeholder"
                    data-platform-view-host={platform.id}
                    ref={(node) => setPlatformViewHostRef(platform.id, node)}
                  >
                    <p>Chromium 平台视图会显示在此区域。</p>
                  </div>
                </section>
              );
            })}
          </div>
        </main>

        <footer className="prompt-bar">
          <label className="prompt-label" htmlFor="prompt-input">
            AI 也会犯错，谨记。
          </label>
          <textarea
            id="prompt-input"
            className="prompt-input"
            ref={promptInputRef}
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="在这里输入要发送给多个 AI 平台的 prompt"
          />
          <div className="prompt-actions" aria-label="Prompt 操作">
            <button className="icon-button" type="button" aria-label="复制 Prompt" title="复制 Prompt" onClick={handleCopyPrompt}>
              <Copy aria-hidden="true" size={17} />
            </button>
            <button className="primary-action" type="button" onClick={handleExecutePrompt}>
              <Send aria-hidden="true" size={16} />
              <span>填入已启用平台</span>
            </button>
          </div>
          <div className="auto-send-section" aria-label="自动发送设置">
            <button
              className="auto-send-select-all"
              type="button"
              aria-label={isAllAutoSendPlatformsSelected ? "取消全选自动发送平台" : "全选自动发送平台"}
              onClick={handleToggleAllAutoSendPlatforms}
              disabled={autoSendPlatforms.length === 0}
            >
              <CheckCheck aria-hidden="true" size={14} />
              <span>{isAllAutoSendPlatformsSelected ? "取消全选" : "全选"}</span>
            </button>
            {autoSendPlatforms.map((platform) => {
              const isEnabled = activeAutoSendPlatformIds.includes(platform.id);
              return (
                <label key={platform.id} className="auto-send-toggle">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleAutoSendToggle(platform.id)}
                  />
                  <span>自动发送 {platform.name}</span>
                </label>
              );
            })}
            {activeAutoSendPlatformIds.length > 0 ? (
              <span className="auto-send-warning" aria-live="polite">
                已开启自动发送的 AI 平台将在填入后自动发送 prompt，请谨慎使用。
              </span>
            ) : null}
          </div>
          <p className="prompt-status" aria-live="polite">
            {promptStatus}
          </p>
        </footer>
      </section>

      {isPromptHistorySidebarOpen ? (
      <aside className="history-drawer" aria-label="Prompt 历史">
        <div className="history-header">
          <h2>Prompt 历史</h2>
          <div className="history-header-actions">
            <span>{promptHistory.length} 条</span>
            <button
              className="pane-toggle-button"
              type="button"
              aria-label="隐藏 Prompt 历史侧边栏"
              title="隐藏 Prompt 历史侧边栏"
              onClick={() => setIsPromptHistorySidebarOpen(false)}
            >
              <PanelRightClose aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
        <div className="history-controls">
          <label htmlFor="prompt-history-search">搜索 Prompt 历史</label>
          <input
            id="prompt-history-search"
            ref={historySearchRef}
            type="search"
            value={historyQuery}
            onChange={(e) => void handleHistorySearch(e.target.value)}
            placeholder="关键词"
          />
          <label htmlFor="prompt-retention">历史保留策略</label>
          <select
            id="prompt-retention"
            value={retentionPolicyToValue(promptRetentionPolicy)}
            onChange={(e) => handleRetentionChange(e.target.value)}
          >
            <option value="forever">永久保存</option>
            <option value="latest-50">最近 50 条</option>
            <option value="latest-200">最近 200 条</option>
            <option value="latest-30-days">最近 30 天</option>
            <option value="disabled">不保存</option>
          </select>
          <button className="icon-button" type="button" onClick={handleClearHistory}>
            清空历史
          </button>
        </div>
        <div className="history-content">
          <section className="execution-section" aria-live="polite">
            <div className="section-header">
              <h3>最近执行</h3>
            </div>
            {latestExecution ? (
              <ul className="execution-list">
                {latestExecution.results.map((result) => {
                  const platformName = allPlatforms.find((platform) => platform.id === result.platformId)?.name ?? result.platformId;
                  const statusMeta = statusMetaFromResult(result);

                  return (
                    <li key={`${latestExecution.id}-${result.platformId}`} className="execution-item">
                      <button
                        className="execution-item-button"
                        type="button"
                        onClick={() => restorePromptFromExecution(latestExecution)}
                        aria-label={`恢复 ${platformName} 的执行 Prompt`}
                      >
                        <div className="execution-item-header">
                          <strong>{platformName}</strong>
                          <span className={`status-pill ${statusMeta.className}`}>{statusMeta.label}</span>
                        </div>
                        <p>{result.reason ?? "执行完成"}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="history-empty">暂无执行记录</p>
            )}
          </section>

          <section className="prompt-history-section">
            <div className="section-header">
              <h3>Prompt 历史</h3>
            </div>
            {promptHistory.length > 0 ? (
              <ul className="history-list">
                {promptHistory.map((item) => (
                  <li key={item.id}>
                    <button className="history-item" type="button" onClick={() => setPrompt(item.content)}>
                      {item.content}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="history-empty">暂无本地历史</p>
            )}
          </section>
        </div>
      </aside>
      ) : (
        <div className="collapsed-sidebar history-sidebar-toggle">
          <button
            className="pane-toggle-button"
            type="button"
            aria-label="展开 Prompt 历史侧边栏"
            title="展开 Prompt 历史侧边栏"
            onClick={() => setIsPromptHistorySidebarOpen(true)}
          >
            <PanelRightOpen aria-hidden="true" size={18} />
          </button>
        </div>
      )}

    </div>
  );
}

function defaultStatusMeta() {
  return {
    label: "待执行",
    className: "is-pending"
  };
}

function statusMetaFromResult(result: PlatformExecutionResult) {
  if (result.status === "success") {
    return {
      label: "已完成",
      className: "is-success"
    };
  }

  if (result.status === "failed") {
    return {
      label: "执行失败",
      className: "is-failed"
    };
  }

  return {
    label: "待手动操作",
    className: "is-skipped"
  };
}

function retentionPolicyToValue(policy: PromptRetentionPolicy): string {
  if (policy.type === "forever") {
    return "forever";
  }

  if (policy.type === "latest-count") {
    return policy.count === 50 ? "latest-50" : "latest-200";
  }

  if (policy.type === "latest-days") {
    return "latest-30-days";
  }

  return "disabled";
}

function retentionPolicyFromValue(value: string): PromptRetentionPolicy {
  if (value === "latest-50") {
    return { type: "latest-count", count: 50 };
  }

  if (value === "latest-200") {
    return { type: "latest-count", count: 200 };
  }

  if (value === "latest-30-days") {
    return { type: "latest-days", days: 30 };
  }

  if (value === "disabled") {
    return { type: "disabled" };
  }

  return { type: "forever" };
}
