# Security Policy

## Supported versions

Only the latest published release receives fixes. Older tags are kept for
reference and are not patched.

## What counts as a security issue here

This module runs as root on the device. Treat the following as security issues
rather than ordinary bugs:

- A path that lets a non-root app read, write, or influence module state under
  `/data/adb/modules/p9pxl_supercharger` or `/data/adb/supercharger_state`
- Command injection through WebUI input, log content, or environment values
  parsed by `bin/supercharger_ctl.sh` or `service.sh`
- Files shipped or created with permissions wider than intended
- A tuning write that disables a thermal or charging safety limit

## Reporting

Report privately through GitHub. Open the repository's
[Security Advisories](https://github.com/Drizzy07x/Supercharger_Pixel_9_Series/security/advisories)
page and use **Report a vulnerability**. Private vulnerability reporting is
enabled, so the report stays visible only to you and the maintainer.

Do not open a public issue for a security report.

Include the module version, device codename, root solution, and the smallest
reproduction you have. A support snapshot from the WebUI **Support** tab is
useful, but review it first and remove anything you do not want published.

## Expectations

You will get an acknowledgement of the report and, once a fix ships, a note in
the changelog. This is a single-maintainer hobby project, so there is no
guaranteed response window and no bounty.
