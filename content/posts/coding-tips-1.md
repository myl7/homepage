---
title: "编程杂记 #1"
date: 2026-03-15
---

## Windows 文件夹共享

使用 Windows 内置的 Samba 共享来共享文件夹时，如果你其他的都配好了还是连不上，记得手动在 Windows 防火墙中开放 TCP 445 端口。
在 Windows 设置应用中动共享相关的按钮并不会修改防火墙规则。

使用 MiXplorer 安卓应用访问 Windows 共享文件夹时，进阶配置里保持选项 `smb3=no`。
虽然 Windows 11 支持 SMBv3，但在 MiXplorer 中启用它会导致 "network reset" 错误。

Versions: MiXplorer v6.69.2-Silver. Windows 11 Pro 25H2, installed on 2025-02-16, build 26200.7922, experience: Windows Feature Experience Pack 1000.26100.300.0.

## `std::array` 转为 `std::span`

在 C++ 中，`std::array<T, N>` 可以转为 `std::span<const T, N>`。
但 `std::array<T *, N>` 不能转为 `std::span<const T *, N>`，因为 `T **` 不能转为 `const T **`。

`std::span` 从 C++ 20 开始可用。

## Hash 小消息的速度

用 SHA-256/BLAKE3 hash 1/16/64B 消息时，速度相同，因为它们按块 hash，每个块长 64B，这些输入都在一个块内。

## Fetch `.br` 文件会自动解压

Vite 中用 `fetch(new URL(...))` 来加载 `.br` 二进制文件作为 test fixture 时，Vite 会设置 HTTP header `Content-Encoding: br` 从而导致 fetch 输出解压后的内容。
如果你的测试/benchmark 需要原始内容，改一下文件扩展名：

```ts
// 错误：Vite 会自动解压 .br 文件
fetch(new URL("./fixture.br", import.meta.url));

// 正确：使用 .bin 扩展名
fetch(new URL("./fixture.bin", import.meta.url));
```

## Windows 程序 daemonization

用 NSSM 包装成一个 Windows 服务，不用改程序代码。

## Vercel 中 Hugo 的版本

默认 Hugo 0.58.2，超级老。添加 env `HUGO_VERSION` 来装个新点的，不用改代码。

Versions: Vercel 2026-03-07.

## Hugo 不构建今天日期的文章

如果文章的 `date` 设为今天但没有指定时间或时区，Hugo 会将其视为 `00:00:00Z`。
当你的时区在 UTC 之后（如 `Asia/Shanghai`，UTC+8），Hugo 默认用 UTC 比较，可能认为文章日期是"未来"，从而在默认的 `buildFuture = false` 时跳过 build。
在 `hugo.toml` 中设置时区 `timeZone = "Asia/Shanghai"` 就能修复。

## 香港紧急电话

香港的警察、消防、救护车共用紧急电话号码 999。
拨通后告知接线员需要的服务类型即可。
非紧急警察热线是 2527 7177。

## 香港私家车成本

**车牌编配制度**：香港车牌（登记号码）由运输署负责发放，分为三类。普通号码由运输署按序编配，格式为两个前缀英文字母加不超过四位数字（如AB 1234），无额外费用，无摇号限牌制度。传统特殊号码由运输署挑选靓号后不定期公开拍卖，价高者得，收益拨入政府奖券基金作慈善用途；市民也可缴付1000港元按金预留心仪的普通登记号码列入拍卖，若预留号码被他人拍中则按金退回，若无人竞投则号码以底价1000港元归预留申请人。自订车牌（2006年起推出）由市民自行设计组合，最多8位字母、数字或空格，不可用I、O、Q（避免与1、0混淆），不得与政府已有号码相同，运输署有最终决定权；每年1月、5月、9月开放申请，超额则抽签，中签后缴5000港元按金，审批通过后公开拍卖，竞投失败则库务署8周内退回按金，若拍卖无人竞投则号码以5000港元特别费用直接归申请人（按金充抵）。两类特殊号码拍得后均须12个月内配予名下车辆，否则运输署可取消；均不可随车过户，车辆转让时运输署会收回特殊号码改配普通号码，但车主可申请将号码转到自己名下另一辆车。

**一次性费用：首次登记税**：香港对所有首次上路的汽车征收首次登记税，税率采用阶梯式：最初15万港元应课税价值税率46%，其次15万为86%，再次20万为115%，50万以上部分为132%。举例：裸车价30万港元的燃油车，首次登记税约19.8万港元；裸车价50万港元的燃油车，税约42.8万，实际购车成本接近百万港元。该税可能相当于车价的50%-200%。电动车方面（至2026年3月31日），一般新购电动私家车（非一换一）享有最高58,500港元的首次登记税宽减，但税前车价超过50万港元的电动车不享有任何宽减。

**年度固定费用**：车辆牌照费：汽油车按汽缸容量计算，1500-2500cc约7498港元/年；电动车按车辆净重计算，年费约1100港元。第三者责任保险为法定强制要求。

**月度及日常费用**：停车费：住宅月卡2000-5000港元，办公楼3000+港元，市区临时停车30港元/小时起，商业中心60+港元/小时。即使车辆完全不开，年停车费约6万港元，10年停车费可超过购车费。购买车位：热门地段一个车位可达数百万港元。燃油费（汽油车）：约3500-4000港元/月，92#汽油约12港元/升以上。电动车充电费：每公里约0.4-0.6港元，月电费约600-900港元（按日行50公里计算），远低于燃油车。隧道费：约4000-5000港元/月。

