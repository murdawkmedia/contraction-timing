import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, copyFileSync, chmodSync, lstatSync } from 'node:fs';
import { Script, createContext, runInContext } from 'node:vm';
import { randomUUID, webcrypto } from 'node:crypto';

const files = ['index.html', 'apple-touch-icon.png', 'favicon.ico', 'og-image.jpg', 'robots.txt', 'sitemap.xml', '_headers'];
const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const runtime = scripts.filter(([, attrs]) => !attrs.includes('application/ld+json')).map(([, , body]) => body).join('\n');
new Script(runtime);
for (const [, attrs, body] of scripts) if (attrs.includes('application/ld+json')) JSON.parse(body);
for (const [, id] of runtime.matchAll(/getElementById\('([^']+)'\)/g)) assert.ok(html.includes(`id="${id}"`), `Missing element ${id}`);
assert.ok(html.includes('href="https://www.murdawkmedia.com/contraction-timer/"'));
assert.ok(html.includes('href="https://contraction-timing.pages.dev/"'));
assert.ok(readFileSync('sitemap.xml', 'utf8').includes('https://www.murdawkmedia.com/contraction-timer/'));
assert.ok(readFileSync('robots.txt', 'utf8').includes('sitemap.xml'));
console.log('PASS: JavaScript, structured data, DOM references and hosted metadata');

function fixture(storage = new Map(), pathname = '/') {
  let now = Date.UTC(2026, 0, 1, 12);
  let writesUntilFailure = 0;
  let confirmAllowed = true;
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  class Element {
    constructor() { this.value = ''; this.textContent = ''; this.innerHTML = ''; this.dataset = {}; this.style = {}; this.children = []; this.disabled = false; this.classes = new Set(); this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: (x, yes) => (yes ?? !this.classes.has(x)) ? this.classes.add(x) : this.classes.delete(x) }; }
    addEventListener() {} setAttribute() {} focus() {} select() {} remove() {} click() {}
    appendChild(child) { this.children.push(child); } querySelectorAll() { return []; }
  }
  const elements = new Map();
  let downloaded;
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: () => new Element(), querySelectorAll: () => [], body: new Element(), execCommand() {} };
  const context = createContext({ Date: Clock, document, window: { crypto: { randomUUID }, location: { pathname }, addEventListener() {} }, crypto: { randomUUID, subtle: webcrypto.subtle }, TextEncoder, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => { if (writesUntilFailure && --writesUntilFailure === 0) throw new Error('Synthetic quota failure'); storage.set(k, String(v)); }, removeItem: k => storage.delete(k) }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, confirm: () => confirmAllowed, alert() {}, navigator: {}, Blob, URL: { createObjectURL: blob => { downloaded = blob; return 'blob:synthetic'; }, revokeObjectURL() {} }, console });
  runInContext(runtime, context);
  return { context, storage, elements, failOnWrite: n => { writesUntilFailure = n; }, allowImport: yes => { confirmAllowed = yes; }, run: text => runInContext(text, context), advance: ms => { now += ms; }, download: () => downloaded };
}

const f = fixture();
assert.equal(f.run('contractions.length'), 0);
f.run('toggleContraction()');
assert.ok(f.storage.has('activeContractionStart'));
const reloaded = fixture(f.storage);
assert.ok(reloaded.run('startTime > 0'));
reloaded.advance(65000);
reloaded.run('toggleContraction()');
assert.equal(reloaded.run('contractions.length'), 1);
assert.equal(reloaded.run('contractions[0].duration'), 65000);
assert.equal(reloaded.storage.has('activeContractionStart'), false);
assert.equal(fixture(reloaded.storage).run('contractions.length'), 1);
console.log('PASS: start, refresh recovery, stop, duration and persisted history');

reloaded.run('contractions[0].note = "Synthetic fixture <script>test</script>"; saveContractions(); render(); preparePrintReport()');
assert.ok(reloaded.run('buildSummaryText()').includes('Synthetic fixture'));
assert.ok(!reloaded.elements.get('printReport').innerHTML.includes('<script>test</script>'));
assert.ok(reloaded.elements.get('printReport').innerHTML.includes('&lt;script&gt;'));
reloaded.run('downloadCsv()');
assert.ok((await reloaded.download().text()).includes('duration_seconds'));
assert.ok((await reloaded.download().text()).includes('Synthetic fixture'));
reloaded.run('undoLastContraction()');
assert.equal(reloaded.run('contractions.length'), 0);
console.log('PASS: summary, escaped print output, CSV and undo with synthetic records');

