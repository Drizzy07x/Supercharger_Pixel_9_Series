#!/system/bin/sh

DEVICE="$(getprop ro.product.device)"
MODEL="$(getprop ro.product.model)"
SDK="$(getprop ro.build.version.sdk)"
RELEASE="$(getprop ro.build.version.release)"

ui_print "*********************************************************"
ui_print "  Pixel 9 Series Supercharger"
ui_print "  Build: v2.5.1"
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

rm -f "$MODPATH/dashboard_updater.pid" "$MODPATH/.dashboard_updater.lock" 2>/dev/null
rm -f "$MODPATH/app_optimization.pid" "$MODPATH/maintenance_task.pid" 2>/dev/null
rm -rf "$MODPATH/.app_optimization.lock" "$MODPATH/.maintenance.lock" 2>/dev/null
[ -f "$MODPATH/debug.log" ] && mv -f "$MODPATH/debug.log" "$MODPATH/debug.previous.log" 2>/dev/null
touch "$MODPATH/debug.log" "$MODPATH/maintenance.log" "$MODPATH/module_status.env" "$MODPATH/addon_api.env" "$MODPATH/support_snapshot.txt"
[ -f "$MODPATH/current_profile" ] || echo "active_smooth" > "$MODPATH/current_profile"

set_perm_recursive "$MODPATH" 0 0 0755 0644
set_perm "$MODPATH/service.sh" 0 0 0755
set_perm "$MODPATH/customize.sh" 0 0 0755
set_perm "$MODPATH/uninstall.sh" 0 0 0755
[ -d "$MODPATH/bin" ] && set_perm_recursive "$MODPATH/bin" 0 0 0755 0755
[ -d "$MODPATH/webroot" ] && set_perm_recursive "$MODPATH/webroot" 0 0 0755 0644
set_perm "$MODPATH/debug.log" 0 0 0644
set_perm "$MODPATH/maintenance.log" 0 0 0644
set_perm "$MODPATH/module_status.env" 0 0 0644
set_perm "$MODPATH/addon_api.env" 0 0 0644
set_perm "$MODPATH/support_snapshot.txt" 0 0 0644
set_perm "$MODPATH/current_profile" 0 0 0644

ui_print ""
ui_print " [OK] Installation complete. Reboot required."
