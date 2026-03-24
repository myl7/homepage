---
title: "编程杂记 #4"
date: 2026-03-24
tags: [coding-tips]
draft: true
---

## Ghostty SSH到远程机器后终端渲染错乱

Ghostty设置`TERM=xterm-ghostty`，如果远程机器没有对应的terminfo，终端转义序列会被错误解析，导致光标位置计算错误、输入字符重复显示等问题。
Konsole等传统终端不会有这个问题，因为它们使用`xterm-256color`等广泛预装的terminfo。

临时修复：`TERM=xterm-256color ssh remote`。

永久修复：把本机的ghostty terminfo安装到远程：

```bash
infocmp -x xterm-ghostty | ssh remote tic -x -
```

`infocmp`导出本机的terminfo定义（文本格式），通过管道传给远程的`tic`编译安装到`~/.terminfo/`。
之后远程就能识别`xterm-ghostty`的终端能力，渲染恢复正常。

## 渲染Unicode符号选对字体

渲染✗(U+2717)、☐(U+2610)、⚠(U+26A0)等Dingbats/Misc Symbols区段的字符时，CJK字体和Emoji字体都覆盖不全，字形也不好看。
用Noto Sans Symbols 2就对了。
