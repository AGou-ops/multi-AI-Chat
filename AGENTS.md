# Agent Instructions

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The repo uses the default triage label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo: read root `CONTEXT.md` and relevant ADRs under `docs/adr/` when they exist. See `docs/agents/domain.md`.

### Git completion workflow

After completing any feature implementation or bug fix, the agent must automatically run `git add` for only the files changed by that task and create a local commit. Do not automatically push unless the user explicitly asks for it.

Commit messages must be written in English only and must follow this exact format:

```text
<type>(<scope>): <summary>
```

- `<type>` must be one of `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, or `ci`.
- `<scope>` must be a short lowercase area name using only `a-z`, `0-9`, and hyphens.
- `<summary>` must be imperative, start with a lowercase letter, contain no trailing period, and stay within 72 characters including the prefix.
- Do not use Chinese or mixed-language text in the commit subject, body, or footer.
- If a body is necessary, keep it in English, wrap lines at 72 characters, and describe what changed and why.

### Frontend implementation

Frontend work must use test-driven development by vertical slices: write one behavior test, implement the smallest user-visible path, get it green, then continue. Do not write a batch of imagined tests before implementation.

When implementing page design, read `design-system/multi-ai-chat/MASTER.md` first, then read the relevant page override under `design-system/multi-ai-chat/pages/` when it exists. For the main workbench UI, `design-system/multi-ai-chat/pages/workbench.md` overrides the generated master pattern.

Use a dense, restrained productivity-workbench UI. Prefer semantic HTML, visible focus states, labeled form controls, `aria-live` for async platform results, and Lucide or the existing icon set. Do not use emoji as UI icons.

### 统一弹窗样式

所有新增或调整的工作台弹窗必须严格复用设置弹窗的统一视觉骨架，不允许为单个弹窗另起一套孤立样式。弹窗容器使用 `.settings-dialog` 作为基础外观，标题栏使用 `.dialog-header` + `.settings-title`，内容区使用 `.settings-dialog-body`，表单或设置分组使用 `.settings-section`、`.settings-section-heading`、`.settings-field`，底部操作区使用 `.dialog-footer`。

独立 `BrowserWindow` 或 `data:` HTML 弹窗也必须按上述结构和 token 复刻设置弹窗样式，并接收当前工作台解析后的 `light` / `dark` 主题，保证背景、边框、标题、分区、输入框和按钮都与设置弹窗一致；可以叠加业务语义类名，例如 `.add-platform-dialog`，但不得替代统一骨架。禁止新增 `.shell`、裸 `h1/form/label` 全局样式、独立按钮体系或与设置弹窗冲突的弹窗配色。凡是需要覆盖 AI 平台 `WebContentsView` 的设置类弹窗，必须像添加自定义平台一样使用独立宿主 `BrowserWindow` 弹窗，保持背景 AI chat 原样显示；不要在主窗口 React DOM 里做弹层，也不要通过 `hidePlatformViews` 隐藏背景平台视图来规避遮挡。确有业务差异时，只能在统一骨架上做局部尺寸或布局补充，并补一条能捕获样式统一性、主题同步性、宿主弹窗入口和背景平台视图保持显示的回归测试。
