"use client"

/**
 * Phase 0 de-risking spike for the TipTap editor foundation.
 * Tracking: GitHub issue #3.
 *
 * THROWAWAY / ISOLATED — this route does not touch the production editor
 * (`src/app/editor/page.tsx`). Its only job is to prove:
 *   1. TipTap (ProseMirror) mounts cleanly inside this Next.js app.
 *   2. Existing stored-document HTML can be ingested (content migration path).
 *   3. The existing toolbar model can drive TipTap commands.
 *   4. Serialization round-trips back to HTML for the current save pipeline.
 *
 * Do not build production features on this route — see development_tracking.md.
 */

import { useEffect, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import type { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/Button"

/**
 * Representative sample mirroring markup the production editor emits
 * (headings, lists, a citation-style note, an image figure, a table).
 * Used as a fallback when no stored document is available so the spike is
 * demonstrable without a seeded account.
 */
const SAMPLE_HTML = `
  <h2>TipTap spike — content ingest check</h2>
  <p>This paragraph proves <strong>bold</strong>, <em>italic</em>, and inline
  formatting survive the HTML → ProseMirror → HTML round-trip.</p>
  <ul>
    <li>Bulleted list item one</li>
    <li>Bulleted list item two</li>
  </ul>
  <blockquote>Existing blockquotes ingest as ProseMirror nodes.</blockquote>
  <p>Legacy tables and figures degrade gracefully under StarterKit (they render
  as text/paragraphs here; the real migration adds the Table and Image
  extensions in Phase 2).</p>
`

type IngestSource = "loading" | "stored-document" | "sample-fallback"

function ToolbarButton({
  editor,
  label,
  active,
  onClick,
  children,
}: {
  editor: Editor | null
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-8"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={!editor}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export default function TipTapSpikePage() {
  const [source, setSource] = useState<IngestSource>("loading")
  const [serialized, setSerialized] = useState("")

  const editor = useEditor({
    extensions: [StarterKit],
    // Required for Next.js SSR: defer first render to the client to avoid
    // hydration mismatches. This is the recommended pattern for TipTap v3.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[50vh] rounded-xl border border-border bg-background/60 p-4 text-base leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => setSerialized(editor.getHTML()),
  })

  // Ingest real stored HTML (proves the migration path); fall back to sample.
  useEffect(() => {
    if (!editor) return
    let cancelled = false

    const ingest = async () => {
      try {
        const response = await fetch("/api/documents", { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          const docs = (data.documents as { content?: string }[]) || []
          const html = docs.find((doc) => doc.content && doc.content.trim())?.content
          if (html && !cancelled) {
            editor.commands.setContent(html)
            setSource("stored-document")
            setSerialized(editor.getHTML())
            return
          }
        }
      } catch {
        // fall through to sample
      }
      if (!cancelled) {
        editor.commands.setContent(SAMPLE_HTML)
        setSource("sample-fallback")
        setSerialized(editor.getHTML())
      }
    }

    ingest()
    return () => {
      cancelled = true
    }
  }, [editor])

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
        <strong>Phase 0 spike (issue #3).</strong> Throwaway route to de-risk the
        TipTap adoption. Not a production feature — the real editor is untouched.
      </div>

      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">TipTap foundation spike</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content source:{" "}
          <span className="font-medium text-foreground">
            {source === "loading"
              ? "loading…"
              : source === "stored-document"
              ? "your first stored document (real migration path)"
              : "sample fallback (no stored document found)"}
          </span>
        </p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-1 rounded-md border border-border bg-background p-1">
        <ToolbarButton
          editor={editor}
          label="Bold"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Italic"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Heading 2"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Bulleted list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Blockquote"
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton
          editor={editor}
          label="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          label="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-border" />
        <ToolbarButton
          editor={editor}
          label="Reload sample"
          onClick={() => {
            editor?.commands.setContent(SAMPLE_HTML)
            setSource("sample-fallback")
            setSerialized(editor?.getHTML() ?? "")
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Serialized HTML (round-trip check — this is what the current save pipeline persists)
        </h2>
        <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed">
          {serialized || "—"}
        </pre>
      </section>
    </div>
  )
}
