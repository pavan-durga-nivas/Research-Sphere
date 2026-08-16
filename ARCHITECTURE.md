# Architecture

This file records the system-level decisions in Research-Sphere and the
tradeoffs behind them — the "why," not the "what" (the README covers what the
app does; [`development_tracking.md`](./development_tracking.md) is the
chronological changelog of how each decision was implemented). New
architecturally-significant decisions should be added here as short ADR
entries.

## System overview

```
Browser
  │
  ▼
Next.js App Router (middleware.ts — route protection)
  │
  ├── Route handlers (src/app/api/*)        AI assistant, auth, documents,
  │                                          collaborators, library, validation
  │
  ├── Server actions (src/app/actions.ts)
  │
  └── Editor UI (TipTap/ProseMirror)  ──►  autosave (debounced)
                                             + 3s poll for remote changes
  │
  ▼
Storage abstraction (src/lib/data-store.ts / mongo.ts)
  │
  ├── Local JSON files (data/*.json)   — default, zero-setup
  └── MongoDB                          — opt-in via MONGODB_URI
```

## ADR-001: Storage — pluggable JSON-file store with an optional MongoDB backend

**Decision:** `readStore`/`writeStore` (`src/lib/data-store.ts`) define the
storage contract; the app runs against local JSON files by default and swaps
to MongoDB when `MONGODB_URI` is set, via `src/lib/mongo.ts`. A one-off script
(`scripts/migrate-json-to-mongo.mjs`) migrates existing local data.

**Why:** the app needed to be runnable by anyone with zero external
dependencies (a common friction point for reviewers evaluating a project), while
still being deployable with real multi-user persistence. A storage interface
that both backends satisfy avoids forking the app into "demo mode" and
"real mode" code paths.

**Tradeoff accepted:** the JSON backend is explicitly single-node and not
safe under concurrent writers — acceptable for local dev and demos, not for
production. This is documented rather than hidden (see README's Data &
Persistence section).

## ADR-002: Auth — hand-rolled HMAC session tokens instead of a library

**Decision:** sessions are signed HMAC-SHA256 tokens (`src/lib/session-token.ts`,
a JWT-shaped but custom implementation) stored in an `httpOnly`, `sameSite=lax`
cookie; passwords are hashed with `scrypt` and compared with
`timingSafeEqual` (`src/lib/auth.ts`). Route protection is enforced centrally
in `src/middleware.ts` against an explicit allowlist of protected paths.

**Why:** the token format and verification are small enough to own directly
(sign/verify is ~30 lines) rather than pull in a full auth library for a
single-tenant-per-deployment app. This was a deliberate scope choice, not an
oversight — the tradeoff is spelled out below.

**Tradeoff accepted:** no built-in support for refresh-token rotation, OAuth
providers, or revocation lists — a real requirement would justify moving to
NextAuth/Auth.js or a hosted provider. Timing-safe comparison and scrypt (not
plain hashing) were kept non-negotiable even at this scope.

## ADR-003: Editor — TipTap/ProseMirror over Lexical, Slate, or `contentEditable`

**Decision:** documented in full in `development_tracking.md`. Short version:
the editor was rebuilt on TipTap because it's schema-based (documents can't
drift into invalid HTML the way raw `contentEditable` allows), has a mature
extension ecosystem (tables, resizable images, multi-column layout were all
needed), and has first-class Yjs support for the planned real-time
collaboration phase. Lexical was rejected for a thinner extension set at the
time of evaluation; Slate for requiring more to be built from scratch; raw
`contentEditable`/`execCommand` was the status quo being replaced because it's
a dead end for Word-parity features.

## ADR-004: Concurrent edits — poll-based overwrite guard, not OT/CRDT (yet)

**Decision:** the editor autosaves on a debounce and polls every 3 seconds for
remote changes. If a collaborator's save is newer than the local base
version, the local save is blocked and a "collaborator saved newer changes"
banner is shown, rather than silently overwriting their edit.

**Why:** true concurrent editing needs an OT/CRDT layer (Yjs, given the TipTap
choice) — that's real complexity, scheduled as Phase 5 in the roadmap. The
interim guard's job is narrower: make data loss impossible in the meantime.
Detecting a conflict and refusing to clobber is a correctness floor that
doesn't require the full collaboration engine to be built first.

**Tradeoff accepted:** this is last-writer-protected, not merged — a
conflicting collaborator has to reconcile manually. Explicitly a stopgap
until Phase 5 (Yjs).

## Known limitations (tracked, not hidden)

- Base64 images are inlined into stored documents rather than uploaded to
  object storage — fine for demo-scale content, a real bloat/perf problem at
  scale. Tracked in `development_tracking.md`.
- No automated test suite yet beyond `tsc --noEmit` / `eslint` / `next build`
  as merge gates — see [`development_tracking.md`](./development_tracking.md)
  for the roadmap phases where this is addressed.

## Future work

Full task breakdown and status lives in
[`development_tracking.md`](./development_tracking.md) (phased roadmap table)
and the README's [Roadmap](./README.md#roadmap) section — both are kept
current as work lands, so treat this file as the "why we're here," and those
as "what's left."