**常见车型价格分布**（含首次登记税落地价，不含保险和车牌拍卖费）：汽油车（全部进口，加阶梯重税）：入门家用车（飞度、Yaris等）约20-30万港元；中级家用车（凯美瑞2.5L等）裸车约32万，含税约52.8万港元；豪华中大型（宝马5系、奔驰E级等）约80-150万港元；旗舰豪华（宝马740Li等）裸车约110万，含税约205万港元；超豪华/跑车（保时捷911等）裸车约180万，含税约340万港元。
电动车新购（非一换一，享5.85万宽减上限）：比亚迪DOLPHIN（入门紧凑）落地约23万港元；比亚迪ATTO 3（紧凑SUV）落地约30-34万港元；比亚迪SEALION 7（中型SUV）落地约35-39万港元；Tesla Model Y后驱版落地约40.8万港元；税前价超50万的高端电动车无任何宽减，按燃油车同样税率全额征收，落地价轻松过百万。50万以下区间电动车落地价大约23-41万港元覆盖主流需求。

**综合养车成本**：正常使用的话，月均持续支出（停车+能源+隧道）汽油车约1.2-1.4万港元，电动车因省油和低牌费可节省数千港元。加上牌费和保险，汽油车养车年支出在15-20万港元量级。电动车维护费用也更低，约为燃油车的一半。2025年上半年香港电动私家车渗透率已达68.6%，电动车已成为新车主流选择。

## Vivo 手机开发者模式中的 OEM 解锁选项

Vivo 从未允许普通用户解锁 bootloader。
这个选项只是 UI 占位符，没有用。

## `\boldsymbol` = `\bm`

LaTeX math 中 bm package 的 `\bm` 格式可以用 `\boldsymbol` 来代替，大差不差。

## Linux 使用 RDP 连接 Windows 远程桌面的命令

```sh
xfreerdp3 /sound:sys:alsa +clipboard /u:username /v:hostname /d:domain_name /size:widthxheight +dynamic-resolution
```

用 FreeRDP v3。
`/sound:sys:alsa` 对获取声音有用。
`+clipboard` 共享剪贴板。
`/u:username` 指定用户名。
`/v:hostname` 指定远程主机地址。
`/d:domain_name` 指定域名，一般默认是 localdomain。
`/size:widthxheight` 指定分辨率，我用的是 2160x1440。
`+dynamic-resolution` 允许动态调整分辨率，就是可以拖拽边框改变窗口大小。

## 新机创建 /etc/hosts

能解决 sudo 缓慢并显示 "sudo: unable to resolve host hostname" 的问题。

```
127.0.0.1 localhost
127.0.1.1 hostname

# The following lines are desirable for IPv6 capable hosts
::1     localhost ip6-localhost ip6-loopback
ff02::1 ip6-allnodes
ff02::2 ip6-allrouters
```

其中 hostname 是 FQDN，没有就直接用 hostname。
`127.0.1.1` 如果有永久 IPv4 就改成永久 IPv4。

Ref: [5.1.1. 主机名解析 of Debian 参考手册](https://www.debian.org/doc/manuals/debian-reference/ch05.zh-cn.html#_the_hostname_resolution)

## ffmpeg 音频压缩的命令

**WAV → Opus (WebM 容器)**:
`ffmpeg -n -loglevel warning -i input.wav -acodec libopus -b:a 192k output.webm`

`-n`: 输出文件已存在时跳过，不覆盖。
`-loglevel warning`: 只显示警告和错误，减少刷屏。
`-i input.wav`: 输入文件。
`-acodec libopus`: 使用 Opus 编码器。
Opus 是目前综合表现最好的有损音频编码格式，同码率下音质优于 AAC/Vorbis/MP3。
`-b:a 192k`: 音频码率 192 kbps。
对 Opus 来说这已经是"透明"级别（即人耳几乎无法与无损区分）。
如果不追求极致，128k 也完全够用。
输出容器为 `.webm`（WebM），是 Opus 最常见的封装格式之一，浏览器原生支持。
也可以用 `.ogg` / `.opus` 作为扩展名。

**WAV → FLAC（指定位深 + 重采样）**:
`ffmpeg -n -loglevel warning -i input.wav -sample_fmt s16 -ar 48000 -acodec flac output.flac`

`-sample_fmt s16`: 输出位深设为 16-bit（有符号整数）。
如果源文件是 24-bit 录音但你不需要那么高的精度，降到 16-bit 可以显著减小体积，且对听感几乎没有影响。
`-ar 48000`: 重采样到 48 kHz。
44.1 kHz → 48 kHz 的转换对音质基本无损，而 48 kHz 是视频/广播领域的标准采样率，统一后方便混用。
`-acodec flac`: 使用 FLAC 编码器。
FLAC 是无损压缩，通常能把 WAV 体积压缩到 50–70% 左右，且完全可逆。

## 磁盘柜与存储控制器之间的 SAS 线缆连接拓扑图

![](sas_topology.png)

Licenses: 图片来源于网络，不适用 CC BY 4.0 License。如有侵权请联系删除。

## 磁盘柜前面板上单颗硬盘的 LED 指示灯状态对照表

![](disk_enclosure_led_indicators.png)

Licenses: 图片来源于网络，不适用 CC BY 4.0 License。如有侵权请联系删除。
