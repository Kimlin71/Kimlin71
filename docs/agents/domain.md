# Domain Docs

How the engineering skills should consume this repo’s domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root if it exists: it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- `docs/adr/`: read ADRs that touch the area you’re about to work in. In multi-context repos, also check `src/<context>/docs/adr/` for context-scoped decisions.

If any of these files don’t exist, proceed silently. Don’t flag their absence or suggest creating them upfront; `/domain-modeling` creates them lazily when terms or decisions are resolved.

## File structure

This repo uses a single-context layout: root `CONTEXT.md` and `docs/adr/`.

## Use the glossary’s vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`. If the concept is missing, reconsider the terminology or note the gap for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
