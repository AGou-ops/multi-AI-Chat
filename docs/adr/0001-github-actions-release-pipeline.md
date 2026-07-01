# GitHub Actions 发布流水线

Multi AI Chat 的 macOS 安装包由 GitHub Actions 在 `macos-latest` 上执行 `npm ci`、`npm test` 和 `npm run dist:mac` 生成；普通 `push` 只保留 workflow artifact，只有 `v*` tag 推送才创建 GitHub Release、上传同一批安装制品，并用 tag 区间的 Git 提交记录生成 Release ChangeLog。这样可以让每次提交都有可下载的临时验证产物，同时把面向用户的 Release 边界收敛到显式 tag，避免普通分支提交污染发布区。
