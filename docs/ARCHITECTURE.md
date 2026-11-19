# StarLedger Web architecture

This document is the maintenance boundary for the current single-page Web build. The goal is not to rewrite working behavior; it is to keep future changes local and reversible.

## Active paper renderer

The production shell currently loads `paper/app.js`. The root-level application/runtime layers described below are retained for legacy recovery and tests; do not load their viewport controller into the paper renderer.

- `paper/dialog-viewport.js` owns keyboard geometry for the single native `#dialog`, including entry, child pickers and secondary settings/forms. `paper/app.js` calls its open/render/close lifecycle; `paper/workflows.css` consumes its frame and scroll-inset tokens.
- Keep the unoccluded native **fixed** dialog frame stable during keyboard resize/pan. Do not add `visualViewport.offsetTop/offsetLeft` or document scroll to its position. Reveal the focused control by scrolling its internal scrollport, never by shrinking or moving the whole sheet. Keyboard focus must not change the user's calculator visibility preference. Compact layout is derived from the unoccluded screen height.
- On iOS, the dialog's capture-phase focus handler briefly relocates only the real text field to prevent Safari's native focus reveal from moving the whole page, then restores it before the next paint. It never overrides global focus, clones inputs, intercepts touchend or refocuses an already focused input. See [keyboard research](KEYBOARD-FOCUS.md) for source comparisons and limitations.
- `paper-tests/keyboard-browser.cjs` guards these contracts in Chromium and WebKit with simulated viewport/keyboard events and real touch focus dispatch, including repeated taps, composition node identity, orientation, document pan, scroll restoration and standalone mode. Assert raw rendered coordinates: subtracting a mocked viewport offset would conceal the very translation being tested. Real iPhone Safari keyboard behavior still requires device acceptance.

## Runtime layers

1. **index.html — shell and visual compatibility**
   - Owns the static DOM shell and the current ordered CSS cascade.
   - The Safari/browser-tab compatibility styles stay here for now because their order is behavior-sensitive.
   - Do not add business logic here. Keep only the tiny display-mode bootstrap inline.

2. **app.js — core application**
   - Owns ledger data, IndexedDB/workspace handling, main state, rendering, entry editing and core event flow.
   - OCR parsing rules do not belong here.
   - UI-only browser workarounds should not be added here unless the core renderer itself requires them.

3. **recognizer.js — OCR recognition**
   - Owns OCR text recognition and mapping rules.
   - Treat this as an independent subsystem. UI refactors should not change it.

4. **ui-runtime.js — UI compatibility and interaction runtime**
   - Owns search-filter behavior, mobile/desktop interaction patches, page swipe/transition helpers, Safari visualViewport modal placement and related UI controllers.
   - New browser-specific workarounds belong here instead of being appended as another inline script in index.html.
   - Prefer one owner for each interaction. Avoid wrapping/replacing the same global function repeatedly.

5. **books-stats.js — books/month-year feature controller**
   - Owns the later books and statistics header behavior that depends on styles loaded near the end of index.html.
   - It remains a separate file to preserve its execution position relative to those styles.

6. **ui-foundation.css — shared visual foundation**
   - Owns the modern visual tokens, shared page chrome, cards, navigation and page-level responsive presentation.
   - Loads after the historical inline CSS so migrated components have one explicit owner.
   - Must load before `mobile-compat.css`; Safari/browser-tab geometry does not belong here.

7. **mobile-compat.css — final mobile browser compatibility**
   - Loads after all historical inline styles and owns the last-word Safari browser-tab overrides.
   - Owns browser-chrome clearance, document-scrollbar suppression, short-page scroll sentinels and pager hand-off guards.
   - Do not put normal component styling here. This file is for browser/runtime compatibility only.

8. **sw.js — offline cache**
   - Every new runtime file loaded by index.html must be added to the precache list.
   - Bump the cache key when the runtime file set changes.

9. **backup-zip.js — complete backup container**
   - Owns ZIP container creation, reading and CRC validation only.
   - The meaning and validation of ledger CSV/config/relations remain in `app.js` and reuse the workspace parser.
   - `app.js` computes the SHA-256 content hash from canonical CSV/config/relations, stores it in `StarLedgerBackup.json`, and verifies it on import. Generated export timestamps and device labels are excluded.
   - Cloud sync keeps the last verified content hash locally as its common baseline. WebDAV ETag only skips a download when that baseline is known; a changed or missing ETag requires reading and validating the ZIP before upload or restore.

## Change rules

- A refactor should preserve behavior first. Structural moves and behavior changes should be separate commits.
- Do not add a new `<script>...</script>` patch to index.html. Put it in the owning JS file.
- Do not add a new CSS override layer unless an existing selector cannot be safely changed. The current CSS cascade is historical and order-sensitive; CSS consolidation is a separate future task.
- Page navigation, modal/overlay lifecycle, and visualViewport/Safari behavior are high-risk areas. Change one of these systems at a time.
- OCR changes and UI-animation changes should never be mixed in one commit.
- If a workaround is browser-specific, make the browser condition explicit and comment the failure mode it prevents.

