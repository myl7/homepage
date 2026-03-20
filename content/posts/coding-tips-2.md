---
title: "编程杂记 #2"
date: 2026-03-20
tags: [coding-tips]
---

## CSS文字与图片对齐

Flex布局用`align-items: center`就能让文字和icon居中对齐。
这里只讨论inline布局的情况。

`vertical-align: middle`对齐的是x-height而非cap-height，导致icon偏下。
用`cap`单位修正：

icon尺寸未知时，用负margin补偿x-height与cap-height的差：

```css
.icon {
    vertical-align: middle;
    margin-block-start: calc(1ex - 1cap);
}
```

icon尺寸已知时，直接算vertical-align偏移量：

```css
.icon {
    --size: min(2em, 10vw);
    vertical-align: calc(0.5cap - 0.5 * var(--size));
}
```

不支持`cap`的浏览器，用`@supports`回退到手动测量的em值：

```css
html {
    /* Adjusted for Iowan Old Style */
    --cap: 0.704583em;
}

@supports (height: 1cap) {
    html {
        --cap: 1cap;
    }
}

.icon {
    vertical-align: middle;
    margin-block-start: calc(1ex - var(--cap));
}
```

Ref: [Cap-Height Vertical Align by Roma Komarov](https://blog.kizu.dev/cap-height-align/)

## CSS中文排版`text-autospace`和`text-spacing-trim`

`text-autospace`在CJK字符和西文字母/数字之间自动插入约1/8 em的微间距，不需要在源文本里手动加空格。

`text-spacing-trim`处理CJK标点的宽度压缩。
CJK标点在字体里通常占一个全角宽度，但字形本身只用了半边，另外半边是空白。
两个标点相邻时（比如"」，"或"。「"），两个半宽空白叠在一起就显得松散，这个属性自动压缩多余间距。

两个属性从Chromium 120+开始支持，可以作为渐进增强使用，不支持的浏览器无副作用。

## 常见预装字体

Windows:

- Sans-serif: Arial, Segoe UI, Verdana, Tahoma, Calibri
- Serif: Times New Roman, Georgia, Cambria
- Monospace: Consolas, Courier New, Cascadia Mono（Windows Terminal自带）

macOS:

- Sans-serif: Helvetica, San Francisco（系统UI）, Arial
- Serif: Times New Roman, Georgia
- Monospace: Menlo, Monaco, SF Mono, Courier New

Linux（取决于发行版和字体包）:

- Sans-serif: Noto Sans, DejaVu Sans
- Serif: Noto Serif, DejaVu Serif
- Monospace: DejaVu Sans Mono, Noto Sans Mono
- Liberation系列（Liberation Sans/Serif/Mono）是Arial/Times New Roman/Courier New的度量兼容替代品，很多发行版预装。

Windows和macOS之间交集比较大（Arial、Times New Roman、Georgia、Courier New），Linux和它们的交集很小，主要靠Liberation和DejaVu系列覆盖。

## C++有符号整数转换时的sign extension陷阱

将有符号转无符号再扩展宽度时，转换顺序会影响结果。

先扩展再转无符号：

```cpp
int8_t x = -1;          // 1111 1111
uint16_t y = x;          // 先 sign extend 到 int16: 1111 1111 1111 1111
                         // 再转 uint16: 65535
```

先转无符号再扩展：

```cpp
int8_t x = -1;           // 1111 1111
uint8_t mid = x;         // 1111 1111 (255)
uint16_t y = mid;        // zero extend: 0000 0000 1111 1111 (255)
```

同样的原始值`-1`，结果分别是65535和255。
原因是扩展时看源类型的signedness：有符号做sign extension，无符号做zero extension。

## Bash `set -e`在条件上下文中失效

`set -e`（errexit）让脚本在任意命令失败时立即退出。
但如果命令处于`||`、`&&`或`if`的条件部分，`set -e`会被静默禁用，包括子shell内显式写的`set -e`。

```bash
#!/bin/bash
(
    set -e
    false
    echo a
) || echo b
```

直觉上`set -e`加`false`应该让子shell立即退出，跳过`echo a`，然后`||`右侧的`echo b`执行。
实际输出是`a`。

原因：子shell `(...)`处于`||`左侧，属于条件上下文。
Bash在这种上下文中压制errexit，即使子shell内部显式执行了`set -e`也不生效。
所以`false`返回非零但不触发退出，`echo a`正常执行，子shell以0退出，`echo b`不执行。

如果确实需要子shell在失败时退出，不要依赖`set -e`，显式检查退出码：

```bash
(
    false || exit 1
    echo a
) || echo b
# 输出: b
```

## .au域名

.au域名要求注册者必须是澳大利亚公民/永久居民、持有ABN/ACN的澳大利亚实体、或持有与域名完全匹配的澳大利亚注册商标的外国实体，且资格须在整个持有期间持续有效，否则域名会被直接删除且不退款。

## Bun优点和兼容性问题

### 优点

- **单一二进制**：runtime + bundler + test runner + package manager，零配置冲突。
- **快**：Zig + JSC引擎，`bun install` / `bun test`冷启动体感显著快于Node生态同类工具，CI受益最大。
- **原生TS/JSX**：不依赖esbuild转译层，直接跑`.ts`/`.tsx`。
- **内置实用API**：`Bun.serve()`、`bun:sqlite`、`Bun.password`、`Bun.S3`，简单后端无需额外框架。
- **Serverless友好**：~20ms启动，Lambda冷启动成本直降。

### 兼容性问题

**Native Addon**：任何带`binding.gyp`的包都可能挂。
`bcrypt`直接报`MODULE_NOT_FOUND`（换`bcryptjs`）；`canvas`不可用且无workaround；`sharp` 2026年靠WASM fallback基本能跑但需验证平台；`better-sqlite3`不可用（用`bun:sqlite`替代）。
`Bun.password`验证Node bcrypt生成的`$2a$`哈希会返回false，需手动替换前缀为`$2b$`。

**调试**：`bun --inspect`断点不可靠，`await`单步会迷失，sourcemap映射常错位，结束后端口不释放。
Windows上VS Code调试直接不可用（`ws+unix://`路径解析失败）。

**Test Runner**：未集成VS Code Test Explorer；monorepo下同class的`instanceof`断言可能误判（双重模块解析）。

**Next.js**：当package manager安全；当runtime需逐一验证依赖。
Bun workspaces下TS项目启动失败（hoisting差异导致`@types/node`丢失）；有部署时SIGILL crash的报告。
Vercel 2025.10起支持Bun runtime（public beta）。

**Workspace**：npm的`"pkg": "*"`写法不被识别为workspace引用，必须写`workspace:*`，现有npm monorepo直接切可能坏。

**bun build**：不完全尊重`tsconfig.json`，默认把node_modules全打包，`external` / `packages`语义易混淆。
