# StarLedger Product Rules

> These are product-level invariants and established interaction decisions that are easy to lose when reading code alone.
> They are not permission to implement every idea mentioned here. "Current rule" means preserve it. "Pending" means do not implement unless a task explicitly asks for it.

## 1. Product direction

StarLedger is a personal, local-first ledger optimized for low-friction daily use, especially on iPhone, while keeping the Web app usable on other platforms.

The product favors:

- fast entry;
- readable full numbers rather than aggressive abbreviation;
- stable financial data over visual cleverness;
- a small number of deliberate interactions;
- user-defined accounts/categories/tags rather than hard-coded assumptions.

## 2. Visual semantics

Current established semantics:

- expense = red;
- income = green;
- positive displayed values do not need a leading `+`;
- zero-value calendar entries should not be shown;
- charts should remain readable rather than compressing numbers into ambiguous abbreviations;
- light and dark themes are both supported.

Do not redesign these semantics during unrelated engineering work.

## 3. Home / Month / Year / Search continuity

Recent-bill lists are chronological and may cross month boundaries. The first days of a new month must not make the previous month's latest bills disappear merely because the calendar month changed.

Where adjacent bills cross a month boundary, the existing divider treatment marks the boundary. Preserve the established divider rather than inserting a second decorative row.

"View all" / drill-down interactions should preserve useful filter/context when navigating to Search.

## 4. Page navigation and scrolling

The app is a single-page experience. Page switching should not visually flash another page or unnecessarily recreate visible content.

Scroll state and Safari browser chrome behavior are product behavior, not cosmetic implementation details.

When changing navigation/scrolling:

- preserve the current page's expected scroll behavior;
- do not create a second scrolling model;
- test both Safari browser-tab and standalone/PWA when relevant;
- account for expanded/collapsed browser bars and keyboard/visualViewport.

## 5. Entry flow

Entry is intended to feel like a lightweight overlay/card rather than a full context switch.

Merchant and note are distinct concepts.

Accounts, categories, tags and currency should prefer the user's existing data and current configuration.

The UI can support multiple bill cards in one entry task. Multiple cards in the same task are not automatically one relation group.

A successful save should not add unnecessary confirmation friction. Failure should be visible and should not silently discard the user's edits.

## 6. Bulk edit

Bulk edit means applying one operation to multiple selected bills.

Established direction:

- fields can be changed together in one bulk-edit surface;
- optional/non-binding fields such as tag, note or merchant may support explicit clearing;
- an untouched field means "do not change", not "write an empty value";
- bill identity must remain stable;
- existing relations must remain stable unless relation editing is explicitly part of the task.

Do not turn bulk edit into repeated single-bill edits internally if that can produce partial writes.

## 7. Relations

Relations express an explicit conceptual relationship among bills.

Do not automatically relate every bill created together.

When a user explicitly relates a subset of bills, only that subset belongs to the relation.

Future relation UI may evolve. Preserve stored relation semantics unless a task explicitly changes them.

## 8. OCR product boundary

OCR is an input assistant, not an authority over the ledger.

Recognition should prefill fields; ambiguous or debt-related semantics should remain editable/confirmable.

OCR vocabulary must adapt to current user account names/config rather than assuming the initial names remain forever.

Known semantic examples that must be considered in OCR work:

- WeChat text such as "已存入零钱" indicates the destination account is the user's configured account corresponding to 零钱 when such an account exists.
- Refund text with "退款方式-零钱" similarly indicates the refund destination account.
- A movement "转入零钱通，来自零钱" is a transfer from 零钱 to 零钱通, not ordinary income/expense.
- The same transfer principle applies when an external/configured account moves money into 零钱通: identify source and destination when evidence is sufficient.

These examples define semantics, not literal hard-coded strings. Implementations should use fixtures and current account configuration.

## 9. Statistics

Monthly/yearly statistics should count financial meaning correctly:

- expense and income are distinct;
- transfers must not inflate ordinary expense/income;
- filtering by ledger/month/currency/account/tag must be consistent across summaries and drill-downs;
- foreign-currency display/conversion behavior must not silently change during UI work.

Before modifying statistics, inspect the current calculation owner rather than duplicating formulas in a new component.

## 10. Pending / not guaranteed implemented

The repository contains an evolving product. Do not infer implementation from discussion history.

In particular, requirements from older release-candidate discussions may still be pending even if later UI/animation work exists. A later rc number does not prove an earlier requested feature was completed.

When a task refers to an old requirement, verify the current code and current behavior before marking it done.

## 11. Decision rule

If code, old chat history and these product rules appear inconsistent:

1. preserve user data;
2. inspect current `main`;
3. reproduce current behavior;
4. distinguish an established rule from an unimplemented request;
5. ask/flag the ambiguity before making a destructive semantic change.
