---
title: "编程杂记 #2"
tags: [coding-tips]
draft: true
---

## CSS 文字与图片对齐

Flex 布局用 `align-items: center` 就能让文字和 icon 居中对齐。
这里只讨论 inline 布局的情况。

`vertical-align: middle` 对齐的是 x-height 而非 cap-height，导致 icon 偏下。
用 `cap` 单位修正：

icon 尺寸未知时，用负 margin 补偿 x-height 与 cap-height 的差：

```css
.icon {
    vertical-align: middle;
    margin-block-start: calc(1ex - 1cap);
}
```

icon 尺寸已知时，直接算 vertical-align 偏移量：

```css
.icon {
    --size: min(2em, 10vw);
    vertical-align: calc(0.5cap - 0.5 * var(--size));
}
```

不支持 `cap` 的浏览器，用 `@supports` 回退到手动测量的 em 值：

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
