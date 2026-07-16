import test from 'node:test';
import assert from 'node:assert/strict';

class FakeClassList {
  constructor(names = []) { this.names = new Set(names); }
  add(...names) { names.forEach(name => this.names.add(name)); }
  remove(...names) { names.forEach(name => this.names.delete(name)); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.names.has(name) : Boolean(force);
    enabled ? this.names.add(name) : this.names.delete(name);
    return enabled;
  }
  contains(name) { return this.names.has(name); }
}

class FakeElement {
  constructor({ id = '', classes = [], dataset = {}, value = '' } = {}) {
    this.id = id;
    this.dataset = dataset;
    this.value = value;
    this.textContent = '';
    this.disabled = false;
    this.children = [];
    this.listeners = new Map();
    this.classList = new FakeClassList(classes);
    this.className = classes.join(' ');
    this.style = {};
    this._innerHTML = '';
  }
  set innerHTML(value) { this._innerHTML = String(value); this.children = []; }
  get innerHTML() { return this._innerHTML; }
  appendChild(child) { this.children.push(child); return child; }
  removeChild(child) { this.children = this.children.filter(item => item !== child); }
  setAttribute() {}
  select() {}
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  async dispatch(type) {
    for (const handler of this.listeners.get(type) || []) await handler({ currentTarget: this });
  }
}

const ids = [
  'statusValue', 'statusSub', 'profileValue', 'versionValue', 'deviceValue', 'deviceSub',
  'addonValue', 'addonSub', 'thermalStateValue', 'thermalProfileValue', 'thermalRebootValue',
  'thermalMessage', 'healthPill', 'rootPill', 'tempPill', 'updaterPill', 'kernelValue',
  'buildValue', 'storageValue', 'networkValue', 'swapValue', 'updatedValue',
  'profileActiveSmooth', 'profileGaming', 'setActiveSmoothBtn', 'setGamingBtn',
  'thermalEnableBtn', 'thermalDisableBtn', 'thermalBalancedBtn', 'thermalGamingBtn',
  'thermalChargeCoolBtn', 'logBox', 'snapshotBox', 'appSelect', 'appSearch',
  'optimizationBox', 'maintenanceBox', 'profileBox', 'thermalBox', 'copyLogBtn',
  'maintenanceAllBtn', 'refreshAppsBtn', 'optimizeAllBtn', 'optimizeSystemBtn',
  'dexoptJobBtn', 'optimizeSelectedBtn', 'loadSnapshotBtn', 'copySnapshotBtn',
  'overview', 'profiles', 'maintenance', 'logs', 'support'
];

const elements = new Map(ids.map(id => [id, new FakeElement({ id })]));
const actionIds = [
  'setActiveSmoothBtn', 'setGamingBtn', 'thermalEnableBtn', 'thermalDisableBtn',
  'thermalBalancedBtn', 'thermalGamingBtn', 'thermalChargeCoolBtn', 'copyLogBtn',
  'maintenanceAllBtn', 'refreshAppsBtn', 'optimizeAllBtn', 'optimizeSystemBtn',
  'dexoptJobBtn', 'optimizeSelectedBtn', 'loadSnapshotBtn', 'copySnapshotBtn'
];
for (const id of actionIds) elements.get(id).classList.add('action');

const tabs = ['overview', 'profiles', 'maintenance', 'logs', 'support'].map((name, index) =>
  new FakeElement({ classes: index ? ['tab'] : ['tab', 'active'], dataset: { tab: name } })
);
const sections = ['overview', 'profiles', 'maintenance', 'logs', 'support'].map((id, index) => {
  const el = elements.get(id);
  el.classList.add('section');
  if (!index) el.classList.add('active');
  return el;
});
const logButtons = ['debug.log', 'debug.previous.log', 'maintenance.log'].map((name, index) =>
  new FakeElement({ classes: index ? ['logBtn'] : ['logBtn', 'active'], dataset: { log: name } })
);

globalThis.window = globalThis;
globalThis.document = {
  querySelector(selector) { return selector.startsWith('#') ? elements.get(selector.slice(1)) || null : null; },
  querySelectorAll(selector) {
    if (selector === '.tab') return tabs;
    if (selector === '.section') return sections;
    if (selector === '.logBtn') return logButtons;
    if (selector === 'button.action, button.safe, button.warnBtn') return actionIds.map(id => elements.get(id));
    return [];
  },
  createElement() { return new FakeElement(); },
  body: new FakeElement(),
  execCommand() { return true; }
};
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });

let nextInterval = 1;
const activeIntervals = new Set();
globalThis.setInterval = () => { const id = nextInterval++; activeIntervals.add(id); return id; };
globalThis.clearInterval = id => activeIntervals.delete(id);

