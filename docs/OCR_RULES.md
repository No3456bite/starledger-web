# StarLedger OCR Rules

> Scope: product/engineering contract for OCR work. The implementation owner is `recognizer.js`.
> OCR changes must be fixture-driven where possible and must not be mixed with unrelated UI refactors.

## 1. Pipeline boundary

OCR receives text from the capture/shortcut flow and proposes ledger fields. The ledger UI remains the place where the user can review/edit before saving.

Do not duplicate parsing logic in `app.js`, `ui-runtime.js` or page-specific code.

## 2. Basic type signals

Historical rule direction:

- negative amount/sign commonly suggests expense;
- positive amount/sign commonly suggests income;
- two-account movement or explicit transfer language may override the simple sign heuristic and become transfer;
- borrowing/lending/debt cases are risky to infer and may require manual choice.

Signs are evidence, not the only classifier.

## 3. Account matching

Account names come from current StarLedger configuration.

Requirements:

- refresh/use current configured accounts when recognition runs;
- tolerate platform wording around an account name;
- do not keep a stale account dictionary after a user renames an account;
- if source/destination are both confidently identified, preserve their direction;
- if confidence is insufficient, leave the field editable rather than choosing an unrelated account.

## 4. WeChat semantics / regression cases

Maintain fixtures for at least these cases:

### Income to balance

Text meaning: "当前状态-已存入零钱".

Expected: income destination account should resolve to the configured account representing 零钱 when present.

### Refund to balance

Text meaning: "退款方式-零钱".

Expected: refund income destination should resolve to 零钱 when present.

### Balance -> LingQianTong

Text meaning: "转入零钱通，来自零钱".

Expected:

- type = transfer;
- source = 零钱;
- destination = 零钱通.

It must not be reduced to ordinary income merely because money arrives in 零钱通.

### External account -> LingQianTong

When OCR text identifies a configured source account and a destination of 零钱通, treat it as transfer if evidence is sufficient.

## 5. Regression discipline

Every OCR bug fix should add or preserve a minimal fixture/sample that proves:

- the reported case now works;
- nearby old cases still work;
- account renaming/current-config behavior is covered when relevant.

Prefer semantic parsers and small helpers over adding one more broad regex that accidentally captures unrelated receipts.

## 6. Unknown providers

Do not generalize a WeChat-specific phrase to all payment providers without evidence.

Add provider-specific normalization where needed, then map normalized semantics into common transaction fields.

## 7. Debugging

When recognition fails, separate:

1. OCR text acquisition failure;
2. provider/text normalization failure;
3. transaction-type classification failure;
4. account lookup/mapping failure;
5. UI prefill/display failure.

Do not patch stage 5 to hide a failure in stages 2-4.
