# Pixel 9 Series Supercharger Changelog

## v2.6.5

### WebUI Reliability and Release Consistency

- Fixed background task polling so completed tasks do not leave unnecessary timers running.
- Prevented overlapping WebUI progress requests during app optimization and maintenance.
- Kept module-dependent controls disabled until status is available, including error states.
- Corrected app-selection controls across loading, filtering, failure, and busy transitions.
- Added regression coverage for the corrected WebUI state handling.
- Synchronized the README, module metadata, installer, service profile, update feed, and release notes.
- Added release preflight checks for WebUI regressions and cross-file version consistency.

## v2.6.4

### Consolidated Release Notes

- Integrated Thermal Control is bundled into the main Supercharger module with Balanced, Gaming, and Charge Cool profiles.
- Thermal Control stays off by default for safer first boot behavior, with manual enable, disable, and profile selection from WebUI.
- Active Smooth syncs to Balanced Thermal and Performance / Gaming syncs to Gaming Thermal after Thermal Control is enabled.
- Charge Cool remains a manual Thermal-only profile and is preserved during routine Supercharger refreshes.
- WebUI copy has been refined across status, profiles, thermal mode, maintenance, logs, app optimization, and support output.
- KernelSU WebUI packaging ships with explicit Unix file modes while keeping `webroot` detection compatible with KernelSU.
- Performance / Gaming includes expanded GPU devfreq discovery, GPU floor fallback, saved GPU policy state, and `gpu-scan` diagnostics.
- Maintenance includes one-tap repair, support snapshot generation, background task progress, app optimization, and Android system dexopt trigger.
- Safety behavior remains conservative: no thermal bypass, no charging override, no forced stable-profile CPU/GPU clocks, and no block scheduler override.
- Release packaging uses an explicit manifest plus preflight checks for shell scripts, WebUI JavaScript, update metadata, thermal JSON, package contents, Unix permissions, runtime state, and active thermal overlays.
- Local build outputs, logs, profile state, task state, caches, and editor files are ignored so release ZIPs stay clean.
- Module metadata wording has been cleaned up.
