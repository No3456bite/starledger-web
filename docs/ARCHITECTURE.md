# StarLedger Web architecture

This document is the maintenance boundary for the current single-page Web build. The goal is not to rewrite working behavior; it is to keep future changes local and reversible.

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

6. **sw.js — offline cache**
   - Every new runtime file loaded by index.html must be added to the precache list.
   - Bump the cache key when the runtime file set changes.

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
