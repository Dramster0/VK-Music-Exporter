const assert = require('node:assert/strict');
const {merge} = require('./merge.js');
const row = id => ({source_track_id: id, artist: 'Исполнитель', title: id, duration_seconds: null});
const a = ['A','B','A'].map(row);
assert.deepEqual(merge([], a).rows, a); // Genuine duplicate survives.
assert.deepEqual(merge(a, ['B','A','C'].map(row)).rows.map(x=>x.title), ['A','B','A','C']);
assert.equal(merge(a, a).rows.length, 3);
assert.equal(merge(a, ['X','Y'].map(row)).gap, true);
assert.equal(merge(a, ['X','Y'].map(row)).rows.length, 3);
assert.deepEqual(merge(a, []).rows, a);
console.log('PASS: occurrence preservation, overlapping windows, unchanged windows, gap detection, empty window.');
const adapter = require('./adapter.js');
const text = value => ({textContent: value, children: []});
const title = text('Песня, "пример"');
const artist = text('Исполнитель');
const metadata = {querySelector: s => ({'.vkit-bC5yeH': title, '.vkit-6B6OHT': artist})[s] || null};
const list = {tagName: 'DIV', querySelectorAll: () => [1, 2], getAttribute: () => 'list', parentElement: null};
let times = [text('3:51')];
const modern = {
  hasAttribute: name => name === 'data-audio-id',
  querySelector: s => s === '.vkit-zm1fLg' ? metadata : null,
  querySelectorAll: () => times,
  getAttribute: name => name === 'data-audio-id' ? '-12_34' : null,
  parentElement: list
};
assert.deepEqual(adapter.read(modern), {artist: 'Исполнитель', title: 'Песня, "пример"', album: '', duration_seconds: null, source_track_id: '-12_34', source_url: '', availability: 'unknown'});
assert.equal(adapter.listContainer(modern), list);
times = [text('0:44'), text('3:51')];
assert.equal(adapter.read(modern).duration_seconds, null, 'Do not guess between elapsed time and duration');
artist.textContent = '';
assert.equal(adapter.read(modern), null, 'Reject incomplete metadata');
const legacy = {
  hasAttribute: () => false,
  querySelector: s => ({'.audio_row__title_inner, .audio_row__title': text('Legacy'), '.audio_row__performers': text('Artist'), '.audio_row__duration': text('4:28')})[s],
  getAttribute: () => '1_2', closest: () => null, parentElement: list
};
assert.equal(adapter.read(legacy).duration_seconds, 268);
assert.equal(adapter.listContainer(legacy), list);
console.log('PASS: modern metadata mapping, sortable list container, ambiguous time, missing artist, legacy mapping. DOM selectors require live confirmation.');
const unique = ['A','B','C'].map(row);
assert.equal(merge(unique, unique).ambiguous, false);
assert.equal(merge(a, a).ambiguous, true);
const changedDuration = {...unique[2], duration_seconds: 231};
assert.equal(merge(unique, [changedDuration, row('D')]).gap, undefined);
assert.equal(merge(unique, [changedDuration, row('D')]).rows[2].duration_seconds, 231);
const {audit} = require('./audit.js');
const checks = {expectedText: '3', startConfirmed: true, endConfirmed: true};
assert.equal(audit(unique, checks).checks_passed, true);
assert.equal(audit(unique, checks).status, 'unverified');
assert.equal(audit(unique, {...checks, expectedText: '4'}).checks_passed, false);
assert.equal(audit(unique, {...checks, expectedText: '1.3k'}).expected_count, null);
assert.equal(audit(unique, {...checks, expectedText: '-3'}).expected_count, null);
assert.equal(audit(unique, {...checks, expectedText: ''}).checks_passed, false);
assert.equal(audit(unique, {...checks, gap: true}).status, 'partial');
assert.equal(audit(unique, {...checks, parseFailure: true}).checks_passed, false);
assert.equal(audit(unique, {...checks, ambiguous: true}).checks_passed, false);
assert.equal(audit(unique, {...checks, startConfirmed: false}).checks_passed, false);
assert.equal(audit(unique, {...checks, endConfirmed: false}).checks_passed, false);
console.log('PASS: count mismatch, exact integer input, boundary confirmations, gaps, parse failures, duplicate ambiguity, mutable duration.');
const {serialize} = require('./csv.js');
const csvRows = [{artist: '=SUM(1,2)', title: 'Песня, "пример"\nСтрока', duration_seconds: null},
  {artist: '\t+formula', title: 'Повтор'}, {artist: 'Исполнитель', title: 'Повтор'}];
const csv = serialize(csvRows);
assert.ok(csv.startsWith('\uFEFF"position","artist"'));
assert.ok(csv.includes('"\'=SUM(1,2)"'));
assert.ok(csv.includes('"Песня, ""пример""\nСтрока"'));
assert.ok(csv.includes('"\'\t+formula"'));
assert.ok(csv.includes('"3","Исполнитель","Повтор"'));
assert.equal(serialize([]).split('\r\n').length, 2);
assert.ok(!csv.includes('undefined'));
console.log('PASS: direct CSV BOM, Unicode, quotes, multiline text, formula protection, duplicate occurrences and empty headers.');
function container(count, parentElement, tagName = 'DIV', role = null) {
  return {tagName, parentElement, querySelectorAll: () => Array(count).fill({}), getAttribute: () => role};
}
const body = container(20, null, 'BODY');
const playlist = container(8, body);
const wrapper = container(1, container(1, playlist));
assert.equal(adapter.listContainer({parentElement: wrapper}), playlist, 'Climb per-track playlist wrappers');
const modal = container(1, playlist, 'DIV', 'dialog');
assert.equal(adapter.listContainer({parentElement: container(1, modal)}), modal, 'Do not include music outside modal');
const single = container(1, body, 'DIV', 'list');
assert.equal(adapter.listContainer({parentElement: single}), single, 'Single-track playlist remains valid');
const isolated = container(1, body);
assert.equal(adapter.listContainer({parentElement: isolated}), isolated, 'Never use entire document as a list');
console.log('PASS: nested playlist wrappers, single-track lists, modal boundaries and document boundary.');
const {filename} = require('./filename.js');
assert.equal(filename('Аниме', 'csv'), 'Аниме.csv');
assert.equal(filename(' Японская музыка ', 'json'), 'Японская музыка.json');
assert.equal(filename('Плейлист: A/B?', 'csv'), 'Плейлист_ A_B_.csv');
assert.equal(filename('...', 'csv'), 'Музыка ВК.csv');
assert.equal(filename('', 'csv'), 'Музыка ВК.csv');
assert.equal(filename('CON', 'csv'), '_CON.csv');
assert.equal(filename('nul.txt', 'csv'), '_nul.txt.csv');
assert.equal(filename('Песни.  ', 'csv'), 'Песни.csv');
assert.equal(filename('A'.repeat(300), 'csv').length, 124);
console.log('PASS: collection filenames, Cyrillic, forbidden characters, trailing dots, reserved names and length limit.');
