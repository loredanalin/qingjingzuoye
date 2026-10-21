# 庭院离线版下载

[下载 ZIP（推荐）](https://github.com/loredanalin/qingjingzuoye/raw/refs/heads/delivery/courtyard-offline/deliverables/courtyard-offline.zip)

[下载 HTML](https://github.com/loredanalin/qingjingzuoye/raw/refs/heads/delivery/courtyard-offline/deliverables/courtyard-offline.html)

若链接打开文件详情页，请点击 **Download raw file**（下载箭头）。私有仓库需要先登录有权限的 GitHub 账号。

ZIP 解压后，用 Chrome、Edge 或 Firefox 打开 courtyard-offline.html。图片与脚本全部内嵌，无需联网或启动服务器。后滚放大，前滚缩小；放大时移动鼠标仍有左右视差，按 0 或 Home 复位。

此版本根据最后一次可打开版本的录屏重建，被遮挡区域经过局部补绘，并非旧源文件逐字节恢复。背景、门柱、树木、花丛与栏杆的遮挡顺序已调整，包含 WebGL 不可用时的兼容显示。

HTML SHA-256：`2f68bdb30a71a0cdfddf4d0dc4e6384aa1baaa9593b7f7545bf0d4de8496ec74`

最新修正：收紧门与柱子之间远树的遮挡窗口，使其位于门框和柱子轮廓之后。WebGL 与兼容显示均已验证静止、最大放大和左右鼠标移动时的遮挡。交互动画代码与上一版逐字节相同，保留远树动效与景深。

栏杆遮挡修正：门柱位于近、远栏杆之前；栏杆仍位于树木和花丛之前。已验证 WebGL 与兼容显示在静止、最大放大及左右移动时的遮挡；交互控制代码保持不变。

红柱修复：独立透明 PNG（267×1493），修复柱漆、金色花纹和石础细节，HTML 内嵌无损 PNG。按原柱子轮廓和纵向纹饰位置注册，保持门柱在栏杆及植物前方，动效控制代码不变。ZIP 内附 red-column.png 和定位元数据 red-column.json。纹饰细节依据原图补绘修复。
