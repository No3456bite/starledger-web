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
const backupZip = read('backup-zip.js');
const books = read('books-stats.js');
const recognizer = read('recognizer.js');
const sw = read('sw.js');
const uiFoundation = read('ui-foundation.css');
const mobileCompat = read('mobile-compat.css');
const pagesWorkflow = read('.github/workflows/pages.yml');

const externalScripts = [
  './recognizer.js?v=ocr1',
  './app.js?v=midterm4',
  './ui-runtime.js?v=midterm1',
  './backup-zip.js?v=zip1',
  './books-stats.js?v=midterm2'
];
const precacheAssets = [...externalScripts,'./ui-foundation.css?v=modern5','./mobile-compat.css?v=css1'];

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
  'overlay',
  'backupZip'
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
if (!app.includes('async function exportCompleteBackup()') || !app.includes('async function importCompleteBackup(file)')) fail('app.js lost complete backup import/export');
if (!app.includes("scrollPageTo(0,'smooth')")) fail('back-to-top no longer uses the unified page scroller');
if (!app.includes("const COLS=['id','date','type'")) fail('app.js lost the ledger column schema');
if (!ui.includes('rc14-search-filter-behavior')) fail('ui-runtime.js lost the search filter controller');
if (!backupZip.includes('global.StarLedgerZip=api')) fail('backup-zip.js lost the ZIP codec export');
if (!ui.includes('web-v051-safari-document-modal-controller')) fail('ui-runtime.js lost Safari modal placement');
if (!ui.includes('web-v044-browser-tab-interactions')) fail('ui-runtime.js lost browser-tab paging behavior');
if (!books.includes('function cleanBookName')) fail('books-stats.js lost the books/stats controller');
if (!app.includes('function normalizeBookIcon') || !app.includes('function bookDisplayIcon') || !books.includes('name="icon"')) fail('editable book icons are missing');
if (!recognizer.includes('StarLedger')) fail('recognizer.js looks unexpectedly empty or replaced');

for (const asset of precacheAssets) {
  if (!sw.includes(`'${asset}'`) && !sw.includes(`"${asset}"`)) {
    fail(`service worker precache is missing ${asset}`);
  }
}

if (!index.includes('href="./mobile-compat.css?v=css1"')) fail('index.html does not load mobile-compat.css');
if (!index.includes('href="./ui-foundation.css?v=modern5"')) fail('index.html does not load ui-foundation.css');
if (!uiFoundation.includes('StarLedger modern UI foundation')) fail('ui-foundation.css lost its ownership marker');
if (!uiFoundation.includes('--bg: #000000') || !uiFoundation.includes('--card: #171717')) fail('dark mode lost its full-black canvas and near-black cards');
if (!uiFoundation.includes('ChatGPT-like dark mode uses flat, neutral surfaces')) fail('flat dark surface ownership marker is missing');
if (!app.includes('group-account-option-wide') || !uiFoundation.includes('.group-choice > div') || !uiFoundation.includes('.group-choice .group-account-option-wide')) fail('compact group account selector is missing');
if (!uiFoundation.includes('writing-mode: horizontal-tb') || !uiFoundation.includes('@media (max-width: 460px)')) fail('mobile search filter wrapping guard is missing');
if (index.lastIndexOf('href="./ui-foundation.css?v=modern5"') > index.lastIndexOf('href="./mobile-compat.css?v=css1"')) fail('ui-foundation.css must load before mobile-compat.css');
if (index.lastIndexOf('href="./mobile-compat.css?v=css1"') < index.lastIndexOf('</style>')) fail('mobile-compat.css must load after inline style layers');

if (!index.includes('id="web-v051-safari-document-modal"')) {
  fail('Safari document-modal geometry style is missing from index.html');
}
for (const marker of ['--sl-browser-chrome-gap','browser-pager-filter-current','::-webkit-scrollbar']) {
  if (!mobileCompat.includes(marker)) fail(`mobile-compat.css lost Safari guard: ${marker}`);
}

for (const marker of [
  "github.event_name == 'push' && github.ref == 'refs/heads/main'",
  'needs: validate'
]) {
  if (!pagesWorkflow.includes(marker)) fail(`Pages deployment condition is missing: ${marker}`);
}
for (const staleGuard of ['authorize-production', 'commits/$GITHUB_SHA/pulls', 'pr.merged_at']) {
  if (pagesWorkflow.includes(staleGuard)) fail(`obsolete PR deployment guard remains: ${staleGuard}`);
}
if (pagesWorkflow.includes("github.event.action == 'closed'")) {
  fail('Pages must not deploy directly from the pull_request closed event');
}

if (!process.exitCode) {
  console.log('StarLedger static build validation passed.');
}
