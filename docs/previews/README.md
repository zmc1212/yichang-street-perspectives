# 夷陵长江大桥模型对比

- `bridge-v3-overview.png`：修改前模型，源提交 `d27716262b779cd67632d26995217f0038f4be8b`。
- `bridge-v4-overview.png`：本次重建模型，复用修改前的完整相机矩阵、投影矩阵和裁剪范围。
- `bridge-v4-axis.png`：本次重建后的主跨沿桥机位，90° 横向视场，看中央塔与城市岸。
- `bridge-model-checks.json`：最终模型源文件摘要和检查结果。

这些图由站点实际 Three.js 网格、材质纹理、实例与相机导出后，使用 CPU Blender 渲染，用于检查模型轮廓、空间关系和构图。它们不是在线网站截图；水面、照明、描边与实时 WebGL 画面存在差异。

重建重点包括连续曲肩 Y 塔、蓝灰槽面、切角长承台、侧跨辅助墩、车行道内侧红双栏与外侧银灰人行栏、完整桥面及引桥标线，以及近岸连续林冠、密集老城低楼肌理和码头。

主桥跨径、桥面宽度和拉索数量参考公开工程资料；塔高、周边匿名楼栋和地形坐标依照片比例估计。图片不代表逐栋测绘或 GIS 数字孪生。

主要参考：

- 桥面和换索后外观：中国中铁，https://www.crecg.com/web/xwzx61/zfgsdt39/2025021110093440992/index.html
- 大桥及两岸航拍：湖北日报，https://yc.cnhubei.com/content/2022-09/17/content_15071790.html
- 磨基山山林与公园：宜昌市园林中心，https://ylj.yichang.gov.cn/content-43955-959914-1.html
- 北引桥与城区：三峡宜昌网，https://www.cn3x.com.cn/article/202607/04/c925430.html
