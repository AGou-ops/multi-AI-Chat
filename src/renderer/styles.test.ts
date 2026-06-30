import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/renderer/styles.css"), "utf8");

describe("工作台暗黑主题样式", () => {
  it("未选中的布局模式和自动发送目标文字保持可读", () => {
    expect(styles).toContain(`.app-shell[data-theme="dark"] .layout-mode-toolbar .toolbar-toggle,
.app-shell[data-theme="dark"] .auto-send-toggle {
  color: #ffffff;
}`);
  });

  it("右侧历史面板内容文字在暗黑主题下使用白色", () => {
    expect(styles).toContain(`.app-shell[data-theme="dark"] .history-header span,
.app-shell[data-theme="dark"] .history-empty,
.app-shell[data-theme="dark"] .execution-item-header strong,
.app-shell[data-theme="dark"] .execution-item p,
.app-shell[data-theme="dark"] .history-item {
  color: #ffffff;
}`);
  });
});
