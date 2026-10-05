# StarLedger Data Model

> Purpose: give coding agents a stable mental model of StarLedger data before changing persistence, import/export, accounts, bulk edit, relations, or OCR-to-entry flow.
> This document describes invariants and current intent. When code and this document disagree, stop and investigate rather than silently "fixing" one side.

## 1. Core principle

StarLedger is local-first. User ledger data is more important than UI state.

GitHub Pages hosts application assets only. It is not the ledger database.

The browser keeps a usable local copy in IndexedDB. A StarLedger workspace folder is the external interchange/backup surface where supported by the browser.

## 2. Workspace

A workspace may contain multiple main ledgers.

Recognized files:

- `<main-ledger>_mobile.csv`
- `<main-ledger>_手机主账本.csv` (legacy compatibility)
- `<main-ledger>_scriptable.csv`
- `<main-ledger>_desktop.csv`
- `StarLedgerConfig.json`
- `StarLedgerRelations.json`

Other files in the folder are ignored.

For one main ledger, mobile/scriptable/desktop sources are merged by stable bill identity and update time. Do not replace this with row-position based identity.

## 3. Bill

A bill is the atomic financial record.

The historical/import schema includes concepts such as:

- type
- amount
- main ledger/book
- account
- second account
- major category
- minor category
- tags
- currency
- merchant
- note
- date

Current runtime may contain additional technical fields such as stable ID and created/updated timestamps. Before changing exact field names, inspect the current parser/writer in `app.js`.

### Bill invariants

- A bill ID is identity, not presentation. Editing a bill must not casually regenerate identity.
- `created_at` and `updated_at` (where present) have merge semantics; do not rewrite them merely for display.
- Import/export must preserve enough information for deterministic merging.
- UI refactors must not change financial meaning.
- Amount, type, accounts, currency and relations are financially meaningful fields and require higher review.
- A failed destructive/bulk operation must not leave a half-written dataset.

## 4. Transaction types

StarLedger distinguishes at least:

- expense
- income
- transfer
- borrowing/lending or debt-related records

Do not infer that every positive OCR amount is ordinary income or every movement between two visible balances is expense/income.

A transfer represents movement between accounts and normally requires two account sides. It must not be counted as ordinary consumption/income merely because OCR text contains an amount.

Debt/borrowing semantics are less safe to infer automatically and may require user confirmation.

## 5. Accounts

Accounts are user-defined financial containers. Their names are data, not hard-coded OCR vocabulary.

Important consequence: OCR/account matching must use the current account/config state. If the user renames an account, recognition must not continue relying on a stale built-in copy.

Account types include concepts such as stored-value, credit-card and lending/debt accounts. Hidden is not equivalent to deleted.

Account balances/calibration are high-risk data. Do not derive or overwrite them as a side effect of UI work.

## 6. Main ledgers

Multiple main ledgers can coexist in one workspace. The selected main ledger controls the current displayed dataset/config context.

Do not assume one global ledger when adding settings, cache keys, filters, relations or persistence.

Renaming a main ledger is a data migration concern, not merely a label change.

## 7. Configuration

`StarLedgerConfig.json` owns user configuration such as accounts, account calibration, budgets, display/sort preferences and multi-ledger configuration.

Configuration is persistent product state. Do not silently reset it when schema evolves; preserve backward compatibility or perform an explicit migration.

## 8. Relations

`StarLedgerRelations.json` stores bill relationships per main ledger.

A relation groups bills that are conceptually associated while keeping the individual bills independently identifiable. Relation metadata must not replace bill identity.

Rules:

- deleting/editing one bill must not silently corrupt unrelated members;
- bulk editing must preserve relation identity unless the requested operation explicitly changes it;
- relation operations should be reversible or at minimum fail without partial writes;
- do not infer that bills created in one UI session are automatically related.

The multi-entry UI and relation semantics are separate concepts: one entry session may contain several bill cards, and only the bills explicitly related by the user should receive that relationship.

## 9. IndexedDB and external files

IndexedDB is the current device's usable local copy. Workspace files are external interchange/backup.

Desktop browsers with `showDirectoryPicker()` may maintain a persistent read/write workspace. iPhone/iPad Safari cannot be treated as having the same capability.

Never design a feature that depends on Safari continuously writing an arbitrary selected iCloud/network folder in the background.

## 10. Merge safety

Before changing merge/import/export logic, answer all of these:

1. What is the stable identity key?
2. Which timestamp wins and why?
3. What happens when one source is missing a field?
4. What happens to relations?
5. What happens to per-ledger config?
6. Can the original data still be exported if migration fails?
7. Is the operation idempotent?

If any answer is unclear, investigate current behavior before coding.
