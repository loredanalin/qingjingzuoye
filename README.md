# 庭院离线场景：完整版本备份

当前版本包括：完整宫廷背景、独立树木和花丛、完整近远栏杆，以及单独修复的高清透明红柱。柱子在栏杆前，栏杆在植物前；门柱间远树保持在门框和柱子后。后滚放大，放大后仍保留左右鼠标视差与远树动效。

本版本依据用户最后一次可打开版本的录屏重建，被遮挡区域和红柱纹饰经过局部补绘，属于恢复修复版。

## 直接使用

下载 `deliverables/courtyard-offline.zip`，解压后用 Chrome、Edge 或 Firefox 打开 `courtyard-offline.html`。所有图片和脚本已内嵌，无需网络、服务器或安装依赖。

ZIP 还包含独立柱子透明 PNG、定位 JSON、中文使用说明和 SHA-256 校验清单。按 `0` 或 Home 复位，`+` / `-` 缩放。画面不显示文字或控制按钮。

## 备份内容

- `index.html`：当前完整自包含 HTML，与交付的 HTML 一致。
- `deliverables/`：离线 HTML、运行 ZIP、独立红柱 PNG 和注册数据。
- `assets/`：背景、原录屏参考画面、透明图层及重心和接地线元数据。
- `scripts/build.py`：将全部图片和 Three.js 打包进单个 HTML。
- `scripts/prepare.py`：透明素材清理和自适应纸底抠图，记录尺寸、水平重心与接地线。
- `scripts/webgl.js`：26° 透视相机、透明面片、向暖背景色的距离淡化，以及兼容回退。
- `tests/`：离线依赖、交互、WebGL、门柱遮挡树木、柱子遮挡栏杆的检查。

主渲染采用自定义 ShaderMaterial，不使用 THREE.Fog。屏幕固定纸纹叠加在最终画面上。WebGL 不可用或上下文丢失时回退到 CSS 分层场景；禁用 JavaScript 时保留静态画面。

## 从源码构建

在仓库目录执行：

```sh
python -m pip install -r requirements.txt
npm ci
npm run build
```

构建生成当前目录的 `index.html`，以及仓库上级目录的 `courtyard-restored.html` 与 ZIP。构建脚本生成的 ZIP 只含 HTML；`deliverables/courtyard-offline.zip` 是包含独立柱子和说明的交付包。

## 验证

当前测试按本次云环境目录 `/workspace/qingjingzuoye` 配置。先在一个终端执行：

```sh
python -m http.server 5180 --bind 127.0.0.1 --directory /workspace
```

再在仓库目录执行：

```sh
npm test
npm run test:webgl
node tests/gap-occlusion.mjs
node tests/fence-occlusion.mjs
```

测试需要 `/usr/bin/chromium`。覆盖静止、最大放大、左右移动、植物动效、减少动态效果、移动端视口、无来源沙箱、禁用 WebGL、禁用 JavaScript 和 WebGL 上下文丢失回退。遮挡测试使用诊断色纹理实际检查像素。

受管理 Chromium 禁止 file:// 导航，本次离线安全边界通过无来源 srcdoc 沙箱验证，渲染通过本地 HTTP 验证；交付文件不依赖该测试服务器。