let failAppList = false;
let failStatus = false;
let deferStatus = false;
const pendingStatusCallbacks = [];
const statusText = [
  'HEALTH=pass', 'VERSION=v2.6.5', 'MODEL=Pixel 9 Pro', 'DEVICE=caiman',
  'ANDROID_RELEASE=16', 'ANDROID_SDK=36', 'ROOT_ENV=KernelSU',
  'SELECTED_PROFILE=active_smooth', 'THERMAL_CONTROL_AVAILABLE=1',
  'THERMAL_CONTROL_MERGED=1', 'THERMAL_CONTROL_ENABLED=0',
  'DASHBOARD_UPDATER_STATE=running', 'BLOCK_AUDITED_LIST=sda sdb sdc sdd'
].join('\n');

globalThis.ksu = {
  fullScreen() {}, enableEdgeToEdge() {}, toast() {},
  exec(command, _options, callbackName) {
    if (command.includes('status-quiet') && deferStatus) {
      pendingStatusCallbacks.push(callbackName);
      return;
    }
    let errno = 0;
    let stdout = '';
    let stderr = '';
    if (command.includes('status-quiet') && failStatus) { errno = 1; stderr = 'module status unavailable'; }
    else if (command.includes('status-quiet')) stdout = statusText;
    else if (command.includes('maintenance-status')) stdout = 'STATE=idle\n';
    else if (command.includes('app-opt-status')) stdout = 'STATE=done\nLABEL=App optimization\n';
    else if (command.includes('app-opt-log')) stdout = 'Finished';
    else if (command.includes('thermal-detect')) stdout = '';
    else if (command.includes('list-apps') && failAppList) { errno = 1; stderr = 'package manager unavailable'; }
    else if (command.includes('list-apps')) stdout = 'user|com.example.app\n';
    else if (command.includes('optimize-apps-async')) stdout = 'Started';
    queueMicrotask(() => globalThis[callbackName](errno, stdout, stderr));
  }
};

await import('../webroot/index.mjs?regression-test');
await new Promise(resolve => setTimeout(resolve, 0));

test('a task that is already complete does not leave a polling interval active', async () => {
  activeIntervals.clear();
  await elements.get('optimizeAllBtn').dispatch('click');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(activeIntervals.size, 0, 'completed task left a polling interval active');
});

test('app-list failure replaces loading state and prevents selected-app optimization', async () => {
  failAppList = true;
  await tabs.find(tab => tab.dataset.tab === 'maintenance').dispatch('click');
  const select = elements.get('appSelect');
  assert.equal(select.children.length, 1, 'selector should contain an error option');
  assert.equal(select.children[0].textContent, 'App list unavailable');
  assert.equal(elements.get('optimizeSelectedBtn').disabled, true);
  assert.match(elements.get('optimizationBox').textContent, /package manager unavailable/);
});

test('selected-app optimization is enabled only when the filtered list has options', async () => {
  failAppList = false;
  await tabs.find(tab => tab.dataset.tab === 'maintenance').dispatch('click');
  assert.equal(elements.get('optimizeSelectedBtn').disabled, false, 'available app should enable optimization');
  elements.get('appSearch').value = 'does.not.exist';
  await elements.get('appSearch').dispatch('input');
  assert.equal(elements.get('optimizeSelectedBtn').disabled, true, 'empty filter result should disable optimization');
  await elements.get('optimizeAllBtn').dispatch('click');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(elements.get('optimizeSelectedBtn').disabled, true, 'busy-to-idle transition should preserve empty selection state');
});

test('state-dependent actions stay disabled while initial status is pending', async () => {
  deferStatus = true;
  for (const id of actionIds) elements.get(id).disabled = false;
  await import('../webroot/index.mjs?status-pending-test');
  assert.equal(elements.get('setGamingBtn').disabled, true);
  assert.equal(elements.get('thermalEnableBtn').disabled, true);
  assert.equal(elements.get('optimizeAllBtn').disabled, true);
  deferStatus = false;
  for (const callbackName of pendingStatusCallbacks.splice(0)) {
    globalThis[callbackName](0, statusText, '');
  }
  await new Promise(resolve => setTimeout(resolve, 0));
});

test('initial status failure disables actions that depend on module state', async () => {
  failStatus = true;
  for (const id of actionIds) elements.get(id).disabled = false;
  await import('../webroot/index.mjs?status-failure-test');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(elements.get('statusValue').textContent, 'Unavailable');
  assert.equal(elements.get('setGamingBtn').disabled, true);
  assert.equal(elements.get('thermalEnableBtn').disabled, true);
  assert.equal(elements.get('optimizeAllBtn').disabled, true);
});
