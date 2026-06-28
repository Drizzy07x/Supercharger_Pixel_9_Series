#!/usr/bin/env python3
import argparse
import sys
import zipfile
from pathlib import Path


RUNTIME_NAMES = {
    "current_profile",
    "thermal_current_profile",
    "thermal_control.env",
    "gpu_policy_state.env",
    "module_status.env",
    "addon_api.env",
    "support_snapshot.txt",
    "debug.log",
    "debug.previous.log",
    "maintenance.log",
    "maintenance_task.log",
    "maintenance_task.env",
    "maintenance_task.pid",
    "app_optimization.log",
    "app_optimization.env",
    "app_optimization.pid",
    "dashboard_updater.pid",
    "action.log",
    "last_action_status.txt",
}

ACTIVE_OVERLAY_PATHS = {
    "system/vendor/etc/thermal_info_config.json",
    "system/vendor/etc/thermal_info_config_lpm.json",
    "system/vendor/etc/thermal_info_config_charge.json",
}

ZIP_BLOCKED_PREFIXES = (
    ".git/",
    ".github/",
    "dist/",
    "release-check/",
    "scripts/",
)

ZIP_BLOCKED_ROOT = {
    ".gitignore",
    ".gitattributes",
    "README.md",
    "README.txt",
    "LICENSE",
    "changelog.md",
    "CHANGELOG.md",
}

REQUIRED = {
    "main": [
        "module.prop",
        "system.prop",
        "customize.sh",
        "service.sh",
        "uninstall.sh",
        "update.json",
        "bin/supercharger_ctl.sh",
        "webroot/index.html",
        "webroot/index.mjs",
        "webroot/kernelsu.js",
        "thermal_profiles/balanced/vendor/etc/thermal_info_config.json",
        "thermal_profiles/balanced/vendor/etc/thermal_info_config_lpm.json",
        "thermal_profiles/gaming/vendor/etc/thermal_info_config.json",
        "thermal_profiles/gaming/vendor/etc/thermal_info_config_lpm.json",
        "thermal_profiles/charge_cool/vendor/etc/thermal_info_config.json",
        "thermal_profiles/charge_cool/vendor/etc/thermal_info_config_lpm.json",
    ],
    "thermal": [
        "module.prop",
        "customize.sh",
        "service.sh",
        "post-fs-data.sh",
        "uninstall.sh",
        "update.json",
        "bin/profile_lib.sh",
        "bin/switch_profile.sh",
        "webroot/index.html",
        "webroot/kernelsu.js",
        "profiles/balanced/vendor/etc/thermal_info_config.json",
        "profiles/balanced/vendor/etc/thermal_info_config_lpm.json",
        "profiles/gaming/vendor/etc/thermal_info_config.json",
        "profiles/gaming/vendor/etc/thermal_info_config_lpm.json",
        "profiles/charge_cool/vendor/etc/thermal_info_config.json",
        "profiles/charge_cool/vendor/etc/thermal_info_config_lpm.json",
    ],
}

ROOT_EXECUTABLE = {
    "customize.sh",
    "service.sh",
    "post-fs-data.sh",
    "uninstall.sh",
}


def norm(value):
    return str(value).replace("\\", "/").strip("/")


def check_source(root, profile):
    errors = []
    for required in REQUIRED[profile]:
        if not (root / required).exists():
            errors.append(f"missing source path: {required}")

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = norm(path.relative_to(root))
        name = path.name
        if rel in ACTIVE_OVERLAY_PATHS:
            errors.append(f"active thermal overlay must not ship from source: {rel}")
        if name in RUNTIME_NAMES:
            errors.append(f"runtime state file must not be tracked: {rel}")
        if rel.startswith("dist/") or rel.startswith("release-check/"):
            errors.append(f"local release output must stay outside source: {rel}")
    return errors


def zip_has(names, required):
    return required in names or any(name.startswith(required.rstrip("/") + "/") for name in names)


def zip_mode(info):
    return (info.external_attr >> 16) & 0o7777


def expected_zip_mode(name, is_dir):
    if is_dir:
        return 0o755
    if name in ROOT_EXECUTABLE or name.startswith("bin/"):
        return 0o755
    return 0o644


def check_zip(path, profile):
    errors = []
    with zipfile.ZipFile(path) as archive:
        infos = archive.infolist()
        names = {norm(info.filename) for info in infos}

        for required in REQUIRED[profile]:
            if not zip_has(names, required):
                errors.append(f"missing package path: {required}")

        for info in infos:
            name = norm(info.filename)
            base = Path(name).name
            if not name:
                continue
            if name in ACTIVE_OVERLAY_PATHS:
                errors.append(f"active thermal overlay found in package: {name}")
            if base in RUNTIME_NAMES:
                errors.append(f"runtime state file found in package: {name}")
            if name in ZIP_BLOCKED_ROOT or any(name.startswith(prefix) for prefix in ZIP_BLOCKED_PREFIXES):
                errors.append(f"blocked package path found: {name}")

            mode = zip_mode(info)
            expected = expected_zip_mode(name, info.is_dir())
            if mode and (mode & 0o777) != expected:
                errors.append(f"unexpected mode {oct(mode & 0o777)} for {name}; expected {oct(expected)}")
            if not mode:
                errors.append(f"missing Unix mode for package path: {name}")
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=sorted(REQUIRED), required=True)
    parser.add_argument("--source", default=".")
    parser.add_argument("--skip-source", action="store_true")
    parser.add_argument("--zip")
    args = parser.parse_args()

    errors = []
    if not args.skip_source:
        errors.extend(check_source(Path(args.source), args.profile))
    if args.zip:
        errors.extend(check_zip(Path(args.zip), args.profile))

    if errors:
        for item in errors:
            print(f"ERROR: {item}", file=sys.stderr)
        return 1

    print("release validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
