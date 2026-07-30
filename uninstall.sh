#!/system/bin/sh
MODDIR="${0%/*}"
PIDFILE="$MODDIR/dashboard_updater.pid"
LOCKDIR="$MODDIR/.dashboard_updater.lock"
PERSIST_STATE_DIR="/data/adb/supercharger_state"
THERMAL_REGISTRY_DIR="/data/adb/supercharger_thermal_control"
THERMAL_REQUEST_ENV="$THERMAL_REGISTRY_DIR/profile_request.env"

if [ -f "$PIDFILE" ]; then
  pid="$(head -n 1 "$PIDFILE" 2>/dev/null | tr -d '\r\n')"
  stamped_boot="$(sed -n '2p' "$PIDFILE" 2>/dev/null | tr -d '\r\n')"
  current_boot=""
  [ -r /proc/sys/kernel/random/boot_id ] && current_boot="$(tr -d '\r\n' < /proc/sys/kernel/random/boot_id 2>/dev/null)"
  case "$pid" in
    ''|*[!0-9]*) ;;
    *)
      # A record from an earlier boot points at a recycled pid, never at our updater.
      if [ -n "$stamped_boot" ] && [ "$stamped_boot" = "$current_boot" ]; then
        kill "$pid" 2>/dev/null
      fi
      ;;
  esac
fi

rm -f "$PIDFILE" 2>/dev/null
rm -rf "$LOCKDIR" 2>/dev/null
rm -rf "$PERSIST_STATE_DIR" 2>/dev/null

# Only drop the thermal request we wrote ourselves; rmdir keeps an external
# Thermal Control add-on's registry intact because it refuses a non-empty dir.
if grep -q '^SUPERCHARGER_MODULE_ID="p9pxl_supercharger"' "$THERMAL_REQUEST_ENV" 2>/dev/null; then
  rm -f "$THERMAL_REQUEST_ENV" 2>/dev/null
fi
rmdir "$THERMAL_REGISTRY_DIR" 2>/dev/null
