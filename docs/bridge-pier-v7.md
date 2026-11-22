# 夷陵长江大桥桥墩重建 V7

本轮只调整 `dist/js/bridge-structure.js` 中的辅助桥墩构造，不改变 CBD、国贸、相机轨迹、水面后处理和三塔位置。

## 依据与边界

- 夷陵长江大桥主桥为三塔、中央单索面预应力混凝土箱梁斜拉桥，主桥长 936 m。
- 主桥跨径资料包含 120 m 外侧边跨与 348 m 主跨；外侧边跨的辅助支承与三座主塔应区分。
- 公开资料说明主梁为单箱三室、顶宽约 23 m、梁高约 3 m。
- 公开报道可确认 236 根斜拉索及支座更换，但没有提供可直接用于精确重建的桥墩施工图尺寸。

参考：
- https://ptmc.tongji.edu.cn/yyljs/article/pdf/200403008
- https://cndao.com/productdetails.aspx?productID=19450
- https://news.cnhubei.com/content/2024-08/20/content_18307797.html
- https://m.cnhubei.com/content/2024-12/31/content_18813052.html

## 本轮改动

- 将外侧边跨辅助支承与引桥支承分组建模。
- 桥墩由简单直立块体改为带倒角的渐变墩身。
- 墩底增加水线/地面过渡基础体块。
- 墩顶增加横向墩帽、支座垫石和深色支座垫层。
- 墩身增加克制的水平施工分节线，避免用强描边表现结构。
- 不把地下桩基虚构成水面以上可见构件。

## 验收状态

本提交是源码修改，尚未完成 Node 构建、浏览器 WebGL 实机截图和 Sites 发布。应在本地执行：

```bash
npm ci
npm run check
npm run build:local
npm run verify:water
```

再检查桥下视角、全桥视角和沿桥视角。辅助桥墩的可见比例仍属于照片约束下的视觉估算，若取得原始施工图，应以图纸校正。
