# 多 AI 并行聊天客户端技术方案

## 1. 技术选型

第一版采用 Electron。

推荐栈：

- Electron：桌面客户端壳和 Chromium 运行时。
- TypeScript：主进程、预加载脚本、渲染进程统一类型。
- React：应用控制台 UI。
- Vite：渲染进程构建。
- electron-builder：macOS 打包。
- SQLite 或本地 JSON：应用配置、prompt 历史、执行记录。

第一版建议优先使用本地 JSON 落地配置和历史，待历史量、搜索和迁移需求明确后再切换 SQLite。如果实现阶段已经需要更强查询能力，可直接选 SQLite。

## 2. 核心架构

应用分为三层：

- 主进程：窗口管理、`WebContentsView` 管理、session partition、权限、链接拦截、IPC。
- 渲染进程：控制台 UI、平台列表、prompt 输入、历史抽屉、设置页。
- 预加载/适配器：内置平台自动填入和可选发送。

建议目录：

```text
src/
  main/
    index.ts
    windows/
      main-window.ts
      platform-views.ts
    platform/
      providers.ts
      sessions.ts
      navigation-policy.ts
      permissions.ts
    automation/
      runner.ts
      adapters/
        chatgpt.ts
        claude.ts
        gemini.ts
        deepseek.ts
    storage/
      config-store.ts
      prompt-history-store.ts
      execution-log-store.ts
    ipc/
      channels.ts
      handlers.ts
  preload/
    index.ts
    adapters/
      common.ts
  renderer/
    app/
    components/
    stores/
    styles/
  shared/
    types.ts
    constants.ts
```

## 3. 多窗口承载方案

第一版使用 Electron `WebContentsView` 承载各 AI 平台页面。

设计：

- 主窗口是一个普通 `BrowserWindow`。
- 控制台 UI 运行在主窗口 WebContents。
- 每个平台创建一个 `WebContentsView`。
- 主进程负责设置每个 View 的 bounds。
- 渲染进程只发送布局意图，不直接操作远程页面。

布局更新流程：

1. 用户启用或关闭平台。
2. 渲染进程计算当前布局模式和每个平台区域。
3. 渲染进程通过 IPC 将布局矩形发送给主进程。
4. 主进程设置对应 `WebContentsView.setBounds(...)`。
5. 聚焦模式下只展示目标平台 View，其他 View 隐藏或缩小到不可见区域。

## 4. session partition

每个平台使用独立持久化 session。

命名规则：

```ts
persist:provider-chatgpt
persist:provider-claude
persist:provider-gemini
persist:provider-deepseek
persist:custom-{platformId}
```

规则：

- 同平台复用同一个 partition。
- 不同平台禁止共享 partition。
- 自定义平台默认独立 partition。
- 第一版不提供 UI 清除某个平台 partition 数据。

## 5. 平台配置模型

建议类型：

```ts
type PlatformKind = "builtin" | "custom";

type LoginStateMode = "provider" | "window";

interface PlatformConfig {
  id: string;
  kind: PlatformKind;
  name: string;
  url: string;
  enabled: boolean;
  iconUrl?: string;
  userAgent?: string;
  layoutSize?: "small" | "medium" | "large";
  partition: string;
  loginStateMode: LoginStateMode;
  allowedAuthDomains: string[];
  autoFillEnabled: boolean;
  autoSendEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

内置平台：

- `kind` 为 `builtin`。
- 不允许删除，只允许禁用。
- 支持自动填入。
- 可按平台开启自动发送。

自定义平台：

- `kind` 为 `custom`。
- 允许增删改。
- 不支持自动填入和自动发送。

## 6. 导航与外部链接策略

主进程统一处理导航和新窗口请求。

规则：

- 当前平台主域名允许应用内打开。
- `allowedAuthDomains` 内域名允许应用内打开。
- 其他跨域链接调用系统浏览器打开。
- 新窗口请求不直接创建任意窗口，必须经过策略判断。

建议函数：

```ts
interface NavigationDecision {
  action: "allow-in-app" | "open-external" | "deny";
  reason: string;
}

function decideNavigation(platform: PlatformConfig, targetUrl: string): NavigationDecision;
```

需要测试：

- 同域 URL。
- 子域 URL。
- 登录白名单 URL。
- 跨域非白名单 URL。
- 非 http/https URL。

## 7. 权限处理

第一版不做权限管理页，但主进程必须集中处理权限。

策略：

- 使用 Electron session permission handler。
- 默认弹出确认。
- 不做长期记忆。
- 对未知权限默认拒绝或询问。
- 下载行为先保守处理，避免静默落盘。

## 8. 自动化适配器

自动化适配器只面向内置平台。

目标：

- 尝试定位输入框。
- 填入 prompt。
- 如果该平台开启自动发送，则尝试触发发送。
- 返回结构化结果。

不做：

- 不读取回复。
- 不读取用户账号。
- 不绕过验证码。
- 不对自定义平台执行自动化。
- 不开放用户自定义脚本。

建议结果类型：

```ts
type AutomationAction = "copy" | "fill" | "send";
type AutomationStatus = "success" | "failed" | "skipped";

