# Multi AI Chat

[English](#english) | [中文](#中文)


<img width="4262" height="2402" alt="63740ae17b879b9fce2ba5895cff9380" src="https://github.com/user-attachments/assets/125006df-266d-4c10-8e0f-615bc66fe7fa" />
<img width="4284" height="2406" alt="45531fda19571148e037a4e11a48d3d5" src="https://github.com/user-attachments/assets/5dc50723-fc7f-428c-ae2c-b524a64fa359" />



---

<a id="中文"></a>

## 中文

一个 macOS Electron 工作台，让你在统一界面中并排使用多个在线 AI 聊天平台。

内置 ChatGPT、Claude、Gemini、DeepSeek，并支持添加自定义平台。每个平台独立登录态，同一平台复用登录。统一 prompt 输入，可一键填入或批量发送到多个平台。

### 功能特性

- **多平台并排**：同时展示多个 AI 平台页面，支持网格与列布局。
- **聚焦模式**：点击进入单平台全屏查看，`Esc` 退出。
- **统一 Prompt**：顶部输入框，支持复制、填入、发送，目标平台可选。
- **自动填入（Beta）**：对内置平台自动定位输入框并填入 prompt。
- **自动发送**：按平台单独开启，批量执行前需二次确认。
- **Prompt 历史**：本地保存，支持关键词搜索、保留策略、一键清空。
- **执行记录**：保存每次执行的动作与结果元数据。
- **自定义平台**：添加名称、URL、图标、User-Agent、登录白名单域名。
- **主题偏好**：明亮、暗黑、跟随系统。
- **本地存储**：所有配置和历史仅保存在本地，不读取、不保存 AI 回复内容。

### 内置平台

| 平台 | 地址 |
| --- | --- |
| ChatGPT | https://chatgpt.com |
| Claude | https://claude.ai |
| Gemini | https://gemini.google.com |
| DeepSeek | https://chat.deepseek.com |

### 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Cmd+Enter` | 对选中平台执行填入/发送 |
| `Cmd+Shift+Enter` | 对所有启用平台执行填入/发送 |
| `Cmd+L` | 聚焦 prompt 输入框 |
| `Cmd+1` / `2` / `3` / `4` | 聚焦第 N 个平台 |
| `Esc` | 退出聚焦模式 |
| `Cmd+F` | 搜索历史 |

### 本地开发

**环境要求**：Node.js 24+、macOS

```bash
# 安装依赖
npm install
```

如果 Electron 二进制下载失败，可使用镜像：

```bash
rm -rf node_modules/electron
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install electron@39.2.7 --save-dev
```

**常用命令**：

```bash
npm run dev      # 启动开发模式
npm test         # 运行测试
npm run build    # 构建生产包
npm run dist:mac # 打包 macOS .dmg / .app
```

### 项目结构

```text
src/
  main/          # 主进程：窗口、WebContentsView、session、权限、IPC、自动化适配器
    autofill/    # 内置平台自动填入适配器（chatgpt/claude/gemini/deepseek）
  renderer/      # 渲染进程：控制台 UI（React）
  shared/        # 共享类型、配置、平台定义
docs/            # PRD、技术方案、开发设置
design-system/   # 设计系统规范
```

### 数据与隐私

- 所有配置和 prompt 历史仅保存在本地（`Application Support/MultiAIChat/`）。
- 每个平台使用独立持久化 session 分区，登录态互相隔离。
- 不读取、不汇总、不保存 AI 回复内容。
- 不接入各平台 API，不管理 API Key，不做云同步。

### 相关文档

- [PRD](docs/PRD.md) — 产品需求文档
- [技术方案](docs/TECHNICAL_DESIGN.md) — 架构与技术选型
- [开发设置](docs/SETUP.md) — 本地环境配置
- [CONTEXT.md](CONTEXT.md) — 领域术语表

---

<a id="english"></a>

## English

A macOS Electron workbench for using multiple online AI chat platforms side by side in a single interface.

Ships with ChatGPT, Claude, Gemini, and DeepSeek built in, and supports adding custom platforms. Each platform has its own isolated login session, with logins reused across views of the same platform. A unified prompt input lets you fill or batch-send to multiple platforms at once.

### Features

- **Multi-platform layout**: Show several AI platforms at once with grid or column layouts.
- **Focus mode**: Click to focus a single platform; `Esc` to exit.
- **Unified prompt**: Top input bar with copy, fill, and send actions; target platforms selectable.
- **Auto-fill (Beta)**: Locates the input box on built-in platforms and fills in the prompt.
- **Auto-send**: Configurable per platform; batch execution requires confirmation.
- **Prompt history**: Saved locally with keyword search, retention policies, and one-click clear.
- **Execution records**: Stores action and result metadata for each run.
- **Custom platforms**: Add name, URL, icon, User-Agent, and auth-domain allowlist.
- **Theme preference**: Light, dark, or follow system.
- **Local-only storage**: All config and history stay on-device; AI replies are never read or stored.

### Built-in Platforms

| Platform | URL |
| --- | --- |
| ChatGPT | https://chatgpt.com |
| Claude | https://claude.ai |
| Gemini | https://gemini.google.com |
| DeepSeek | https://chat.deepseek.com |

### Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Cmd+Enter` | Fill/send to selected platforms |
| `Cmd+Shift+Enter` | Fill/send to all enabled platforms |
| `Cmd+L` | Focus the prompt input |
| `Cmd+1` / `2` / `3` / `4` | Focus the Nth platform |
| `Esc` | Exit focus mode |
| `Cmd+F` | Search history |

### Development

**Requirements**: Node.js 24+, macOS

```bash
# Install dependencies
npm install
```

If the Electron binary download fails, use a mirror:

```bash
rm -rf node_modules/electron
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install electron@39.2.7 --save-dev
```

**Common commands**:

```bash
npm run dev      # Start dev mode
npm test         # Run tests
npm run build    # Build for production
npm run dist:mac # Package macOS .dmg / .app
```

### Project Structure

```text
src/
  main/          # Main process: window, WebContentsView, session, permissions, IPC, auto-fill adapters
    autofill/    # Built-in platform auto-fill adapters (chatgpt/claude/gemini/deepseek)
  renderer/      # Renderer process: console UI (React)
  shared/        # Shared types, config, platform definitions
docs/            # PRD, technical design, setup guide
design-system/   # Design system specs
```

### Data & Privacy

- All config and prompt history are stored locally only (`Application Support/MultiAIChat/`).
- Each platform uses an isolated persistent session partition; logins do not leak across platforms.
- AI reply content is never read, aggregated, or stored.
- No platform APIs are integrated, no API keys are managed, and there is no cloud sync.

### Related Docs

- [PRD](docs/PRD.md) — Product requirements
- [Technical Design](docs/TECHNICAL_DESIGN.md) — Architecture and tech stack
- [Setup](docs/SETUP.md) — Local environment setup
- [CONTEXT.md](CONTEXT.md) — Domain glossary
