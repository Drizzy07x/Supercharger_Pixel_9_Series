# Pixel 9 Pro Series Supercharger v2.6.2 STABLE

<p align="center">
<a href="https://github.com/Drizzy07x/Supercharger_Pixel_9_Series">
<img src="https://img.shields.io/badge/Device-Pixel%209%20Series-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Device">
</a>
<a href="https://github.com/Drizzy07x/Supercharger_Pixel_9_Series">
<img src="https://img.shields.io/badge/SoC-Tensor%20G4-F29900?style=for-the-badge" alt="SoC">
</a>
<a href="https://github.com/Drizzy07x/Supercharger_Pixel_9_Series/releases">
<img src="https://img.shields.io/badge/Version-v2.6.2%20STABLE-34A853?style=for-the-badge" alt="Version">
</a>
<a href="https://github.com/Drizzy07x/Supercharger_Pixel_9_Series">
<img src="https://img.shields.io/badge/Android-16%20%26%2017-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android">
</a>
<a href="https://github.com/Drizzy07x/Supercharger_Pixel_9_Series">
<img src="https://img.shields.io/badge/Root-Magisk%20%2F%20KernelSU-EA4335?style=for-the-badge" alt="Root">
</a>
</p>

**Developed by:** [Drizzy07x](https://github.com/Drizzy07x)

**Target devices:** Pixel 9 Pro XL (`komodo`), Pixel 9 Pro (`caiman`), Pixel 9 (`comet`)

**Channel:** Stable

**Compatibility:** Android 16 QPR3+, Android 17, Magisk, KernelSU

---

## Overview

**Pixel 9 Pro Series Supercharger** is a systemless performance and maintenance module built for the **Pixel 9 series on Tensor G4**.

The goal is simple: improve daily smoothness and responsiveness without turning the device into a reckless benchmark profile.

`v2.6.2 STABLE` includes the Supercharger dashboard plus integrated Thermal Control profile management.

---

## Project Goals

- Improve day-to-day smoothness and responsiveness
- Keep tuning selective and device-aware
- Avoid unnecessary aggressive behavior
- Preserve battery life and thermal consistency where possible
- Maintain clean boot behavior and predictable runtime behavior
- Improve logging, diagnostics, and maintainability

---

## Supported Devices

This module is designed only for the **Pixel 9 series**:

- **Pixel 9 Pro XL** (`komodo`)
- **Pixel 9 Pro** (`caiman`)
- **Pixel 9** (`comet`)

Unsupported devices are not the target of this project.

---

## What the Module Does

Supercharger focuses on conservative, audited tuning rather than extreme changes.

### Current tuning direction

- Conservative virtual memory tuning
- Conditional `vm.page-cluster=0` when swap / zRAM is active
- Selective IRQ affinity for storage, network, and input paths when accepted by the kernel
- Safe block I/O tuning on valid physical devices only
- Conservative network tuning
- Read-only verification for selected system properties
- Best-effort writes with graceful fallback on unsupported kernels

---

## WebUI Dashboard

The WebUI provides module status and maintenance controls without applying hidden changes by itself.

It reports:

- module health
- active profile
- root environment
- device model and codename
- Android release and SDK level
- battery temperature
- kernel and build info
- storage and network status
- merged Thermal Control status

It also exposes:

- profile selection
- one-tap maintenance
- app optimization tools
- Android system dexopt job trigger
- manual Thermal Control enable / disable
- thermal profile selection for Balanced, Gaming, and Charge Cool
- logs
- support snapshot output

---

## Profiles

### Active Smooth

Default daily profile focused on smoothness, safe boot behavior, and consistent responsiveness.

### Performance / Gaming

Experimental profile intended for gaming sessions and heavier foreground workloads.

It uses best-effort writes and safe fallback behavior. If the kernel rejects a node, the module leaves it unchanged.

Reboot after switching profiles before judging behavior.

---

## Merged Thermal Control

Thermal Control profiles are bundled into the main Supercharger module, but the thermal overlay is **off by default**.

This is intentional. The module does not place thermal config files under `system/vendor/etc` during installation. The user must enable Thermal Control manually from WebUI after confirming the device boots normally.

When enabled, Supercharger can keep the thermal profile aligned with the active performance profile:

- Active Smooth -> `balanced`
- Performance / Gaming -> `gaming`

`charge_cool` remains a manual Thermal-only profile for charging-focused behavior. Switching Thermal Control on, changing thermal profiles, or disabling it requires a reboot before judging behavior.

---

## Stability-First Design

This module is intentionally built around safe application and clean fallback behavior.

That means:

- no blind writes to unsupported nodes
- no global IRQ affinity
- no forced CPU/GPU clocks in the stable profile
- no thermal safety bypass
- no charging behavior override
- no version hacks tied rigidly to one Android build

The stable profile is designed to feel better in real use, not just look louder on paper.

---

## Audit Log

All major actions are written to:

```sh
/data/adb/modules/p9pxl_supercharger/debug.log
```

Support snapshots are written to:

```sh
/data/adb/modules/p9pxl_supercharger/support_snapshot.txt
```

---

## Support the Project

If you like the project and want to support future development, testing, and refinement:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/Drizzy_07)

---

## Credits

Credit to the Android, Magisk, KernelSU, and Pixel kernel development communities for the platform and tooling that make systemless development possible.
