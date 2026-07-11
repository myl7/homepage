---
title: "用 OpenWrt 默认 LuCI 界面连接 eduroam（i.e., 802.1x EAP）作为出口"
description: >-
  网上教程很多，但都是针对命令行或定制 UI 的。本文截图记录了用默认的 LuCI web 界面连接 eduroam 这类 802.1x EAP 安全性 Wi-Fi 节点的过程，不用开命令行 SSH，只用手机都行。额外探讨了一些容易配错的选项。
pubDatetime: 2026-07-11
modDatetime: 2026-07-11
tags: ["tutorial"]
---

用浏览器进入 OpenWrt web 管理界面，用顶栏打开 Network - Wireless 界面，点 Scan：

![](connect-eduroam-using-openwrt-luci/Pasted%20image%2020260711004954.webp)

图中 radio0 的是 2.4GHz 频段，radio1 的是 5GHz 频段。选 Wi-Fi 节点支持的那个，都支持一般选 5GHz。

在弹出的 Join Network: Wireless Scan 界面中选你要连的节点，点右侧 Join Network 进入一个不重要的界面：

![](connect-eduroam-using-openwrt-luci/Pasted%20image%2020260711005235.webp)

这里的 WPA passphrase **不会**被 eduroam 使用，你填 12345678 都行。

点 Submit 后进入Device Configuration & Interface Configuration 界面，这里才是配置 eduroam 的地方：

![](connect-eduroam-using-openwrt-luci/Pasted%20image%2020260711005808.webp)

保证 Mode 为 Client，在 Interface Configuration 中切换到 Wireless Security 界面：

![](connect-eduroam-using-openwrt-luci/Pasted%20image%2020260711010026.webp)

Encryption 选 WPA2-EAP，**不要选 WPA3-EAP**，来自 Claude 的解释：

> 企业网用 PEAP-MSCHAPv2 是 WPA2-Enterprise。`wpa3` 在 uci 里对应的是 WPA3-Enterprise(要求 SuiteB / MFP 强制等一套东西),跟你这个普通 PEAP 网络对不上,wpa_supplicant 会因为加密套件协商不出来而干脆不关联。改成 `wpa2`:

EAP-Method 选 PEAP。Authentication 选 EAP-MSCHAPv2，**不是 MSCHAPv2**。选错成 MSCHAPv2 LuCI 会标红提示的。

Identity 和 Password 填用户名和密码。注意 eduroam 的用户名会带 `@` + 机构的域名，对学生而言域名~~**似乎总是和学生邮箱的域名不同**（我没见过任何反例，欢迎指出），原因可以简单猜测为学生不等于 faculty~~据朋友 slanterns 提醒，在 HKU 和 HKUST 是一样的，堪称大方了。

点 Save 就完成了，回到 Network - Wireless 界面，点 Save & Apply 应用。可以看新加的对应设备左侧信号强度是否有值来判断是否连接成功。
