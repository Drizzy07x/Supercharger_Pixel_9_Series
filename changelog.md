# Pixel 9 Series Supercharger Changelog

## v2.6.1

### WebUI Hotfix

- Rebuilt the release ZIP with explicit Unix file modes for KernelSU installs.
- Left `webroot` permission handling to KernelSU so the manager can detect the WebUI entrypoint.

## v2.6.0

### Merged Thermal Control

- Bundled Balanced, Gaming, and Charge Cool thermal profiles into the main Supercharger module.
- Thermal Control is off by default to avoid bootloops from automatic thermal overlays.
- Added manual WebUI controls to enable, disable, and switch thermal profiles.
- Supercharger profile changes sync thermal profiles only after Thermal Control has been manually enabled.
- Charge Cool remains a Thermal-only profile and is not overwritten by routine Supercharger status refreshes.

### GPU / Performance Fixes

- Expanded GPU devfreq discovery beyond simple `gpu`, `mali`, and `g3d` names.
- Added detection through devfreq real paths, device metadata, and common GPU identifiers.
- Added GPU frequency policy fallback when a `performance` governor is not exposed.
- Performance / Gaming can now raise the GPU minimum frequency floor to a conservative gaming target when supported by the kernel.
- Performance / Gaming can restore the GPU maximum frequency policy to the highest available exposed value when supported by the kernel.
- Added saved GPU policy state so switching back to Active Smooth can restore previous GPU settings.
- Added GPU verification output in the deep audit.
- Added `gpu-scan` diagnostic command for unsupported kernels.

### Maintenance

- Added a manual Android system dexopt job from CLI and WebUI.
- The dexopt job runs through Android package manager in the existing background task flow and does not change kernel, thermal, charging, CPU, or GPU tuning.

### Safety

- GPU writes remain best-effort and reversible.
- Unsupported or rejected GPU nodes are skipped safely.
- Active Smooth restores saved GPU policy where possible.
- Background task locks now release only the lock owned by the running task.
- No thermal bypass was added.
- No charging behavior was changed.
- No block scheduler override was added.
