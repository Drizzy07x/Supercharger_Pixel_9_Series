# Testing Supercharger

## Host checks without a rooted phone

Run `python3 scripts/check.py` from a checkout with Python 3.10+, Node.js 24,
and Bash. On Windows with Git for Windows:

```powershell
python scripts/check.py --shell 'C:\Program Files\Git\bin\bash.exe'
```

The same runner is used by the branch/PR checks and release preflight. It checks
each module shell script separately, JavaScript syntax, WebUI regressions, Python
regressions, JSON, and source release metadata.

`scripts/shell_harness.py` reads only explicitly selected function definitions.
Tests run these definitions in temporary directories with synthetic state files,
real child processes and locks, and test doubles for Android operations. They do
not execute the full installer, service, controller, or uninstaller. Tests never
invoke ART compilation or write device tuning nodes.

## Lifecycle regressions

`scripts/test_task_lifecycle.py` covers:

- Fast workers retaining `done` rather than being overwritten by a launcher's
  delayed `running` record.
- A status poll overlapping completion without rewriting the task's record.
- State writers preserving their caller's variables.
- Five competing launches producing one operation and preserving its output,
  label, final state, and lock cleanup.
- Incomplete owner records not being mistaken for stale locks.
- Stale-lock recovery rechecking ownership before removing a directory.
- Failed workers releasing their locks so a retry can succeed.
- Initialization failures returning an error without running the operation.
- Interrupted tasks being reported without modifying shared state during a read.
- Dashboard updater exit and PID/lock cleanup on HUP and TERM.

Asynchronous tasks hold a lifecycle lock in addition to the operation's existing
lock. The launcher reserves ownership before shared output is changed, and the
worker publishes its initial state before launch acknowledgment. Only the worker
writes task state afterward. Status readers render an interruption if a recorded
worker is gone. Boot/install cleanup removes abandoned locks and recovery guards;
an incomplete owner record is conservatively treated as busy until that cleanup.

## Verified locally

The maintenance checkout passed 10 Node WebUI tests and 22 Python tests (including
10 shell lifecycle tests), shell/JavaScript parsing, JSON/source validation, and
`git diff --check` on Windows with Python 3.11, Node 24, and Git Bash. The fast
completion, status overwrite, variable clobbering, stale-recovery race, and updater
termination cases were reproduced against the original affected functions.

## Device validation remains separate

Host Bash behavior is not proof of Android `/system/bin/sh`, ART, root-manager
integration, tuning effectiveness, boot stability, or thermal behavior. Before
releasing runtime changes, record a Pixel session with the codename, Android
build, root manager/version, clean boot, task progress and retry, profile
persistence after update, Thermal Control enable/disable with reboot, and logs.

The maintainer's Pixel currently has no root, so that session is deferred. No
device performance or thermal improvement is claimed by the host checks. Hosted
GitHub Actions results must also be checked after the maintenance branch is pushed.
