# Codex Handoff

StarLedger is transitioning from chat-driven prototyping to repository-driven maintenance.

## Read first

Before any code change, read in this order:

1. `AGENTS.md`
2. `README.md`
3. `docs/ARCHITECTURE.md`
4. `docs/DATA_MODEL.md`
5. `docs/PRODUCT_RULES.md`
6. task-specific docs such as `docs/OCR_RULES.md`

Then inspect current `main`. Do not treat old chat context as source of truth.

## First-task behavior

For the first substantial task in a new Codex session:

- summarize the relevant architecture/owners;
- state the intended change radius;
- state explicit non-goals;
- identify data-risk or Safari/iOS-risk areas;
- propose a short implementation/verification plan before editing.

For a straightforward, well-scoped later task, do not create ceremony for its own sake.

## Repository condition

This is an evolved production-like personal project, not a greenfield rewrite.

Large files and historical CSS exist. Their existence is not permission to rewrite them.

Current strategy is strangler-style maintenance:

- keep working behavior stable;
- move new behavior into the correct owner;
- consolidate duplicated concepts when a concrete task exposes them;
- leave regression protection after important bug fixes.

## Truth hierarchy

For implementation questions:

1. explicit current user task;
2. current data-safety invariants;
3. `AGENTS.md` and current architecture docs;
4. current `main` behavior/code;
5. older requirement/history notes.

If a lower layer conflicts with a higher one, flag it.

## Definition of done

A code task is not done merely because code was written.

Depending on scope, done means:

- targeted validation/tests pass;
- diff contains no unrelated changes;
- persistence/data semantics are preserved;
- service-worker/cache references are updated when runtime assets change;
- PR/CI/Pages gates pass;
- iPhone Safari behaviors that cannot be automated are listed for human verification rather than claimed as verified.

## Important product context

StarLedger is local-first and data safety dominates UI convenience.

The project is heavily used on iPhone Safari, so browser chrome, keyboard, visualViewport, safe areas and scroll restoration are first-class behavior.

OCR is a separate subsystem and should be fixture-driven.

Multiple main ledgers, user-defined account names, bill relations and workspace merging mean that "simple" changes to IDs, account names, filters, imports or saves can have cross-cutting data effects.

## When uncertain

Do not compensate for uncertainty with another patch layer.

Reproduce, locate the owner, inspect the current call/data path, then make the smallest coherent change. If the product semantics remain ambiguous, report the ambiguity before changing stored data.
