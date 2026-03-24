---
title: "编程杂记 #3"
date: 2026-03-24
tags: [coding-tips]
---

{{< katex >}}

## 用PRF生成PRP

**PRF (Pseudorandom Function)**：一族keyed function $F_k: \{0,1\}^n \to \{0,1\}^m$，对于随机选取的key $k$，任何efficient adversary都无法区分$F_k$和一个真正的random function。不要求可逆。

**PRP (Pseudorandom Permutation)**：PRF的特殊情况，要求$F_k$是bijection（即permutation），输入输出长度相同。任何efficient adversary都无法区分$F_k$和一个真正的random permutation。因为是permutation，所以可逆。

**Generalized Feistel Network** (Naor & Reingold, 1999; Hoang et al., 2012)从$\{0,1\}^{n/2}$上的PRF构造$\{0,1\}^n$上的PRP。将$n$-bit输入分成两半$(L, R)$，执行多轮变换：

$$\text{Round}_i(L, R) = (R,\; L \oplus F_i(R))$$

其中$F_i$是keyed PRF（如truncated AES）。经过足够多轮（通常3-4轮）后，即可得到$\{0,1\}^n$上的PRP。再结合cycle-walking可得到$[0, \text{domain})$上的PRP。

- Balanced Feistel（两半等长）：3轮即可达到CCA security（Luby-Rackoff）。
- Unbalanced Feistel（用于奇数长度domain）：需要更多轮。
- 在$\{0,1\}^{\lceil \log_2(\text{domain}) \rceil}$上做cycle-walking，平均最多需要2次迭代。
- 总开销：每次PRP evaluation约3-4次AES调用。

<!-- ## FreeRDP v3连接登录微软邮箱的Windows-->

## Windows远程桌面NLA

在Windows中把NLA（Network Level Authentication）关了，这个主要是防DoS（拒绝服务攻击）的。

<!-- 命令带上`-authentication`选项，使用本地用户名（cmd里`whoami`）和微软账户密码、如果开了微软的MLA（多因素认证），要创建并使用app password。-->

## Windows改UI字体

Windows没有内置的系统字体切换界面，需要通过注册表修改：

1. 打开`regedit`
2. 进入`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts`，将"Segoe UI (TrueType)"的值清空
3. 进入`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\FontSubstitutes`，新建字符串值`Segoe UI`，数据填你想用的字体名
4. 重启电脑

## OBS录制HDR屏幕

OBS 28.0+支持HDR录制，需要系统已开启HDR、显卡驱动最新。步骤：

1. 设置 > 输出，切换到"高级"输出模式
2. 设置 > 高级，色彩空间选Rec. 2100 (PQ)，颜色格式选P010
3. 设置 > 视频，分辨率设为显示器原生分辨率
4. 设置 > 输出 > 录像，编码器选HEVC (NVENC)（N卡）或x265（CPU），Profile选Main 10，封装格式选mkv
5. 码率设置：2K 60fps游戏场景建议40000-50000 Kbps，或者用CQP模式设18-22让编码器自动分配
6. 捕获源用"游戏捕获"或"显示器捕获"

窗口捕获可以用，但HDR兼容性不如另外两种。

## 沙漏流速恒定的原理

沙漏中的沙子不同于液体，颗粒之间的摩擦和接触会将重量传递到容器壁上，而非完全压向底部。Janssen效应对此给出了定量描述：设深度$z$处的竖直压强为$P(z)$，容器半径为$R$，沙子体密度为$\rho$，摩擦系数为$\mu$，水平与竖直压强之比为$K$，则薄层力平衡给出微分方程$\frac{dP}{dz} = \rho g - \frac{2\mu K}{R}P$，其解为$P(z) = \frac{\rho gR}{2\mu K}\left(1 - e^{-\frac{2\mu K}{R}z}\right)$。当$z$足够大时指数项趋近于零，压强趋于饱和值$\frac{\rho gR}{2\mu K}$。因此无论沙漏上半球还剩多少沙子，颈口处受到的压强几乎不变。

Beverloo方程从实验上证实了这一点：颗粒通过孔口的质量流量为$W = C\,\rho_b\,\sqrt{g}\,(D - kd)^{5/2}$，其中$C \approx 0.58$是无量纲常数，$\rho_b$是堆积密度，$D$是孔口直径，$d$是颗粒直径，$k \approx 1.4$是边缘死区修正系数。流量仅取决于孔口和颗粒参数，与上方沙柱高度无关。两者结合，就解释了沙漏的流速为何从头到尾保持恒定，使其能用作计时工具。

## Git的3种部分克隆

`git clone`默认下载仓库的全部对象（commit、tree、blob）。
对于大仓库，可以用`--filter`跳过部分对象，按需从远端获取：

- **Blobless clone** (`--filter=blob:none`)：跳过所有文件内容（blob），只下载commit和tree（目录结构）。
  checkout时按需拉取blob。
  `git log`等历史操作正常工作，因为tree对象是完整的。
  适合日常开发。
- **Treeless clone** (`--filter=tree:0`)：在blobless基础上连tree也跳过，只下载commit。
  初始体积最小，但`git log -- path/file`之类的路径过滤命令需要从远端逐个获取tree，会很慢。
- **Shallow clone** (`--depth=N`)：只下载最近N个commit及其tree和blob，直接截断历史。
  体积小，但无法浏览被截断的历史。
  适合CI等不需要历史的场景。

|          | commit  | tree   | blob   |
| -------- | ------- | ------ | ------ |
| 完整克隆 | 全部    | 全部   | 全部   |
| Blobless | 全部    | 全部   | 按需   |
| Treeless | 全部    | 按需   | 按需   |
| Shallow  | 最近N个 | 对应的 | 对应的 |

## Hugo开发服务器

`hugo server`默认不构建草稿页面（front matter中`draft: true`的页面），加`-D`启用。
开发时浏览器可能缓存旧内容导致看不到最新改动，加`--noHTTPCache`让服务器返回`Cache-Control: no-store`头禁用缓存。

## 杂项

- Minecraft Java Edition从26.1开始要求Java 25。
- Windows包管理器我用Scoop。
- 用Ventoy可以在安装U盘上放多个系统。不需要刻录，只需要放iso文件。
