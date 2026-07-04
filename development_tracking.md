# Development Tracking

A running log of notable engineering changes, decisions, and their tracking
artifacts (issues / PRs). Newest entries first.

---

## Editor modernization epic — "mini MS Word"

**Goal:** evolve the editor from a `contentEditable` + `document.execCommand`
surface into a Word-parity rich-text experience (multi-column, image resize,
real tables, styles), with a floating/dockable AI assistant and real-time
collaboration.

**Decision (confirmed):** adopt **TipTap (ProseMirror)** as the editor
foundation. Rationale: schema-based document model, mature extension ecosystem
(tables, resizable images, columns), first-class Yjs collaboration. Alternatives
considered: Lexical (smaller extension set), Slate (assemble-everything),
staying on `contentEditable` (dead end for these features).

### Phased roadmap
| Phase | Scope | Status |
| --- | --- | --- |
| 0 | De-risking spike — prove TipTap mounts, ingests stored HTML, drives toolbar | In progress |
| 1 | Swap editor core behind existing toolbar | Planned |
| 2 | Word-parity features (image resize, tables, multi-column, styles) | Planned |
| 3 | Floating/dockable AI assistant + full sidebar collapse | Planned |
| 4 | Export fidelity (real `.docx`, structured PDF) | Planned |
| 5 | Real-time collaboration (Yjs + presence) | Planned |

---

### 2026-07-04 — Phase 0: TipTap de-risking spike
- **Issue:** #3
- **Branch:** `spike/tiptap-editor-foundation`
- **PR:** #4

**Changes**
- Added dependencies: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`
  (v3.27.x).
- Added isolated spike route `src/app/editor/spike/page.tsx` (throwaway; does
  not touch the production editor at `src/app/editor/page.tsx`).
  - Mounts a TipTap editor with `StarterKit`, SSR-safe (`immediatelyRender:
    false`).
  - Ingests the first stored document's HTML via `/api/documents` to prove the
    content-migration path; falls back to a representative sample when none is
    found.
  - Minimal toolbar (bold / italic / H2 / bullet + numbered list / blockquote /
    undo / redo) wired to TipTap commands, proving the existing toolbar model
    re-wires cleanly.
  - Shows serialized `getHTML()` output to confirm the round-trip back to the
    HTML the current save pipeline persists.

**Acceptance criteria (issue #3)**
- [x] TipTap + StarterKit installed; app builds.
- [x] Isolated `/editor/spike` route mounts TipTap.
- [x] Ingests existing stored HTML (with sample fallback).
- [x] Minimal toolbar drives TipTap commands.
- [x] `tsc --noEmit`, `eslint`, `next build` pass.
- [x] Production editor untouched.

**Follow-ups identified**
- StarterKit drops legacy `<table>` / `<img>` structure on ingest — Phase 2 must
  add the Table and Image (resize) extensions before real migration.
- Base64 images should move to real uploads before Phase 1 (DB bloat).
- `npm audit` reports pre-existing vulnerabilities (unrelated to TipTap); triage
  separately.

---

## Design system + collaboration overwrite guard
- **PR:** #2 — `fix/design-system-and-collab-ux`

Fixed the missing design-token layer (`card`, `input`, `ring`, `destructive`,
etc.) so `ui/*` primitives resolve; replaced 65 `border-white/10` with
theme-aware `border-hairline`; routed hardcoded status colors through
`--error/--success/--warning`; fixed editor `text-white` → `text-foreground`;
and added a collaboration overwrite guard so the 3s poll no longer silently
clobbers in-flight edits (adds a "collaborator saved newer changes" banner).
