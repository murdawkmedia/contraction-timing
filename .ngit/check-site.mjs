import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, copyFileSync, chmodSync, lstatSync } from 'node:fs';
import { Script, createContext, runInContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

const files = ['index.html', 'apple-touch-icon.png', 'favicon.ico', 'og-image.jpg', 'robots.txt', 'sitemap.xml'];
const html = readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
const runtime = scripts.filter(([, attrs]) => !attrs.includes('application/ld+json')).map(([, , body]) => body).join('\n');
new Script(runtime);
for (const [, attrs, body] of scripts) if (attrs.includes('application/ld+json')) JSON.parse(body);
for (const [, id] of runtime.matchAll(/getElementById\('([^']+)'\)/g)) assert.ok(html.includes(`id="${id}"`), `Missing element ${id}`);
assert.ok(html.includes('https://contraction-timing.pages.dev'));
assert.ok(readFileSync('sitemap.xml', 'utf8').includes('https://contraction-timing.pages.dev'));
assert.ok(readFileSync('robots.txt', 'utf8').includes('sitemap.xml'));
console.log('PASS: JavaScript, structured data, DOM references and hosted metadata');

function fixture(storage = new Map()) {
  let now = Date.UTC(2026, 0, 1, 12);
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
  class Element {
    constructor() { this.value = ''; this.textContent = ''; this.innerHTML = ''; this.dataset = {}; this.style = {}; this.children = []; this.disabled = false; this.classes = new Set(); this.classList = { add: (...xs) => xs.forEach(x => this.classes.add(x)), remove: (...xs) => xs.forEach(x => this.classes.delete(x)), contains: x => this.classes.has(x), toggle: (x, yes) => (yes ?? !this.classes.has(x)) ? this.classes.add(x) : this.classes.delete(x) }; }
    addEventListener() {} setAttribute() {} focus() {} select() {} remove() {} click() {}
    appendChild(child) { this.children.push(child); } querySelectorAll() { return []; }
  }
  const elements = new Map();
  let downloaded;
  const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: () => new Element(), querySelectorAll: () => [], body: new Element(), execCommand() {} };
  const context = createContext({ Date: Clock, document, window: { crypto: { randomUUID }, addEventListener() {} }, crypto: { randomUUID }, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) }, requestAnimationFrame: () => 1, cancelAnimationFrame() {}, setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, confirm: () => true, alert() {}, navigator: {}, Blob, URL: { createObjectURL: blob => { downloaded = blob; return 'blob:synthetic'; }, revokeObjectURL() {} }, console });
  runInContext(runtime, context);
  return { storage, elements, run: text => runInContext(text, context), advance: ms => { now += ms; }, download: () => downloaded };
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

mkdirSync('dist', { mode: 0o755 });
chmodSync('dist', 0o755);
for (const file of files) {
  assert.ok(lstatSync(file).isFile() && !lstatSync(file).isSymbolicLink());
  copyFileSync(file, `dist/${file}`);
  chmodSync(`dist/${file}`, 0o644);
  assert.deepEqual(readFileSync(`dist/${file}`), readFileSync(file));
}
console.log(`PASS: complete, readable ${files.length}-file static artifact; runtime bytes unchanged`);
