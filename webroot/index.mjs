import { exec, toast, fullScreen, enableEdgeToEdge } from './kernelsu.js';

const MODDIR = '/data/adb/modules/p9pxl_supercharger';
const CTL = `${MODDIR}/bin/supercharger_ctl.sh`;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let status = {};
let currentLog = 'debug.log';
let appEntries = [];
let commandBusy = false;
let appPollTimer = null;
let maintPollTimer = null;
const TASK_POLL_MS = 1800;

try { fullScreen(false); enableEdgeToEdge(false); } catch (_) {}

async function sh(cmd){
  const res = await exec(cmd);
  if(res.errno !== 0) throw new Error((res.stderr || res.stdout || `errno=${res.errno}`).trim());
  return res.stdout || '';
}

function parseEnv(text){
  const out = {};
  for(const rawLine of String(text || '').split(/\r?\n/)){
    const line = rawLine.trim();
    if(!line || line.startsWith('#')) continue;

    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if(!m) continue;

    let value = m[2].trim();
    if(value.length >= 2){
      const first = value[0];
      const last = value[value.length - 1];
      if((first === '"' || first === "'") && first === last){
        value = value.slice(1, -1);
        if(first === "'") value = value.replace(/'\\''/g, "'");
        if(first === '"') value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
    }

    out[m[1]] = value;
  }
  return out;
}

function setText(id, value){ const el = $(id); if(el) el.textContent = value || '—'; }
function setPill(id, text, kind){ const el = $(id); if(!el) return; el.textContent = text || '—'; el.className = `pill ${kind || ''}`.trim(); }
function isRunning(value){ return String(value || '').toLowerCase() === 'running'; }
function setActionsBusy(busy){ commandBusy = busy; $$('button.action, button.safe, button.warnBtn').forEach(btn => { btn.disabled = busy; }); updateProfileButtons(); updateThermalButtons(); }
function showHeaderTask(label){ setText('#statusValue', 'Working'); setText('#statusSub', label || 'Background task running'); }

function addonLabel(s){
  if(String(s.THERMAL_CONTROL_MERGED || '0') === '1') return 'Merged';
  return String(s.THERMAL_ADDON_INSTALLED || '0') === '1' ? 'Installed' : 'Not installed';
}
function addonSub(s){
  if(String(s.THERMAL_CONTROL_MERGED || '0') === '1'){
    const mode = thermalEnabled() ? 'on' : 'off';
    const profile = s.THERMAL_CONTROL_LABEL || thermalProfile();
    return `${mode} · ${profile}`;
  }
  const installed = String(s.THERMAL_ADDON_INSTALLED || '0') === '1';
  const target = s.THERMAL_PROFILE_REQUEST ? ` · target: ${s.THERMAL_PROFILE_REQUEST}` : '';
  return installed ? `${s.THERMAL_ADDON_VERSION || 'installed'}${target}` : `not available${target}`;
}

async function resolveThermalAddon(){
  if(String(status.THERMAL_ADDON_INSTALLED || '0') === '1') return;
  try {
    const out = await sh(`sh '${CTL}' thermal-detect 2>/dev/null || true`);
    const detected = String(out || '').match(/Detected:\s*([01])\|([^\n]+)/i);
    if(detected && detected[1] === '1'){
      status.THERMAL_ADDON_INSTALLED = '1';
      status.THERMAL_ADDON_VERSION = detected[2].trim() || 'installed';
      return;
    }

    const registry = parseEnv(out);
    if(String(registry.THERMAL_CONTROL_INSTALLED || '0') === '1' || registry.THERMAL_CONTROL_VERSION){
      status.THERMAL_ADDON_INSTALLED = '1';
      const state = registry.THERMAL_CONTROL_STATE && registry.THERMAL_CONTROL_STATE !== 'active' ? ` (${registry.THERMAL_CONTROL_STATE})` : '';
      status.THERMAL_ADDON_VERSION = `${registry.THERMAL_CONTROL_VERSION || 'installed'}${state}`;
    }
  } catch (_) {}
}

function normalizeUpdaterState(raw){
  let state = String(raw || 'unknown');
  if(state.includes('|')) state = state.split('|').pop() || state;
  return state === 'none' ? 'stopped' : state;
}

function isMissingStorageValue(value){
  const v = String(value || '').trim().toLowerCase();
  return !v || v === '—' || v === 'none' || v === 'unknown' || v === 'not reported';
}

function extractStorageDevices(text){
  const found = [];
  const seen = new Set();
  for(const token of String(text || '').split(/[^A-Za-z0-9._-]+/).filter(Boolean)){
    if(/^(sd[a-z][a-z]?|mmcblk[0-9]+|nvme[0-9]+n[0-9]+)$/.test(token) && !seen.has(token)){
      seen.add(token);
      found.push(token);
    }
  }
  return found.join(', ');
}

function pixelStorageDefault(){
  const deviceText = [status.DEVICE, status.DEVICE_CODENAME, status.CODENAME, status.MODEL].map(v => String(v || '').toLowerCase()).join(' ');
  return /\b(komodo|caiman|tokay|comet)\b/.test(deviceText) || deviceText.includes('pixel 9') ? 'sda, sdb, sdc, sdd' : '';
}

function cleanStorageValue(value){
  const parsed = extractStorageDevices(value);
  if(parsed) return parsed;
  return isMissingStorageValue(value) ? (pixelStorageDefault() || 'Not reported') : String(value).trim();
}

async function resolveStorageValue(){
  const existing = cleanStorageValue(status.BLOCK_AUDITED_LIST);
  if(!isMissingStorageValue(existing)) return existing;

  const commands = [
    `sh '${CTL}' storage 2>/dev/null || true`,
    `grep -ihE 'Physical Block Devices|Audited Block Devices|Physical block devices detected|Block Verify|Block IO Stats' '${MODDIR}/support_snapshot.txt' '${MODDIR}/debug.log' '${MODDIR}/debug.previous.log' 2>/dev/null | tail -n 120 || true`
  ];

  for(const cmd of commands){
    try {
      const out = (await sh(cmd)).trim();
      const parsed = extractStorageDevices(out);
      if(parsed) return parsed;
    } catch (_) {}
  }

  return pixelStorageDefault() || 'Not reported';
}

function renderProfileCards(){
  const selected = status.SELECTED_PROFILE || 'active_smooth';
  $('#profileActiveSmooth')?.classList.toggle('active', selected === 'active_smooth');
  $('#profileGaming')?.classList.toggle('active', selected === 'performance_gaming');
  updateProfileButtons();
}

function updateProfileButtons(){
  const selected = status.SELECTED_PROFILE || 'active_smooth';
  const a = $('#setActiveSmoothBtn');
  const g = $('#setGamingBtn');
  if(a) a.disabled = commandBusy || selected === 'active_smooth';
  if(g) g.disabled = commandBusy || selected === 'performance_gaming';
}

function thermalEnabled(){ return String(status.THERMAL_CONTROL_ENABLED || '0') === '1'; }
function thermalAvailable(){ return String(status.THERMAL_CONTROL_AVAILABLE || '0') === '1'; }
function thermalProfile(){ return status.THERMAL_CONTROL_PROFILE || status.THERMAL_PROFILE_REQUEST || 'balanced'; }

function updateThermalButtons(){
  const available = thermalAvailable();
  const enabled = thermalEnabled();
  const profile = thermalProfile();
  const enable = $('#thermalEnableBtn');
  const disable = $('#thermalDisableBtn');
  const balanced = $('#thermalBalancedBtn');
  const gaming = $('#thermalGamingBtn');
  const charge = $('#thermalChargeCoolBtn');

  if(enable) enable.disabled = commandBusy || !available || enabled;
  if(disable) disable.disabled = commandBusy || !available || !enabled;
  if(balanced) balanced.disabled = commandBusy || !available || (enabled && profile === 'balanced');
  if(gaming) gaming.disabled = commandBusy || !available || (enabled && profile === 'gaming');
  if(charge) charge.disabled = commandBusy || !available || (enabled && profile === 'charge_cool');
}

function renderStatus(){
  const health = (status.HEALTH || 'unknown').toLowerCase();
  const healthKind = health === 'pass' ? 'good' : (health === 'warn' ? 'warn' : 'bad');
  const updater = normalizeUpdaterState(status.DASHBOARD_UPDATER_STATE || status.DASHBOARD_UPDATER_PID);
  const updaterKind = updater === 'running' ? 'good' : (updater === 'stale' ? 'warn' : '');
  const taskState = String(status.TASK_STATE || 'idle').toLowerCase();

  if(taskState === 'running'){
    setText('#statusValue', 'Working');
    setText('#statusSub', status.TASK_LABEL || 'Background task running');
  } else {
    setText('#statusValue', health === 'pass' ? 'Idle' : 'Check log');
    setText('#statusSub', health === 'pass' ? 'No background task running' : 'Audit warning detected');
  }

  setText('#profileValue', status.PROFILE_LABEL || status.PROFILE_MODE || '—');
  setText('#versionValue', `${status.VERSION || '—'} · ${status.PERFORMANCE_ENGINE_STATE || 'stable'}`);
  setText('#deviceValue', `${status.MODEL || 'Unknown'} (${status.DEVICE || 'unknown'})`);
  setText('#deviceSub', `Android ${status.ANDROID_RELEASE || '—'} / SDK ${status.ANDROID_SDK || '—'} · ${status.ROOT_ENV || 'Root unknown'}`);
  setText('#addonValue', addonLabel(status));
  setText('#addonSub', addonSub(status));
  setText('#thermalStateValue', thermalEnabled() ? 'On' : 'Off');
  setText('#thermalProfileValue', status.THERMAL_CONTROL_LABEL || thermalProfile());
  setText('#thermalRebootValue', String(status.THERMAL_CONTROL_REBOOT_REQUIRED || '0') === '1' ? 'Required' : 'Not required');
  setText('#thermalMessage', status.THERMAL_CONTROL_MESSAGE || 'Thermal Control is off by default. Enable it manually from WebUI.');
  setPill('#healthPill', `Health: ${status.HEALTH || 'unknown'}`, healthKind);
  setPill('#rootPill', `Root: ${status.ROOT_ENV || 'unknown'}`, '');
  setPill('#tempPill', `Temp: ${status.BATTERY_TEMP || 'unknown'}`, '');
  setPill('#updaterPill', `Updater: ${updater}`, updaterKind);
  setText('#kernelValue', status.KERNEL_RELEASE || '—');
  setText('#buildValue', status.BUILD_ID || '—');
  setText('#storageValue', cleanStorageValue(status.BLOCK_AUDITED_LIST));
  setText('#networkValue', status.NETWORK_CAPABILITY_SUMMARY || '—');
  setText('#swapValue', String(status.SWAP_ACTIVE || '0') === '1' ? `Active / page-cluster ${status.PAGE_CLUSTER_STATUS || '—'}` : 'Not active');
  setText('#updatedValue', status.LAST_UPDATED || '—');
  renderProfileCards();
  updateThermalButtons();
}

async function syncTaskStates(){
  const next = {};
  try { next.maint = parseEnv(await sh(`sh '${CTL}' maintenance-status 2>/dev/null || true`)); } catch (_) {}
  try { next.app = parseEnv(await sh(`sh '${CTL}' app-opt-status 2>/dev/null || true`)); } catch (_) {}
  return next;
}

function reconcileTasks(sync){
  const maintRunning = isRunning(sync?.maint?.STATE || status.MAINTENANCE_TASK_STATE);
  const appRunning = isRunning(sync?.app?.STATE || status.APP_OPT_TASK_STATE);

  if(maintRunning){
    status.TASK_STATE = 'running';
    status.TASK_LABEL = sync.maint.LABEL || 'One-tap maintenance';
  } else if(appRunning){
    status.TASK_STATE = 'running';
    status.TASK_LABEL = sync.app.LABEL || 'App optimization';
  } else {
    status.TASK_STATE = 'idle';
    status.TASK_LABEL = 'No background task running';
  }

  status.MAINTENANCE_TASK_STATE = sync?.maint?.STATE || status.MAINTENANCE_TASK_STATE || 'idle';
  status.APP_OPT_TASK_STATE = sync?.app?.STATE || status.APP_OPT_TASK_STATE || 'idle';
}

async function refreshStatus(){
  const out = await sh(`sh '${CTL}' status-quiet`);
  status = parseEnv(out);
  reconcileTasks(await syncTaskStates());
  status.BLOCK_AUDITED_LIST = await resolveStorageValue();
  await resolveThermalAddon();
  renderStatus();
  return status;
}

async function loadLog(name=currentLog){
  currentLog = name;
  $$('.logBtn').forEach(b => b.classList.toggle('active', b.dataset.log === name));
  $('#logBox').textContent = 'Loading…';
  try {
    const out = await sh(`cat '${MODDIR}/${name}' 2>/dev/null || echo 'No ${name} found.'`);
    $('#logBox').textContent = out.trim() || `No ${name} content.`;
  } catch(e){
    $('#logBox').textContent = `Failed to read ${name}: ${e.message}`;
  }
}

async function loadSnapshot(){
  $('#snapshotBox').textContent = 'Loading…';
  try {
    const out = await sh(`cat '${MODDIR}/support_snapshot.txt' 2>/dev/null || echo 'No support snapshot found.'`);
    $('#snapshotBox').textContent = out.trim() || 'No support snapshot content.';
  } catch(e){
    $('#snapshotBox').textContent = `Failed to load support snapshot: ${e.message}`;
  }
}

async function copyText(text, button){
  const old = button ? button.textContent : '';
  let copied = false;
  try {
    if(navigator.clipboard?.writeText){
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch (_) {}

  if(!copied){
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly','');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      copied = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (_) {}
  }

  if(button){
    button.textContent = copied ? 'Copied' : 'Copy failed';
    setTimeout(() => { button.textContent = old; }, 1400);
  }
  try { toast(copied ? 'Copied' : 'Copy failed'); } catch (_) {}
}

function shellQuote(value){ return "'" + String(value).replace(/'/g, "'\\''") + "'"; }

function parseAppLine(line){
  const raw = String(line || '').trim();
  if(!raw) return null;
  if(raw.includes('|')){
    const [type, ...rest] = raw.split('|');
    const pkg = rest.join('|').trim();
    return pkg ? {type:type.trim() || 'app', pkg} : null;
  }
  return {type:'app', pkg:raw};
}

function renderAppList(filter=''){
  const select = $('#appSelect');
  if(!select) return;

  const q = String(filter || '').trim().toLowerCase();
  const filtered = q ? appEntries.filter(entry => `${entry.type} ${entry.pkg}`.toLowerCase().includes(q)) : appEntries;
  select.innerHTML = '';

  if(!filtered.length){
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = appEntries.length ? 'No match found' : 'No optimizable apps reported';
    select.appendChild(opt);
    return;
  }

  for(const entry of filtered){
    const opt = document.createElement('option');
    opt.value = entry.pkg;
    opt.textContent = `[${entry.type}] ${entry.pkg}`;
    select.appendChild(opt);
  }
}

async function loadAppList(){
  const select = $('#appSelect');
  if(!select) return;

  select.innerHTML = '<option value="">Loading optimizable apps…</option>';
  try {
    const out = await sh(`sh '${CTL}' list-apps`);
    const seen = new Set();
    appEntries = [];
    for(const line of out.split(/\r?\n/)){
      const entry = parseAppLine(line);
      if(!entry || seen.has(entry.pkg)) continue;
      seen.add(entry.pkg);
      appEntries.push(entry);
    }
    renderAppList($('#appSearch')?.value || '');
    const userCount = appEntries.filter(x => x.type === 'user').length;
    const systemCount = appEntries.filter(x => x.type === 'system').length;
    $('#optimizationBox').textContent = appEntries.length ? `App list ready. User apps: ${userCount}. Safe system apps: ${systemCount}.` : 'No optimizable apps reported by Android package manager.';
  } catch(e){
    $('#optimizationBox').textContent = `Failed to refresh app list:\n${e.message}`;
  }
}

async function readOptimizationProgress(){ return { state: parseEnv(await sh(`sh '${CTL}' app-opt-status 2>/dev/null || true`)), log: await sh(`sh '${CTL}' app-opt-log 2>/dev/null || true`) }; }
async function readMaintenanceProgress(){ return { state: parseEnv(await sh(`sh '${CTL}' maintenance-status 2>/dev/null || true`)), log: await sh(`sh '${CTL}' maintenance-log 2>/dev/null || true`) }; }

function stopTimer(kind){
  if(kind === 'app' && appPollTimer){ clearInterval(appPollTimer); appPollTimer = null; }
  if(kind === 'maintenance' && maintPollTimer){ clearInterval(maintPollTimer); maintPollTimer = null; }
}

async function updateOptimizationProgress(label){
  const progress = await readOptimizationProgress();
  const state = String(progress.state.STATE || 'idle').toLowerCase();
  const job = progress.state.LABEL || label || 'App optimization';
  $('#optimizationBox').textContent = `${job}\nState: ${state}\n\n${(progress.log || '').trim() || 'Waiting for optimization output…'}`;
  if(isRunning(state)){ showHeaderTask(job); return true; }
  status.APP_OPT_TASK_STATE = state || 'idle';
  status.TASK_STATE = 'idle';
  status.TASK_LABEL = 'No background task running';
  setActionsBusy(false);
  await refreshStatus();
  return false;
}

function startOptimizationPolling(label){
  stopTimer('app');
  showHeaderTask(label);
  setActionsBusy(true);
  updateOptimizationProgress(label).catch(e => {
    setActionsBusy(false);
    $('#optimizationBox').textContent = `Failed to read optimization progress:\n${e.message}`;
  });
  appPollTimer = setInterval(async () => {
    try { if(!await updateOptimizationProgress(label)) stopTimer('app'); }
    catch(e){ stopTimer('app'); setActionsBusy(false); $('#optimizationBox').textContent = `Failed to read optimization progress:\n${e.message}`; }
  }, TASK_POLL_MS);
}

async function updateMaintenanceProgress(label){
  const progress = await readMaintenanceProgress();
  const state = String(progress.state.STATE || 'idle').toLowerCase();
  const job = progress.state.LABEL || label || 'One-tap maintenance';
  $('#maintenanceBox').textContent = `${job}\nState: ${state}\n\n${(progress.log || '').trim() || 'Waiting for maintenance output…'}`;
  if(isRunning(state)){ showHeaderTask(job); return true; }
  status.MAINTENANCE_TASK_STATE = state || 'idle';
  status.TASK_STATE = 'idle';
  status.TASK_LABEL = 'No background task running';
  setActionsBusy(false);
  await refreshStatus();
  return false;
}

function startMaintenancePolling(label){
  stopTimer('maintenance');
  showHeaderTask(label);
  setActionsBusy(true);
  updateMaintenanceProgress(label).catch(e => {
    setActionsBusy(false);
    $('#maintenanceBox').textContent = `Failed to read maintenance progress:\n${e.message}`;
  });
  maintPollTimer = setInterval(async () => {
    try { if(!await updateMaintenanceProgress(label)) stopTimer('maintenance'); }
    catch(e){ stopTimer('maintenance'); setActionsBusy(false); $('#maintenanceBox').textContent = `Failed to read maintenance progress:\n${e.message}`; }
  }, TASK_POLL_MS);
}

async function runOptimization(label, startCmd){
  if(commandBusy) return;
  setActionsBusy(true);
  showHeaderTask(label);
  $('#optimizationBox').textContent = 'Starting…';
  try {
    const out = await sh(startCmd);
    $('#optimizationBox').textContent = out.trim() || 'Started.';
    startOptimizationPolling(label);
  } catch(e){
    setActionsBusy(false);
    await refreshStatus().catch(() => {});
    $('#optimizationBox').textContent = `Failed to start optimization:\n${e.message}`;
  }
}

async function runMaintenance(label, startCmd){
  if(commandBusy) return;
  setActionsBusy(true);
  showHeaderTask(label);
  $('#maintenanceBox').textContent = 'Starting…';
  try {
    const out = await sh(startCmd);
    $('#maintenanceBox').textContent = out.trim() || 'Started.';
    startMaintenancePolling(label);
  } catch(e){
    setActionsBusy(false);
    await refreshStatus().catch(() => {});
    $('#maintenanceBox').textContent = `Failed to start maintenance:\n${e.message}`;
  }
}

async function setProfile(profile){
  if(commandBusy) return;
  setActionsBusy(true);
  $('#profileBox').textContent = 'Applying profile selection…';
  try {
    const out = await sh(`sh '${CTL}' set-profile ${shellQuote(profile)}`);
    $('#profileBox').textContent = out.trim() || 'Profile updated.';
    await refreshStatus();
  } catch(e){
    $('#profileBox').textContent = `Failed to update profile:\n${e.message}`;
  } finally {
    setActionsBusy(false);
  }
}

async function runThermal(command, label){
  if(commandBusy) return;
  setActionsBusy(true);
  $('#thermalBox').textContent = `${label}…`;
  try {
    const out = await sh(`sh '${CTL}' ${command}`);
    $('#thermalBox').textContent = out.trim() || 'Thermal command completed.';
    await refreshStatus();
  } catch(e){
    $('#thermalBox').textContent = `Thermal command failed:\n${e.message}`;
  } finally {
    setActionsBusy(false);
  }
}

function setThermalProfile(profile){
  const command = thermalEnabled() ? `thermal-set-profile ${shellQuote(profile)}` : `thermal-enable ${shellQuote(profile)}`;
  runThermal(command, `Applying ${profile.replace('_', ' ')}`);
}

function resumeActiveTaskPolling(){
  if(isRunning(status.APP_OPT_TASK_STATE)) startOptimizationPolling(status.APP_OPT_TASK_LABEL || 'App optimization');
  if(isRunning(status.MAINTENANCE_TASK_STATE)) startMaintenancePolling(status.MAINTENANCE_TASK_LABEL || 'One-tap maintenance');
}

$$('.tab').forEach(btn => btn.addEventListener('click', async () => {
  $$('.tab').forEach(b => b.classList.remove('active'));
  $$('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  $(`#${btn.dataset.tab}`).classList.add('active');
  if(btn.dataset.tab === 'logs') await loadLog(currentLog);
  if(btn.dataset.tab === 'maintenance') await loadAppList();
}));

$$('.logBtn').forEach(btn => btn.addEventListener('click', () => loadLog(btn.dataset.log)));
$('#copyLogBtn')?.addEventListener('click', () => copyText($('#logBox').textContent || '', $('#copyLogBtn')));
$('#maintenanceAllBtn')?.addEventListener('click', () => runMaintenance('One-tap maintenance', `sh '${CTL}' maintenance-all-async`));
$('#refreshAppsBtn')?.addEventListener('click', loadAppList);
$('#appSearch')?.addEventListener('input', () => renderAppList($('#appSearch').value));
$('#optimizeAllBtn')?.addEventListener('click', () => runOptimization('Optimizing listed apps', `sh '${CTL}' optimize-apps-async`));
$('#optimizeSystemBtn')?.addEventListener('click', () => runOptimization('Optimizing safe system apps', `sh '${CTL}' optimize-system-apps-async`));
$('#dexoptJobBtn')?.addEventListener('click', () => runOptimization('Android system dexopt job', `sh '${CTL}' dexopt-job-async`));
$('#optimizeSelectedBtn')?.addEventListener('click', () => {
  const pkg = $('#appSelect').value;
  if(!pkg){ $('#optimizationBox').textContent = 'Select an app first.'; return; }
  runOptimization(`Optimizing ${pkg}`, `sh '${CTL}' optimize-app-async ${shellQuote(pkg)}`);
});
$('#setActiveSmoothBtn')?.addEventListener('click', () => setProfile('active_smooth'));
$('#setGamingBtn')?.addEventListener('click', () => setProfile('performance_gaming'));
$('#thermalEnableBtn')?.addEventListener('click', () => runThermal('thermal-enable', 'Enabling Thermal Control'));
$('#thermalDisableBtn')?.addEventListener('click', () => runThermal('thermal-disable', 'Disabling Thermal Control'));
$('#thermalBalancedBtn')?.addEventListener('click', () => setThermalProfile('balanced'));
$('#thermalGamingBtn')?.addEventListener('click', () => setThermalProfile('gaming'));
$('#thermalChargeCoolBtn')?.addEventListener('click', () => setThermalProfile('charge_cool'));
$('#loadSnapshotBtn')?.addEventListener('click', loadSnapshot);
$('#copySnapshotBtn')?.addEventListener('click', () => copyText($('#snapshotBox').textContent || '', $('#copySnapshotBtn')));

refreshStatus()
  .then(() => { resumeActiveTaskPolling(); })
  .catch(e => { setText('#statusValue', 'Unavailable'); setText('#statusSub', e.message || 'Could not read module status'); });