## Minimum regression pass

Before merging UI work, verify at least:

- cold open on Home;
- Home scrolled -> Month/Year -> Home;
- Month/Year scrolled -> Books -> Month/Year;
- Books -> Month/Year with Safari bottom bar expanded and collapsed;
- Search filter open/close and scrolling;
- single entry open/close;
- text keyboard open/close inside entry;
- account/category/tag child sheets inside entry;
- multi-bill stack open/close;
- bulk edit open/close and scroll;
- light/dark mode;
- standalone/PWA and Safari browser-tab modes when the change touches viewport or navigation behavior.

The GitHub workflow catches structural and JavaScript failures. The iPhone pass remains required for Safari chrome, keyboard and visualViewport behavior.

## Secondary screens and entry keypad

- Mobile primary overlays share `--sl-secondary-*` frame tokens in `ui-foundation.css`; Safari supplies browser-chrome clearance in `mobile-compat.css`. Bottom navigation stays hidden throughout the overlay lifecycle. Child pickers retain their existing nested lifecycle.
- In Safari browser tabs, `ui-runtime.js` positions the document overlay before text focus. During keyboard input it retains that visual viewport offset, follows document scroll only, and freezes the card frame until the overlay closes. Mobile modal cards fade in place; do not add vertical entrance motion that can be captured as the keyboard anchor.
- `app.js` owns keypad visibility. `beginEntryKeypad({source, page, keypadOpen})` initializes a task; `setEntryKeypadOpen` handles explicit user toggles. The task controller initializes once, while form/card rerenders reuse the current visibility.
- Home new entries and OCR start open. Browsing/editing entries remember the explicit toggle in local browser storage; Home/OCR never overwrite that browsing preference. A caller can override initial visibility with `keypadOpen`.
- Device regression: collapse in Search, close/reopen another bill, switch related bills and change category/type; then open Home new entry and OCR, and return to Search. Check secondary cards with short screens, Safari chrome expanded/collapsed, and standalone mode, including text keyboard focus and dismissal.

## iPhone widgets

- `paper/domain/widget.js` derives a compact snapshot using the existing ledger selectors, budget and asset rules. `paper/domain/backup.js` embeds it in `StarLedgerBackup.json` from the same state and timestamp as the ZIP. Generated summaries remain outside the canonical content hash, like other manifest metadata.
- `paper/widget-settings.js` owns installation help, pairing and cloud summary inspection; `paper/connections.js` supplies the authenticated requests and conflict-safe explicit backup. `refreshWidget` forces an upload only after equal remote content has been verified; it never bypasses remote conflict review. Recurring backup scheduling is unchanged.
- `cloudflare/widget.mjs` derives a domain-separated read-only capability from SYNC_TOKEN and reads bounded, validated backups. `/widget` returns only snapshot data. `/widget-config` requires the full sync credential. The feature needs a Wrangler module deployment, not a single-file copy.
- `paper/scriptable/StarLedgerWidget.js` owns the small/medium iOS layouts, Keychain pairing and connection-specific offline cache. Scriptable never calculates financial totals or reads full ZIPs.

- Widget `#entry` links are consumed after storage initialization and on hash changes. They reuse `startEntry`, clear the action hash to prevent reload duplicates, and never replace a live draft or pending OCR task. Small widgets link to home; medium stacks link to home / entry separately. Card layout shares the paper renderer palette and serif type treatment, with no backup timestamp.

### Widget editor v3

`paper/widget-model.js` is the shared normalization, metric metadata, formatting and palette model. The generator embeds it in the standalone Scriptable file on build, so the browser and widget use one format contract. `prefs.widgetConfig` is ledger-owned, hashed canonical configuration; the manifest snapshot carries its sanitized copy. Existing v1 snapshot fields and Keychain namespace remain compatible. New metrics call existing ledger/account selectors; no duplicate balance calculation or extra cloud storage is introduced. The UI drafts small/medium independently, persists only on Save, and explicitly requests existing conflict-safe backup to publish configuration.

## Homepage financial motion

`paper/motion.js` owns digit rolling. `paper/app.js` marks homepage summary and account values with stable `data-metric` keys, captures their displayed targets before render and animates changes after render. The scope includes the main ledger, selected period and month/year mode; navigation and period changes establish a fresh baseline. No ledger values or storage semantics are changed. During motion, assistive technology gets the final formatted value once, and rapid rerenders capture that target instead of duplicate animation layers. Reduced motion updates immediately. The production build hashes the runtime and precaches the versioned motion import.
