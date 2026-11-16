# 宜昌 · 街角幻境

- 从磁盘双击 `dist/index.html` 时，浏览器通过 `file://` 打开页面。入口使用随仓库交付的 `dist/js/local.bundle.js`，避免浏览器拦截本地 ES 模块后一直停在 Loading。
- 编辑 `dist/js/` 中的模块后，从项目根目录运行 `npm run build:local`，并同步更新生成的 `dist/js/local.bundle.js`。在新环境先运行 `npm ci` 安装构建依赖。
- 从磁盘和本地 HTTP 服务分别打开页面，确认能进入夷陵长江大桥并切换到 CBD、国贸、夷陵江景。HTTP 可用 `python -m http.server 8080 --bind 127.0.0.1 --directory dist` 启动。场景仍停在 Loading 时，先看浏览器控制台和网络面板中的脚本请求。
- 第四个场景「夷陵江景」（`?scene=river`）是竖屏 9:16、10 秒一镜到底：相机曲线在 `dist/js/river-camera.js`（米制关键帧，输出乘桥梁世界的 0.35 缩放），北岸滨江细节与两处贴镜遮挡在 `dist/js/river-bank.js`。`#export-button`（留影江岸）按 1080×1920 精确渲染一帧并下载 PNG。
- 截图验收用 `qa/river-frames.html?scene=river&mood=night&t=8200`（可选 `&clean=1` 隐藏全部 UI），它调用页面自身的 `window.render(ms)` 定帧；`qa/river-export.html` 会点一次留影江岸并把导出宽高写进标题。无头 Chrome 下 Loading 层的 0.7s 淡出会被虚拟时间冻结，截图里半透明纸色是这一原因，不代表场景卡住。
- 迁移或修改场景后，按改动范围运行 `npm run check` 和 `npm run verify:water`。从 Sites 工作区维护此项目时，同时参照上一级的 `AGENTS.md`。
