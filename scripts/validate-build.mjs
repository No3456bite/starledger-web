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
const mobileCompat = read('mobile-compat.css');
const pagesWorkflow = read('.github/workflows/pages.yml');

const externalScripts = [
  './recognizer.js?v=ocr1',
  './app.js?v=midterm2',
  './ui-runtime.js?v=midterm1',
  './books-stats.js?v=midterm1'
];
const precacheAssets = [...externalScripts,'./mobile-compat.css?v=css1'];

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
if (!app.includes("scrollPageTo(0,'smooth')")) fail('back-to-top no longer uses the unified page scroller');
if (!app.includes("const COLS=['id','date','type'")) fail('app.js lost the ledger column schema');
if (!ui.includes('rc14-search-filter-behavior')) fail('ui-runtime.js lost the search filter controller');
if (!ui.includes('web-v051-safari-document-modal-controller')) fail('ui-runtime.js lost Safari modal placement');
if (!ui.includes('web-v044-browser-tab-interactions')) fail('ui-runtime.js lost browser-tab paging behavior');
if (!books.includes('function cleanBookName')) fail('books-stats.js lost the books/stats controller');
if (!recognizer.includes('StarLedger')) fail('recognizer.js looks unexpectedly empty or replaced');

for (const asset of precacheAssets) {
  if (!sw.includes(`'${asset}'`) && !sw.includes(`"${asset}"`)) {
    fail(`service worker precache is missing ${asset}`);
  }
}

if (!index.includes('href="./mobile-compat.css?v=css1"')) fail('index.html does not load mobile-compat.css');
if (index.lastIndexOf('href="./mobile-compat.css?v=css1"') < index.lastIndexOf('</style>')) fail('mobile-compat.css must load after inline style layers');

if (!index.includes('id="web-v051-safari-document-modal"')) {
  fail('Safari document-modal geometry style is missing from index.html');
}
for (const marker of ['--sl-browser-chrome-gap','browser-pager-filter-current','::-webkit-scrollbar']) {
  if (!mobileCompat.includes(marker)) fail(`mobile-compat.css lost Safari guard: ${marker}`);
}

for (const marker of [
  "github.event_name == 'pull_request'",
  "github.event.action == 'closed'",
  'github.event.pull_request.merged == true',
  "github.event.pull_request.base.ref == 'main'"
]) {
  if (!pagesWorkflow.includes(marker)) fail(`Pages deploy guard is missing: ${marker}`);
}
if (pagesWorkflow.includes("github.event_name != 'pull_request' && github.ref == 'refs/heads/main'")) {
  fail('Pages must not deploy from an ordinary push to main');
}

if (!process.exitCode) {
  console.log('StarLedger static build validation passed.');
}