const legacy = fixture(new Map([['contractions', JSON.stringify([{ start: Date.UTC(2026, 0, 1, 11), duration: 60000 }])]]));
assert.equal(legacy.run('contractions[0].duration'), 60000);
assert.ok(legacy.run('Boolean(contractions[0].id)'));
assert.equal(fixture(new Map([['contractions', '{invalid']])).run('contractions.length'), 0);
assert.equal(legacy.run('csvEscape(`a,"b"`)'), '"a,""b"""');
console.log('PASS: legacy records, malformed storage recovery and CSV escaping');

const saved = new Map([
  ['contractions', JSON.stringify([{ id: 'synthetic-c1', start: Date.UTC(2026, 0, 1, 11), duration: 60000, intensity: 4, note: 'Synthetic note' }])],
  ['laborEvents', JSON.stringify([{ id: 'synthetic-e1', time: Date.UTC(2026, 0, 1, 11), type: 'Other', note: 'Synthetic event' }])],
  ['contractionNotes', 'Synthetic Unicode note — é\nSecond line'],
  ['laborSettings', JSON.stringify({ intervalMinutes: 6, durationSeconds: 70, windowMinutes: 50 })],
  ['activeContractionStart', String(Date.UTC(2026, 0, 1, 11, 59))],
]);
const transfer = fixture(saved);
const backup = await transfer.run('createBackup()');
assert.equal(backup.format, 'contraction-timer-backup');
assert.equal(backup.storage.notes, saved.get('contractionNotes'));
const targetStorage = new Map([['unrelated-app', 'preserve']]);
const target = fixture(targetStorage, '/contraction-timer/');
target.context.backupFixture = JSON.parse(JSON.stringify(backup));
assert.equal(await target.run('restoreBackup(backupFixture)'), true);
for (const [logical, raw] of Object.entries(backup.storage)) {
  const key = target.run(`STORAGE[${JSON.stringify(logical)}]`);
  assert.ok(key.startsWith('contractionTimer.'));
  assert.equal(targetStorage.get(key) ?? null, raw);
}
assert.equal(targetStorage.get('unrelated-app'), 'preserve');
const prior = JSON.stringify([...targetStorage]);
target.context.backupFixture.storage.notes += 'corrupt';
await assert.rejects(target.run('restoreBackup(backupFixture)'));
assert.equal(JSON.stringify([...targetStorage]), prior);
saved.set('contractionNotes', 'Synthetic replacement');
const replacement = await transfer.run('createBackup()');
target.context.backupFixture = JSON.parse(JSON.stringify(replacement));
target.allowImport(false);
assert.equal(await target.run('restoreBackup(backupFixture)'), false);
assert.equal(JSON.stringify([...targetStorage]), prior);
target.allowImport(true);
target.failOnWrite(3);
await assert.rejects(target.run('restoreBackup(backupFixture)'));
assert.equal(JSON.stringify([...targetStorage]), prior);
assert.equal(JSON.parse(await target.download().text()).storage.notes, backup.storage.notes);
console.log('PASS: lossless transfer, namespaces, unrelated storage, corruption/cancel rejection and quota rollback with recovery download');

const unsafeId = "synthetic');globalThis.__importedIdRan=true;//";
const importedId = fixture(new Map([['contractions', JSON.stringify([{ id: unsafeId, start: Date.UTC(2026, 0, 1, 11), duration: 60000 }])]]));
const editHandler = importedId.run('historyList.innerHTML').match(/onclick="([^"]+)"/)[1]
  .replace(/&(quot|#39|amp|lt|gt);/g, (_, entity) => ({ quot: '"', '#39': "'", amp: '&', lt: '<', gt: '>' })[entity]);
importedId.run(editHandler);
assert.notEqual(importedId.context.__importedIdRan, true);
assert.equal(importedId.run('editingEntryId'), unsafeId);
assert.equal(importedId.run('entryModal.classList.contains("show")'), true);
for (const field of ['contractions', 'settings']) {
  target.context.backupFixture = JSON.parse(JSON.stringify(backup));
  target.context.backupFixture.storage[field] = field === 'contractions' ? '{"wrong":"shape"}' : '{"intervalMinutes":{}}';
  target.context.backupFixture.checksum = await target.run('backupChecksum(backupPayload(backupFixture))');
  await assert.rejects(target.run('restoreBackup(backupFixture)'));
  assert.equal(JSON.stringify([...targetStorage]), prior);
}
console.log('PASS: imported IDs remain data and malformed records/settings are rejected before writes');

mkdirSync('dist', { mode: 0o755, recursive: true });
chmodSync('dist', 0o755);
for (const file of files) {
  assert.ok(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink());
  copyFileSync(file, `dist/${file}`);
  chmodSync(`dist/${file}`, 0o644);
  assert.deepEqual(readFileSync(`dist/${file}`), readFileSync(file));
}
console.log(`PASS: complete, readable ${files.length}-file static artifact; exact source bytes verified`);
