const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {html} = require('./panel.js');
const nodes = new Map();
for (const match of html.matchAll(/id="([^"]+)"/g)) {
  assert.ok(!nodes.has(match[1]), 'Duplicate element ID');
  nodes.set(match[1], {value: '', checked: false, disabled: /^(csv|save)$/.test(match[1]), textContent: '', addEventListener() {}});
}
const shadowEvents = new Map();
const shadow = {innerHTML: '', addEventListener: (name, fn) => shadowEvents.set(name, fn), getElementById: id => {
  assert.ok(nodes.has(id), `Missing UI control: ${id}`); return nodes.get(id);
}};
let host = null, clickHandler = null, selected = false, download = null;
const collection = [{source_track_id: '1', artist: 'Исполнитель', title: 'Песня'}, {source_track_id: '2', artist: 'Артист', title: 'Вторая'}];
const list = {isConnected: true, querySelectorAll: () => collection};
const row = {closest: () => row};
const document = {
  getElementById: () => host,
  createElement: tag => tag === 'div' ? {id: '', hidden: false, attachShadow: () => shadow} : {click() {download = this.download;}},
  documentElement: {append: el => {host = el;}},
  addEventListener: (name, fn) => {if (name === 'click') clickHandler = fn;},
  removeEventListener: () => {clickHandler = null;}
};
const context = vm.createContext({document, HTMLElement: class {},
  VkExportPanel: {html}, VkExportAdapter: {selector: 'row', read: value => value, listContainer: () => list},
  VkExportMerge: require('./merge.js'), VkExportAudit: require('./audit.js'), VkExportFilename: require('./filename.js'), VkExportCsv: require('./csv.js'),
  MutationObserver: class {observe() {} disconnect() {}}, Blob, URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}}, setTimeout: () => 1, clearTimeout() {}});
const code = fs.readFileSync(require.resolve('./collector.js'), 'utf8');
vm.runInContext(code, context);
assert.ok(nodes.get('csv').disabled);
nodes.get('collection-name').value = 'Мой плейлист';
nodes.get('select').onclick();
clickHandler({target: row, composedPath: () => [], preventDefault() {}, stopImmediatePropagation() {selected = true;}});
assert.ok(selected);
assert.equal(nodes.get('count').textContent, '2');
assert.equal(nodes.get('csv').disabled, false);
assert.equal(nodes.get('select').disabled, true);
nodes.get('csv').onclick();
assert.equal(download, 'Мой плейлист.csv');
nodes.get('close').onclick();
assert.equal(host.hidden, true);
vm.runInContext(code, context);
assert.equal(host.hidden, false);
assert.equal(nodes.get('count').textContent, '2');
nodes.get('reset').onclick();
assert.equal(nodes.get('count').textContent, '0');
assert.equal(nodes.get('csv').disabled, true);
assert.equal(nodes.get('select').disabled, false);
assert.equal(nodes.get('collection-name').value, '');
assert.ok(shadowEvents.has('keydown'));
assert.equal((html.match(/<details/g) || []).length, 3);
console.log('PASS: panel initialization, list selection, count, named CSV download, hide/reopen preserves collection, reset, collapsed help controls. Visual layout requires browser confirmation.');
