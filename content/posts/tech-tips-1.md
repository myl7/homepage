---
title: "Tech Tips #1"
draft: true
---

## About Windows folder sharing

To share folders with Windows builtin Samba sharing, you must manually open TCP port 445 in Windows Firewall.
Toggling the buttons about sharing in "Advanced Network Settings" of Settings app does not change firewall rules.

To use MiXplorer Android app to access Windows shared folders, keep the option `smb3=no`.
Though Windows 11 supports SMBv3, enabling it in MiXplorer causes a "network reset" error.

Versions: MiXplorer v6.69.2-Silver. Windows 11 Pro 25H2, installed on 2025-02-16, build 26200.7922, experience: Windows Feature Experience Pack 1000.26100.300.0.
