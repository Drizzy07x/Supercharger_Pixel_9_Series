#!/system/bin/sh

DEVICE="$(getprop ro.product.device)"
MODEL="$(getprop ro.product.model)"
SDK="$(getprop ro.build.version.sdk)"
RELEASE="$(getprop ro.build.version.release)"

ui_print "*********************************************************"
ui_print "  Pixel 9 Series Supercharger"
ui_print "  Build: v2.6.5"
ui_print "*********************************************************"

case "$DEVICE" in
  komodo|caiman|comet|tokay)
    ui_print " [OK] Target hardware verified: $MODEL ($DEVICE)"
    ;;
  *)
    ui_print " [ERROR] Incompatible device: $DEVICE"
    abort " Pixel 9 / Pixel 9 Pro / Pixel 9 Pro XL only "
    ;;
esac

ui_print " [INFO] Android: ${RELEASE:-unknown} / SDK ${SDK:-unknown}"
ui_print " [INFO] Preparing profile manager"
ui_print ""
ui_print " Preparing module files"
ui_print " Preparing WebUI dashboard"
ui_print " Preparing maintenance tools"
ui_print " Preparing profile sync hooks and Performance / Gaming profile"

PERSIST_STATE_DIR="/data/adb/supercharger_state"

restore_persistent_state() {
  state_name="$1"
  state_dest="$2"
  state_value=""
  [ -r "$PERSIST_STATE_DIR/$state_name" ] && state_value="$(tr -d '\r\n' < "$PERSIST_STATE_DIR/$state_name" 2>/dev/null)"
  case "$state_name:$state_value" in
    current_profile:active_smooth|current_profile:performance_gaming) : ;;
    thermal_current_profile:balanced|thermal_current_profile:gaming|thermal_current_profile:charge_cool) : ;;
    thermal_current_profile:*) state_value="balanced" ;;
    *) state_value="active_smooth" ;;
  esac
  echo "$state_value" > "$state_dest"
}

rm -f "$MODPATH/dashboard_updater.pid" "$MODPATH/.dashboard_updater.lock" 2>/dev/null
rm -f "$MODPATH/app_optimization.pid" "$MODPATH/maintenance_task.pid" 2>/dev/null
rm -rf "$MODPATH/.app_optimization.lock" "$MODPATH/.maintenance.lock" 2>/dev/null
[ -f "$MODPATH/debug.log" ] && mv -f "$MODPATH/debug.log" "$MODPATH/debug.previous.log" 2>/dev/null
touch "$MODPATH/debug.log" "$MODPATH/maintenance.log" "$MODPATH/module_status.env" "$MODPATH/addon_api.env" "$MODPATH/support_snapshot.txt"
restore_persistent_state current_profile "$MODPATH/current_profile"
rm -f "$MODPATH/system/vendor/etc/thermal_info_config.json" \
      "$MODPATH/system/vendor/etc/thermal_info_config_lpm.json" \
      "$MODPATH/system/vendor/etc/thermal_info_config_charge.json" 2>/dev/null
rmdir "$MODPATH/system/vendor/etc" "$MODPATH/system/vendor" "$MODPATH/system" 2>/dev/null || true
cat > "$MODPATH/thermal_control.env" <<'EOF_THERMAL_DEFAULT'
THERMAL_CONTROL_MERGED="1"
THERMAL_CONTROL_AVAILABLE="1"
THERMAL_CONTROL_ENABLED="0"
THERMAL_CONTROL_PROFILE="balanced"
THERMAL_CONTROL_LABEL="Balanced"
THERMAL_CONTROL_OVERLAY_ACTIVE="0"
THERMAL_CONTROL_REBOOT_REQUIRED="0"
THERMAL_CONTROL_MESSAGE="Off by default for a safe first boot. Enable it after the phone boots normally."
EOF_THERMAL_DEFAULT
restore_persistent_state thermal_current_profile "$MODPATH/thermal_current_profile"

if [ -f "$MODPATH/service.sh" ]; then
  tmp="$MODPATH/service.sh.tmp.$$"
  if sed 's/^PROFILE_VERSION=.*/PROFILE_VERSION="v2.6.5"/' "$MODPATH/service.sh" > "$tmp" 2>/dev/null; then
    mv -f "$tmp" "$MODPATH/service.sh" 2>/dev/null
  else
    rm -f "$tmp" 2>/dev/null
  fi
fi

set_perm "$MODPATH" 0 0 0755
set_perm "$MODPATH/module.prop" 0 0 0644
set_perm "$MODPATH/system.prop" 0 0 0644
set_perm "$MODPATH/update.json" 0 0 0644
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/customize.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
[ -d "$MODPATH/bin" ] && set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
[ -d "$MODPATH/thermal_profiles" ] && set_perm_recursive "$MODPATH/thermal_profiles" 0 0 0755 0644
set_perm "$MODPATH/debug.log" 0 0 0644
set_perm "$MODPATH/maintenance.log" 0 0 0644
set_perm "$MODPATH/module_status.env" 0 0 0644
set_perm "$MODPATH/addon_api.env" 0 0 0644
set_perm "$MODPATH/support_snapshot.txt" 0 0 0644
set_perm "$MODPATH/current_profile" 0 0 0644
set_perm "$MODPATH/thermal_control.env" 0 0 0644
set_perm "$MODPATH/thermal_current_profile" 0 0 0644

ui_print ""
ui_print " [OK] Installation complete. Reboot required."
