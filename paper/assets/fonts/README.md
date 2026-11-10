# 源云明体 TC（丹版）网页字体

本项目采用 **源云明体 TC / GenWanMin2 TC 2.100** 的 Regular（400）与 SemiBold（600）。TC 为传统铅字印刷字形版本；源云系列在笔画交接处加入轻微的墨晕感，适合当前纸页账簿的古典排版。

来源：[ButTaiwan/genwan-font](https://github.com/ButTaiwan/genwan-font)，固定源提交 `25e718615173a3b51099ecc9a6bf4fa558c03fbc`。

- [源 Regular OTF](https://github.com/ButTaiwan/genwan-font/blob/25e718615173a3b51099ecc9a6bf4fa558c03fbc/otf/TC/GenWanMin2TC-R.otf)
- [源 SemiBold OTF](https://github.com/ButTaiwan/genwan-font/blob/25e718615173a3b51099ecc9a6bf4fa558c03fbc/otf/TC/GenWanMin2TC-SB.otf)
- [项目说明：TC 传统铅字版本及字库](https://github.com/ButTaiwan/genwan-font/blob/25e718615173a3b51099ecc9a6bf4fa558c03fbc/README.md)
- 许可证：同目录 `SIL_Open_Font_License_1.1.txt`。字体衍生及网页嵌入文件继续采用 SIL OFL 1.1；网页应用本身不因此改变许可证。

## 字形与传输

源字体每个字重有 **35,349 个 Unicode 字符映射、37,684 个字形**。本项目没有按当前页面文案删减字体，而是将完整 Unicode 字库划分为互不重叠的 `unicode-range` WOFF2 分片，浏览器仅请求实际文本所需的片段。

第一片覆盖 GB2312 一级汉字以及常用拉丁、标点、货币、数学符号；其余所有字符继续保留在编号分片中。以后用户输入新的商家、分类、姓名或备注，只要源字库收录，都会自动下载相应片段。分片只改变封装和加载方式，不修改字体笔画，不改变简体文字为繁体文字。

原始完整 OTF 与完整压缩 WOFF2 保留于开发环境 `/workspace/font-source-cache/`，不放进网站产物，避免同时发布两套重复字库。

## 接入

在主样式之前加载 `assets/fonts/fonts.css`。该文件只声明 `LedgerMing` 字体，不修改任何 UI 选择器。

```html
<link rel="stylesheet" href="assets/fonts/fonts.css">
```

```css
:root {
  --song: LedgerMing, 'PMingLiU', 'MingLiU', 'Songti SC', serif;
  --serif: LedgerSerif, LedgerMing, 'Times New Roman', 'PMingLiU', serif;
}
```

字重真实提供 400、600。不要将静态字体声明为 `font-weight:400 700` 可变字体。若整页中文都要使用明体，正文及输入框也应继承 `LedgerMing`，避免某些组件明确使用系统无衬线字体；这是 CSS 字体选择问题，与字库缺字不同。

`font-display:swap` 保障首次加载时文字可读；后备选择明体／宋体衬线族。字体分片宜按需缓存，不应在首次加载中强制预缓存整套字库。

## 实测覆盖与限制

结果见同目录 `coverage.json` 与 `shards.json`：

- GB2312 的 7,445 个可解码字符全部覆盖。
- Big5 的 13,706 个可解码字符中，只有非汉字符号 `ˍ`、`‾`、`∼` 不在此源字库；Big5 汉字全部覆盖。
- 项目当前源码汉字全部覆盖。
- 非 BMP 常见姓名字如 `𠮷` 已收录；极罕见扩展字如 `𪚥` 未收录。没有声称涵盖 Unicode 所有汉字；超出源字库的字符仍由衬线后备字体提供。

检测逐一读取源字体与网页分片的 cmap，并验证分片并集等于源 cmap，没有遗漏或重叠。字体文件 SHA-256、字重及传输字节数亦写入 JSON，便于后续更新核对。
