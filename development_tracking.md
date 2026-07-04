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
| 0 | De-risking spike — prove TipTap mounts, ingests stored HTML, drives toolbar | Done |
| 1 | Swap editor core behind existing toolbar | Done |
| 2 | Word-parity features (image resize, tables, multi-column, styles) | Done |
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

### 2026-07-04 — Phase 1+2: TipTap editor core swap & Word-parity features
- **Branch:** `spike/tiptap-editor-foundation`

Replaced the production editor's `contentEditable` + `document.execCommand`
core with a full TipTap (ProseMirror) editor, and added Word-like features.

**New dependencies**
- `@tiptap/extension-image`, `-link` (via StarterKit), `-text-align`,
  `-highlight`, `-subscript`, `-superscript`, `-table` (+ row/cell/header),
  `-placeholder`.

**New files**
- `src/components/editor/extensions/resizable-image.tsx` — Image node with a
  drag-to-resize handle (React NodeView); persists pixel `width` through the
  HTML round-trip.
- `src/components/editor/extensions/columns.ts` — `columns`/`column` nodes with
  a `setColumns(2|3)` command for multi-column layout (CSS grid).

**Editor rewrite (`src/app/editor/page.tsx`)**
- Full toolbar wired to TipTap commands with live active states: undo/redo,
  paragraph, H1–H3, bold/italic/underline/strike/highlight/super/sub/inline
  code, align left/center/right/justify, bullet/ordered lists, blockquote, code
  block, link (with prompt + unset), image upload, table insert, 2/3 columns,
  horizontal rule, clear formatting.
- Contextual table controls (add/remove row & column, toggle header, delete
  table) shown only when the selection is inside a table.
- Preserved all surrounding behaviour: autosave (debounced), 3s sync + the
  overwrite guard/"remote changes" banner, permissions/read-only mode,
  collaborators/invite, comments, scratchpad, AI assistant, Word/PDF export,
  and LaTeX preview — all repointed from `editorRef.innerHTML` to
  `editor.getHTML()` / `editor.view.dom`.
- Stale-closure hardening: autosave routes through refs (`titleRef`,
  `contentRef`, `persistRef`) so TipTap's `onUpdate` always saves current state.
- Content ingestion (`applyEditorContent`) uses `setContent(html, { emitUpdate:
  false })` and queues content that arrives before the editor mounts.
- **AI assistant / sidebar UX:** the whole right dock is now collapsible; when
  hidden, the editor reclaims full width and a floating "Workspace" button
  (bottom-right) reopens it — resolving the open/close friction.

**Editor content styles (`globals.css`)**
- Replaced the blunt `.rich-editor * { color: … !important }` rule with a proper
  `.prose-editor` style system (headings, lists, tables, resizable images,
  columns, blockquote, code, links, highlight, placeholder, selection),
  theme-aware in both light and dark.

**Verification**
- `tsc --noEmit`, `eslint` (only a benign `<img>` warning in the image
  NodeView), and `next build` all pass.
- Runtime smoke test: authenticated `/editor` request returns 200, renders the
  new toolbar (Insert-table / Two-columns), no server or compile errors.

**Known follow-ups**
- Legacy citation/reference/note inserts now render as schema-safe blockquotes
  (the old styled `<div>`/`<aside>` boxes aren't in the ProseMirror schema).
- Base64 images still inline into the document; move to uploads (DB bloat).
- The `/editor/spike` route remains as a reference; safe to delete later.

---

## Design system + collaboration overwrite guard
- **PR:** #2 — `fix/design-system-and-collab-ux`

Fixed the missing design-token layer (`card`, `input`, `ring`, `destructive`,
etc.) so `ui/*` primitives resolve; replaced 65 `border-white/10` with
theme-aware `border-hairline`; routed hardcoded status colors through
`--error/--success/--warning`; fixed editor `text-white` → `text-foreground`;
and added a collaboration overwrite guard so the 3s poll no longer silently
clobbers in-flight edits (adds a "collaborator saved newer changes" banner).
