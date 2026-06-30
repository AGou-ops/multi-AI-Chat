# 本地开发设置

## 安装依赖

```bash
npm install
```

如果 Electron 二进制下载很慢或安装后出现 `Electron failed to install correctly`，可以用镜像重装 Electron：

```bash
rm -rf node_modules/electron
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install electron@39.2.7 --save-dev
```

如果下载完成但本地 `node_modules/electron/dist` 不完整，可重新运行安装脚本：

```bash
DEBUG='@electron/get*' ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ force_no_cache=true node node_modules/electron/install.js
```

## 常用命令

```bash
npm test
npm run build
npm run dev
```
