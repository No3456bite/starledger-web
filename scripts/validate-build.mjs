import fs from 'node:fs';

const fail = message => {
  console.error('BUILD VALIDATION FAILED:', message);
  process.exitCode = 1;
};

const read = path => {
  if (!fs.existsSync(path)) {
    fail(`missing required file: ${path}`);
    return '';
  }
  return fs.readFileSync(path, 'utf8');
};

const index = read('index.html');
const app = read('app.js');
const ui = read('ui-runtime.js');
const books = read('books-stats.js');
const recognizer = read('recognizer.js');
const sw = read('sw.js');

const externalScripts = [
  './recognizer.js?v=ocr1',
  './app.js?v=midterm1',
  './ui-runtime.js?v=midterm1',
  './books-stats.js?v=midterm1'
];

let last = -1;
for (const src of externalScripts) {
  const at = index.indexOf(`src="${src}"`);
  if (at < 0) fail(`index.html does not load ${src}`);
  if (at >= 0 && at <= last) fail(`script order is wrong around ${src}`);
  if (at >= 0) last = at;
}

const requiredIds = [
  'pageViewport',
  'content',
  'safeFrame',
  'controlsFrame',
  'headerFrame',
  'pageBody',
  'floatingControls',
  'mobileNav',
  'overlay'
];

for (const id of requiredIds) {
  const re = new RegExp(`id=["']${id}["']`);
  if (!re.test(index)) fail(`critical DOM anchor #${id} is missing`);
}

const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)];
const unexpectedInline = inlineScripts.filter(match => !/id=["']display-mode-bootstrap["']/.test(match[1]));
if (unexpectedInline.length) {
  fail(`unexpected inline runtime scripts remain: ${unexpectedInline.length}`);
}

if (!app.includes('function render()')) fail('app.js lost the primary render() function');
if (!app.includes("const COLS=['id','date','type'")) fail('app.js lost the ledger column schema');
if (!ui.includes('rc14-search-filter-behavior')) fail('ui-runtime.js lost the search filter controller');
if (!ui.includes('web-v051-safari-document-modal-controller')) fail('ui-runtime.js lost Safari modal placement');
if (!ui.includes('web-v044-browser-tab-interactions')) fail('ui-runtime.js lost browser-tab paging behavior');
if (!books.includes('function cleanBookName')) fail('books-stats.js lost the books/stats controller');
if (!recognizer.includes('StarLedger')) fail('recognizer.js looks unexpectedly empty or replaced');

for (const asset of ['./app.js','./ui-runtime.js','./books-stats.js','./recognizer.js']) {
  if (!sw.includes(`'${asset}'`) && !sw.includes(`"${asset}"`)) {
    fail(`service worker precache is missing ${asset}`);
  }
}

const safariGuards = [
  'web-v051-safari-document-modal',
  'web-v059a-safari-short-page-scroll-sentinel',
  'web-v060-safari-filter-handoff'
];
for (const id of safariGuards) {
  if (!index.includes(`id="${id}"`)) fail(`Safari compatibility style #${id} is missing`);
}

if (!process.exitCode) {
  console.log('StarLedger static build validation passed.');
}
