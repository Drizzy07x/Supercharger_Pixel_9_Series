# Pixel 9 Series Supercharger Changelog

## v2.6.4

### Metadata cleanup

- Cleaned up module metadata wording.
- Kept the existing WebUI, integrated Thermal Control, release validation, and safety behavior unchanged.

## v2.6.3

### Consolidated Release Notes

- Integrated Thermal Control is now bundled into the main Supercharger module with Balanced, Gaming, and Charge Cool profiles.
- Thermal Control remains off by default for safer first boot behavior, with manual enable, disable, and profile selection from WebUI.
- Active Smooth syncs to Balanced Thermal and Performance / Gaming syncs to Gaming Thermal after Thermal Control is enabled.
- Charge Cool remains a manual Thermal-only profile and is preserved during routine Supercharger refreshes.
- WebUI copy has been polished across status, profiles, thermal mode, maintenance, logs, app optimization, and support output.
- KernelSU WebUI packaging now ships with explicit Unix file modes while leaving `webroot` detection compatible with KernelSU.
- Performance / Gaming includes expanded GPU devfreq discovery, GPU floor fallback, saved GPU policy state, and `gpu-scan` diagnostics.
- Maintenance includes one-tap repair, support snapshot generation, background task progress, app optimization, and Android system dexopt trigger.
- Safety behavior remains conservative: no thermal bypass, no charging override, no forced stable-profile CPU/GPU clocks, and no block scheduler override.
- Release packaging now uses an explicit manifest plus preflight checks for shell scripts, WebUI JavaScript, update metadata, thermal JSON, package contents, Unix permissions, runtime state, and active thermal overlays.
- Local build outputs, logs, profile state, task state, caches, and editor files are ignored so release ZIPs stay clean.

## v2.6.2

### WebUI Polish

- Refined WebUI copy for clearer status, profile, thermal, maintenance, and app optimization flows.
- Renamed visible Thermal Control language from "merged" to "integrated" for a more finished presentation.
- Improved empty states, progress messages, and error messages across WebUI actions.
- Kept the existing layout and controls intact.

## v2.6.1

### WebUI Hotfix

- Rebuilt the release ZIP with explicit Unix file modes for KernelSU installs.
- Left `webroot` permission handling to KernelSU so the manager can detect the WebUI entrypoint.

## v2.6.0

### Integrated Thermal Control

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