interface PlatformAutomationResult {
  platformId: string;
  action: AutomationAction;
  status: AutomationStatus;
  reason?: string;
  retryCount: number;
  timestamp: string;
}
```

执行策略：

- 最大重试 2 次。
- 重试间隔 1.5 秒。
- 只对可恢复错误重试。
- 不自动刷新页面。
- 最终结果必须回传 UI。
- 失败时复制 prompt 到系统剪贴板。

## 9. 自动发送确认

批量执行前，如果目标平台中存在 `autoSendEnabled = true`，必须弹确认。

确认内容：

- 即将自动发送的平台列表。
- prompt 预览。
- 风险提示。
- 确认和取消按钮。

单平台执行也应在首次开启自动发送时显示风险提示。第一版可不做复杂审计日志，但执行记录中应保存发送动作元数据。

## 10. 本地存储

存储内容：

- 应用设置。
- 平台配置。
- prompt 历史。
- 执行记录元数据。

建议初版文件：

```text
Application Support/MultiAIChat/
  config.json
  prompt-history.json
  execution-log.json
```

如果使用 SQLite：

```text
Application Support/MultiAIChat/app.db
```

prompt 历史模型：

```ts
interface PromptHistoryItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

执行记录模型：

```ts
interface PromptExecutionRecord {
  id: string;
  promptId: string;
  promptSnapshot: string;
  targetPlatformIds: string[];
  results: PlatformAutomationResult[];
  createdAt: string;
}
```

历史保留策略：

```ts
type PromptRetentionPolicy =
  | { type: "forever" }
  | { type: "latest-count"; count: 50 | 200 }
  | { type: "latest-days"; days: 30 }
  | { type: "disabled" };
```

## 11. 快捷键

快捷键分两类：

- 应用级快捷键：由渲染进程处理，必要时通过 IPC 触发主进程动作。
- 平台页面快捷键：由平台网页自身处理，应用不强行覆盖。

第一版快捷键：

- `Cmd+Enter`
- `Cmd+Shift+Enter`
- `Cmd+L`
- `Cmd+1/2/3/4`
- `Esc`
- `Cmd+F`

注意：当焦点在远程平台页面内时，全局快捷键可能需要主进程注册或菜单 accelerator 支持。

## 12. 崩溃恢复

每个平台 View 需要监听：

- 加载失败。
- 渲染进程崩溃。
- 页面无响应。

处理方式：

- UI 显示平台级错误状态。
- 提供重新加载按钮。
- 不自动刷新。
- 不影响其他平台 View。

## 13. 安全基线

远程页面安全要求：

- 禁用 Node 能力。
- 开启上下文隔离。
- 不在远程页面暴露任意主进程 API。
- 不允许远程页面直接访问本地文件。
- 外部链接按策略打开。
- 权限请求集中处理。
- 自定义平台不允许注入脚本。

控制台 UI 和平台远程页面应隔离。控制台可通过 IPC 请求主进程执行平台动作，但不能直接持有远程页面 DOM 权限。

## 14. 打包

建议 npm scripts：

```json
{
  "dev": "electron-vite dev",
  "build": "electron-vite build",
  "dist:mac": "electron-builder --mac"
}
```

第一版打包要求：

- 产出 `.app` 或 `.dmg`。
- 打包后可双击运行。
- 打包后本地配置和登录态可持久化。
- 不要求签名和公证。

## 15. 测试方案

自动化测试：

- 平台配置默认值。
- 自定义平台增删改。
- partition 命名和隔离规则。
- URL 白名单决策。
- prompt 历史保存和搜索。
- 执行记录保存。
- 历史保留策略。
- 快捷键动作映射。

手工测试：

- 四个内置平台真实登录。
- 多平台并排加载。
- 聚焦模式。
- 自动填入 Beta。
- 自动发送确认。
- 失败重试与降级复制。
- 外部链接打开策略。
- 崩溃或加载失败后的重试入口。
- macOS 打包产物启动。

## 16. 实现顺序建议

第一阶段：工程骨架和主窗口。

- 初始化 Electron + React + TypeScript。
- 创建主窗口和控制台 UI。
- 添加内置平台配置。
- 实现平台启用状态和网格布局。

第二阶段：`WebContentsView` 和 session。

- 创建平台 View。
- 按平台设置 partition。
- 实现布局 bounds 同步。
- 实现聚焦模式。

第三阶段：本地存储。

- 平台配置持久化。
- prompt 历史保存和搜索。
- 执行记录元数据保存。

第四阶段：导航、安全、权限。

- 链接策略。
- 登录白名单。
- 权限询问。
- 新窗口拦截。

第五阶段：自动化适配器。

- ChatGPT 自动填入。
- Claude 自动填入。
- Gemini 自动填入。
- DeepSeek 自动填入。
- 自动发送开关和确认。
- 失败重试与复制兜底。

第六阶段：打包与验收。

- macOS 打包。
- 自动化测试。
- 手工验收清单。
- 修复真实平台兼容问题。

