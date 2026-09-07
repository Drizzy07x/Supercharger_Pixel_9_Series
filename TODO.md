# TODO

## Now

- [ ] Run the new Repository checks workflow on GitHub after pushing the maintenance
  branch; local checks cannot establish the hosted workflow result.

## Next

- [ ] Record a real Pixel validation session before the next release: codename,
  Android build, root manager/version, clean boot, profile persistence after an
  update, Thermal Control enable/disable with reboot, and support snapshot.
  Deferred: the maintainer's Pixel currently has no root. This does not block
  repository fixes or isolated host regression tests.

## Completed locally

- [x] Add a functions-only shell harness for background workers, state readers,
  lock ownership, and dashboard updater shutdown; Android operations are stubbed.
- [x] Preserve final task state when a worker finishes quickly or a status poll
  overlaps completion. Only the worker writes its lifecycle state.
- [x] Serialize asynchronous launches before changing logs/state, preserve job
  labels across operation calls, and report initialization failures.
- [x] Protect incomplete lock records and recheck ownership during serialized
  stale-lock recovery. Clear abandoned recovery guards at boot/install.
- [x] Exit the dashboard updater on termination signals and verify HUP/TERM
  cleanup in subprocess tests.

See [host validation and device boundaries](docs/TESTING.md) for the evidence.
