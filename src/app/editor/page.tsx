"use client"

import type { ChangeEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript as SubscriptExt } from "@tiptap/extension-subscript"
import { Superscript as SuperscriptExt } from "@tiptap/extension-superscript"
import { TextAlign } from "@tiptap/extension-text-align"
import { Table } from "@tiptap/extension-table"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { Placeholder } from "@tiptap/extension-placeholder"
import { ResizableImage } from "@/components/editor/extensions/resizable-image"
import { Columns, Column } from "@/components/editor/extensions/columns"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Minus,
  Link2 as LinkIcon,
  Columns2,
  Columns3,
  Rows3,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MessagesSquare,
  NotebookPen,
  SearchCheck,
  Sparkles,
  Users,
  Save,
  Download,
  Share2,
  Loader2,
  Plus,
  Code2,
  Copy,
  X,
  Beaker,
  BookOpen,
  Highlighter,
  Link2,
  Superscript,
  Subscript,
  Highlighter as HighlighterIcon,
  Undo2,
  Redo2,
  Eraser,
  Table2,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import type { StoredDocument } from "@/types"

interface AssistantMessage {
  role: "user" | "assistant"
  content: string
}

/** A single icon button in the formatting toolbar. */
function ToolButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-border" />
}

export default function EditorPage() {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<(StoredDocument & { permission?: "owner" | "edit" | "view" })[]>([])
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null)
  const [title, setTitle] = useState("Untitled Document")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [docPermission, setDocPermission] = useState<"owner" | "edit" | "view">("owner")
  const [canEdit, setCanEdit] = useState(true)
  const [isOwner, setIsOwner] = useState(true)
  const lastSavedRef = useRef<Date | null>(null)
  const isDirtyRef = useRef(false)
  const editorFocusedRef = useRef(false)
  // Kept up to date so autosave/sync callbacks avoid stale closures.
  const titleRef = useRef(title)
  const contentRef = useRef(content)
  const editorInstanceRef = useRef<Editor | null>(null)
  // Holds content that arrives before the editor instance is ready.
  const pendingContentRef = useRef<string | null>(null)
  const [remoteUpdateAvailable, setRemoteUpdateAvailable] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content: "Ask me for outline suggestions, section summaries, or citation help.",
    },
  ])
  const [assistantInput, setAssistantInput] = useState("")
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState<string | null>(null)
  const [exporting, setExporting] = useState<"pdf" | "doc" | null>(null)
  const [collaborators, setCollaborators] = useState<
    { id: string; name?: string; email?: string; permission: "view" | "edit"; userId?: string }[]
  >([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteAccountId, setInviteAccountId] = useState("")
  const [invitePermission, setInvitePermission] = useState<"view" | "edit">("edit")
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [collabError, setCollabError] = useState<string | null>(null)
  const [collabBusyId, setCollabBusyId] = useState<string | null>(null)
  const [shareInProgress, setShareInProgress] = useState(false)
  const [latexModalOpen, setLatexModalOpen] = useState(false)
  const [latexContent, setLatexContent] = useState("")
  const [latexCopyStatus, setLatexCopyStatus] = useState<string | null>(null)
  const [scratchNote, setScratchNote] = useState("")
  const [scratchNotes, setScratchNotes] = useState<{ id: string; text: string }[]>([])
  const [toolMessage, setToolMessage] = useState<string | null>(null)
  const [citationFields, setCitationFields] = useState({ author: "", title: "", year: "", link: "" })
  const [comments, setComments] = useState<{ id: string; text: string; author: string; createdAt: Date }[]>([])
  const [commentDraft, setCommentDraft] = useState("")
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<"documents" | "collaborators" | "comments" | "toolkit" | null>(null)
  const [scratchpadCollapsed, setScratchpadCollapsed] = useState(false)
  const [assistantCollapsed, setAssistantCollapsed] = useState(false)
  const [rightDockOpen, setRightDockOpen] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    titleRef.current = title
  }, [title])
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Stable autosave scheduler that reads the latest persist fn/title via refs.
  const persistRef = useRef<(html: string, docTitle: string) => Promise<unknown>>(async () => undefined)

  const scheduleSave = useCallback((docContent: string, docTitle: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistRef.current(docContent, docTitle)
    }, 1000)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      Highlight.configure({ multicolor: false }),
      SubscriptExt,
      SuperscriptExt,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ResizableImage.configure({ allowBase64: true, inline: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Columns,
      Column,
      Placeholder.configure({ placeholder: "Start writing your research draft…" }),
    ],
    editorProps: {
      attributes: {
        class: "prose-editor rich-editor min-h-[70vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      isDirtyRef.current = true
      setContent(html)
      scheduleSave(html, titleRef.current)
    },
    onFocus: () => {
      editorFocusedRef.current = true
    },
    onBlur: () => {
      editorFocusedRef.current = false
    },
  })

  // Keep an editor ref for closures + flush any content queued before mount.
  useEffect(() => {
    editorInstanceRef.current = editor ?? null
    if (editor && pendingContentRef.current !== null) {
      editor.commands.setContent(pendingContentRef.current, { emitUpdate: false })
      pendingContentRef.current = null
    }
  }, [editor])

  // Toggle editability with permissions.
  useEffect(() => {
    editor?.setEditable(canEdit)
  }, [editor, canEdit])

  // Push HTML into the editor without triggering the autosave/update loop.
  const applyEditorContent = useCallback((html: string) => {
    const value = html && html.trim() ? html : "<p></p>"
    const instance = editorInstanceRef.current
    if (instance) {
      instance.commands.setContent(value, { emitUpdate: false })
    } else {
      pendingContentRef.current = value
    }
  }, [])

  const fetchCollaborators = useCallback(
    async (docId: string, ownerId: string) => {
      if (!docId) return
      if (!user || user.id !== ownerId) {
        setCollaborators([])
        setCollabError(null)
        return
      }
      try {
        const response = await fetch(`/api/collaborators/access?documentId=${docId}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Unable to load collaborators.")
        }
        const data = await response.json()
        setCollaborators(data.collaborators ?? [])
        setCollabError(null)
      } catch (error) {
        console.error(error)
        setCollabError(error instanceof Error ? error.message : "Unable to load collaborators.")
      }
    },
    [user],
  )

  const loadDocument = useCallback(
    (doc: StoredDocument & { permission?: "owner" | "edit" | "view" }) => {
      setCurrentDocumentId(doc.id)
      setTitle(doc.title)
      setContent(doc.content)
      setDocPermission(doc.permission ?? "owner")
      setIsOwner(doc.userId === user?.id)
      setCanEdit((doc.permission ?? "owner") !== "view")
      applyEditorContent(doc.content)
      isDirtyRef.current = false
      setRemoteUpdateAvailable(false)
      setLastSaved(new Date(doc.updatedAt))
      fetchCollaborators(doc.id, doc.userId)
    },
    [applyEditorContent, fetchCollaborators, user?.id],
  )

  const createNewDocument = useCallback(async () => {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document", content: "" }),
    })
    const data = await response.json()
    const newDoc = { ...(data.document as StoredDocument), permission: "owner" as const }
    setDocuments((prev) => [newDoc, ...prev])
    loadDocument(newDoc)
  }, [loadDocument])

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/documents", { cache: "no-store" })
        const data = await response.json()
        const docs =
          (data.documents as (StoredDocument & { permission?: "owner" | "edit" | "view" })[]) || []
        setDocuments(docs)
        if (docs.length > 0) {
          loadDocument(docs[0])
        } else {
          await createNewDocument()
        }
      } catch (error) {
        console.error("Failed to load documents", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocuments()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [createNewDocument, loadDocument])

  useEffect(() => {
    if (!toolMessage) return
    const timer = setTimeout(() => setToolMessage(null), 2500)
    return () => clearTimeout(timer)
  }, [toolMessage])

  useEffect(() => {
    lastSavedRef.current = lastSaved
  }, [lastSaved])

  useEffect(() => {
    if (!currentDocumentId) return

    let cancelled = false

    const syncLatest = async () => {
      try {
        const response = await fetch("/api/documents", { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        const docs =
          (data.documents as (StoredDocument & { permission?: "owner" | "edit" | "view" })[]) || []
        if (cancelled) return

        setDocuments(docs)

        const current = docs.find((doc) => doc.id === currentDocumentId)
        if (!current) return

        const updatedAt = new Date(current.updatedAt)
        const localLastSaved = lastSavedRef.current
        const remoteIsNewer = !localLastSaved || updatedAt.getTime() > localLastSaved.getTime()

        setDocPermission(current.permission ?? "owner")
        setIsOwner(current.userId === user?.id)
        setCanEdit((current.permission ?? "owner") !== "view")

        // Don't clobber in-flight local edits. If the user is actively
        // editing or has unsaved changes, surface the update instead of
        // silently overwriting their work (last-writer-wins data loss).
        const localBusy = editorFocusedRef.current || isDirtyRef.current

        if (remoteIsNewer && !localBusy) {
          setTitle(current.title)
          setContent(current.content)
          applyEditorContent(current.content)
          setLastSaved(updatedAt)
          setRemoteUpdateAvailable(false)
        } else if (remoteIsNewer && localBusy) {
          setRemoteUpdateAvailable(true)
        }

        if (current.userId === user?.id) {
          await fetchCollaborators(current.id, current.userId)
        }
      } catch (error) {
        console.error("Sync failed", error)
      }
    }

    syncLatest()
    const interval = setInterval(syncLatest, 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [applyEditorContent, currentDocumentId, fetchCollaborators, user?.id])

  const persistDocument = useCallback(async (docContent: string, docTitle: string) => {
    if (!canEdit) {
      setStatusMessage("View-only access")
      return
    }
    if (!docTitle.trim() && !docContent.trim()) return
    setIsSaving(true)
    setStatusMessage("Saving...")
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentDocumentId ?? undefined,
          title: docTitle || "Untitled Document",
          content: docContent,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to save document.")
      }
      const updatedDoc = { ...(data.document as StoredDocument), permission: docPermission }
      setCurrentDocumentId(updatedDoc.id)
      setDocuments((prev) => {
        const index = prev.findIndex((doc) => doc.id === updatedDoc.id)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = updatedDoc
          return updated.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          )
        }
        return [updatedDoc, ...prev]
      })
      setLastSaved(new Date(updatedDoc.updatedAt))
      isDirtyRef.current = false
      setStatusMessage("Saved")
      return updatedDoc
    } catch (error) {
      console.error(error)
      setStatusMessage("Save failed")
      return undefined
    } finally {
      setIsSaving(false)
    }
  }, [canEdit, currentDocumentId, docPermission])

  useEffect(() => {
    persistRef.current = persistDocument
  }, [persistDocument])

  const ensureDocumentId = useCallback(async () => {
    let docId = currentDocumentId
    if (!docId) {
      const saved = await persistDocument(content || "<p></p>", title || "Untitled Document")
      if (saved?.id) {
        docId = saved.id
        setCurrentDocumentId(saved.id)
      }
    }
    return docId
  }, [content, currentDocumentId, persistDocument, title])

  const handleTitleChange = (value: string) => {
    isDirtyRef.current = true
    setTitle(value)
    scheduleSave(contentRef.current, value)
  }

  // Pull the latest server copy on demand once the user has resolved their
  // in-flight edits (used by the "remote changes" banner).
  const loadRemoteUpdate = useCallback(async () => {
    if (!currentDocumentId) return
    try {
      const response = await fetch("/api/documents", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      const docs =
        (data.documents as (StoredDocument & { permission?: "owner" | "edit" | "view" })[]) || []
      const current = docs.find((doc) => doc.id === currentDocumentId)
      if (!current) return
      setTitle(current.title)
      setContent(current.content)
      applyEditorContent(current.content)
      isDirtyRef.current = false
      setLastSaved(new Date(current.updatedAt))
      setRemoteUpdateAvailable(false)
    } catch (error) {
      console.error("Failed to load remote update", error)
    }
  }, [applyEditorContent, currentDocumentId])

  // Insert schema-safe HTML at the current selection.
  const insertHtmlBlock = (html: string) => {
    if (!canEdit || !editor) return
    editor.chain().focus().insertContent(html).run()
  }

  const handleSetLink = () => {
    if (!editor) return
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previousUrl ?? "https://")
    if (url === null) return
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run()
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !editor) {
      event.target.value = ""
      return
    }
    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result
      if (typeof result === "string") {
        editor.chain().focus().setImage({ src: result, alt: file.name }).run()
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const handleShare = async () => {
    if (typeof window === "undefined" || shareInProgress) return
    setShareInProgress(true)
    const documentId = await ensureDocumentId()
    if (!documentId) {
      setShareFeedback("Save the document before sharing.")
      setShareInProgress(false)
      return
    }
    const shareUrl = new URL("/editor", window.location.origin)
    shareUrl.searchParams.set("doc", documentId)

    const link = shareUrl.toString()
    try {
      if (navigator.share) {
        await navigator.share({
          title: title || "Research document",
          text: "Collaborate with me on this Research-Sphere draft.",
          url: link,
        })
        setShareFeedback("Link sent!")
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
        setShareFeedback("Link copied to clipboard.")
      } else {
        setShareFeedback("Copy this link manually: " + link)
      }
    } catch (error) {
      console.error("Share failed", error)
      setShareFeedback("Unable to share right now.")
    } finally {
      setTimeout(() => setShareFeedback(null), 4000)
      setShareInProgress(false)
    }
  }

  const buildSafeFileName = (extension: string) => {
    const base = (title || "document").replace(/[^\w\d-_ ]+/g, "").trim().replace(/\s+/g, "_") || "document"
    return `${base}.${extension}`
  }

  const handleDownloadDoc = () => {
    const editorEl = editor?.view.dom as HTMLElement | undefined
    if (!editorEl) return
    setExporting("doc")
    try {
      const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${editorEl.innerHTML}</body></html>`
      const blob = new Blob([html], { type: "application/msword" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = buildSafeFileName("doc")
      link.click()
      URL.revokeObjectURL(url)
      setToolMessage("Word download ready.")
    } catch (error) {
      console.error("DOC export failed", error)
      setToolMessage("Unable to export Word file.")
    } finally {
      setExporting(null)
    }
  }

  const createExportSandbox = () => {
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-10000px"
    iframe.style.top = "0"
    iframe.style.width = "1200px"
    iframe.style.height = "2000px"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument
    if (!doc) throw new Error("Unable to create export sandbox.")
    doc.open()
    doc.write(
      '<!doctype html><html><head><style>' +
        'body{margin:0;padding:0;background:#fff;color:#111;font-family:"Inter",system-ui,sans-serif;width:900px;}' +
        '*,*::before,*::after{color:#111 !important;background-color:transparent !important;}' +
        'a{color:#0a58ca !important;}' +
        'code,pre{background-color:#f5f5f5 !important;color:#111 !important;border-radius:4px;}' +
      "</style></head><body></body></html>",
    )
    doc.close()
    return { iframe, doc }
  }

  const sanitizeColorValue = (value: string, fallback = "#111") =>
    value.replace(/oklch?\([^)]+\)/gi, fallback).replace(/oklab\([^)]+\)/gi, fallback)

  const buildCleanClone = (source: HTMLElement, targetDoc: Document) => {
    const clone = targetDoc.importNode(source, true) as HTMLElement
    const defaultTextColor = "#111"
    const linkColor = "#0a58ca"
    const stripClasses = (el: Element) => {
      if (el instanceof HTMLElement) {
        el.removeAttribute("class")
        if (el.getAttribute("style")) {
          el.setAttribute("style", sanitizeColorValue(el.getAttribute("style") || ""))
        }
        el.style.color = el.tagName === "A" ? linkColor : defaultTextColor
        el.style.backgroundColor = sanitizeColorValue(
          el.style.backgroundColor || "transparent",
          "transparent",
        )
        el.style.borderColor = sanitizeColorValue(el.style.borderColor || "")
      }
      Array.from(el.children).forEach(stripClasses)
    }
    stripClasses(clone)
    clone.style.padding = "24px"
    clone.style.backgroundColor = "#fff"
    clone.style.color = defaultTextColor
    clone.style.lineHeight = "1.6"
    clone.style.fontSize = "14px"
    clone.style.fontFamily = '"Inter", system-ui, sans-serif'

    clone.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLElement)) return
      img.style.maxWidth = "100%"
      img.style.height = "auto"
      img.style.borderRadius = img.style.borderRadius || "4px"
    })

    clone.querySelectorAll("table").forEach((table) => {
      if (!(table instanceof HTMLElement)) return
      table.style.borderCollapse = "collapse"
      table.style.width = "100%"
    })

    clone.querySelectorAll("th, td").forEach((cell) => {
      if (!(cell instanceof HTMLElement)) return
      cell.style.border = cell.style.border || "1px solid #ccc"
      cell.style.padding = cell.style.padding || "6px"
    })

    clone.querySelectorAll("code, pre").forEach((codeEl) => {
      if (codeEl instanceof HTMLElement) {
        codeEl.style.backgroundColor = "#f5f5f5"
        codeEl.style.color = defaultTextColor
        codeEl.style.borderRadius = "4px"
        codeEl.style.padding = codeEl.tagName === "PRE" ? "8px" : "2px 4px"
        codeEl.style.display = codeEl.tagName === "PRE" ? "block" : "inline"
        codeEl.style.overflowX = "auto"
      }
    })

    return clone
  }

  const handleDownloadPdf = async () => {
    const editorEl = editor?.view.dom as HTMLElement | undefined
    if (!editorEl) return
    setExporting("pdf")
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")])

      const { iframe, doc } = createExportSandbox()
      const cleanClone = buildCleanClone(editorEl, doc)
      doc.body.appendChild(cleanClone)

      const canvas = await html2canvas(cleanClone, {
        backgroundColor: "#fff",
        scale: 1,
        useCORS: true,
        allowTaint: true,
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pageWidth / imgWidth, (pageHeight - 40) / imgHeight)
      const renderWidth = imgWidth * ratio
      const renderHeight = imgHeight * ratio
      const marginX = (pageWidth - renderWidth) / 2
      const marginY = 20

      pdf.addImage(imgData, "PNG", marginX, marginY, renderWidth, renderHeight)

      const plainText = (editorEl.innerText || "").trim()
      if (plainText) {
        let y = 40
        const lineHeight = 16
        const maxWidth = pageWidth - 40
        const lines = pdf.splitTextToSize(plainText, maxWidth)

        pdf.addPage()
        pdf.setFontSize(12)
        lines.forEach((line: string) => {
          if (y > pageHeight - 40) {
            pdf.addPage()
            y = 40
          }
          pdf.text(line, 20, y)
          y += lineHeight
        })

        // return to first page for consistency
        pdf.setPage(1)
      }

      iframe.remove()
      pdf.save(buildSafeFileName("pdf"))
      setToolMessage("PDF downloaded.")
    } catch (error) {
      console.error("PDF export failed", error)
      setToolMessage("Unable to export PDF.")
    } finally {
      setExporting(null)
    }
  }

  const handleInvite = async () => {
    if (!isOwner) {
      setInviteError("Only the owner can manage collaborators.")
      return
    }
    const email = inviteEmail.trim().toLowerCase()
    const accountId = inviteAccountId.trim()
    if (!email && !accountId) {
      setInviteError("Enter an email or account ID.")
      return
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.")
      return
    }

    setInviteStatus("sending")
    setInviteError(null)
    try {
      const documentId = await ensureDocumentId()
      if (!documentId) {
        setInviteError("Save the document before inviting.")
        setInviteStatus("error")
        return
      }
      const currentDoc = documents.find((doc) => doc.id === documentId)
      const ownerId = currentDoc?.userId ?? user?.id ?? ""

      const accessResponse = await fetch("/api/collaborators/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          accountId: accountId || undefined,
          email: email || undefined,
          permission: invitePermission,
        }),
      })
      const accessData = await accessResponse.json()
      if (!accessResponse.ok) {
        throw new Error(accessData.error || "Unable to update collaborator access.")
      }

      if (email) {
        const shareUrl =
          typeof window !== "undefined"
            ? (() => {
                const url = new URL("/editor", window.location.origin)
                url.searchParams.set("doc", documentId)
                return url.toString()
              })()
            : undefined

        const inviteResponse = await fetch("/api/collaborators/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            accountId: accountId || undefined,
            documentId,
            documentTitle: title || "Research document",
            shareUrl,
            permission: invitePermission,
          }),
        })
        const data = await inviteResponse.json()
        if (!inviteResponse.ok) {
          throw new Error(data.error || data.delivery?.message || "Failed to send invite.")
        }
        setInviteError(data.delivery?.message ?? (data.delivery?.delivered ? null : "Email provider not configured."))
      }

      await fetchCollaborators(documentId, ownerId)
      setInviteEmail("")
      setInviteAccountId("")
      setInviteStatus("success")
      setTimeout(() => setInviteStatus("idle"), 2000)
    } catch (error) {
      console.error("Invite failed", error)
      setInviteStatus("error")
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.")
    }
  }

  const currentDocOwnerId = () =>
    documents.find((doc) => doc.id === currentDocumentId)?.userId ?? user?.id ?? ""

  const handlePermissionChange = async (collabId: string, permission: "view" | "edit") => {
    if (!isOwner) return
    const target = collaborators.find((c) => c.id === collabId)
    if (!target) return
    const documentId = await ensureDocumentId()
    if (!documentId) return

    setCollabBusyId(collabId)
    setCollabError(null)
    try {
      const response = await fetch("/api/collaborators/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          accountId: target.userId,
          email: target.email,
          permission,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Unable to update permission.")
      }
      await fetchCollaborators(documentId, currentDocOwnerId())
    } catch (error) {
      console.error(error)
      setCollabError(error instanceof Error ? error.message : "Unable to update permission.")
    } finally {
      setCollabBusyId(null)
    }
  }

  const handleRevokeCollaborator = async (collabId: string) => {
    if (!isOwner) return
    const target = collaborators.find((c) => c.id === collabId)
    if (!target) return
    const documentId = await ensureDocumentId()
    if (!documentId) return

    setCollabBusyId(collabId)
    setCollabError(null)
    try {
      const response = await fetch("/api/collaborators/access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          accountId: target.userId,
          email: target.email,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Unable to revoke access.")
      }
      await fetchCollaborators(documentId, currentDocOwnerId())
    } catch (error) {
      console.error(error)
      setCollabError(error instanceof Error ? error.message : "Unable to revoke access.")
    } finally {
      setCollabBusyId(null)
    }
  }

  const handleAskAssistant = async () => {
    const question = assistantInput.trim()
    if (!question) return
    setAssistantInput("")
    setAssistantMessages((prev) => [...prev, { role: "user", content: question }])
    setAssistantLoading(true)
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          document: { title, content },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Assistant unavailable.")
      setAssistantMessages((prev) => [...prev, { role: "assistant", content: data.message }])
    } catch (error) {
      console.error("AI assistant error", error)
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach Gemini. Make sure the API key is configured and try again.",
        },
      ])
    } finally {
      setAssistantLoading(false)
    }
  }

  const buildLatexPreview = () => {
    const html = editor?.getHTML() ?? ""
    setLatexContent(convertHtmlToLatex(html))
    setLatexModalOpen(true)
  }

  const handleCopyLatex = async () => {
    if (!latexContent) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(latexContent)
        setLatexCopyStatus("Copied!")
        setTimeout(() => setLatexCopyStatus(null), 2000)
      }
    } catch (error) {
      console.error("Failed to copy LaTeX", error)
      setLatexCopyStatus("Copy failed")
    }
  }

  const handleAddComment = () => {
    if (!commentDraft.trim()) return
    setComments((prev) => [
      { id: crypto.randomUUID(), text: commentDraft.trim(), author: user?.name || "You", createdAt: new Date() },
      ...prev,
    ])
    setCommentDraft("")
  }

  const handleDeleteComment = (id: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id))
  }

  const handleInsertCitation = () => {
    const author = citationFields.author.trim()
    const year = citationFields.year.trim()
    if (!author && !year) {
      setToolMessage("Add an author or year to build the citation.")
      return
    }
    const inline = [author, year].filter(Boolean).join(", ")
    insertHtmlBlock(`<sup>(${escapeHtml(inline)})</sup>&nbsp;`)
    setToolMessage("Inline citation added.")
  }

  const handleReferenceNote = () => {
    const author = citationFields.author.trim() || "Unknown author"
    const title = citationFields.title.trim() || "Working title"
    const year = citationFields.year.trim()
    const link = citationFields.link.trim()
    const safeLink = link ? encodeURI(link) : ""

    const refLink = link
      ? `<p><a href="${safeLink}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a></p>`
      : ""

    insertHtmlBlock(
      `<blockquote><p><strong>${escapeHtml(author)}${year ? ` (${escapeHtml(year)})` : ""}</strong></p><p>${escapeHtml(title)}</p>${refLink}</blockquote>`,
    )
    setToolMessage("Reference note added to the draft.")
  }

  const handleInsertNote = () => {
    if (!scratchNote.trim()) {
      setToolMessage("Add a note before inserting.")
      return
    }
    insertHtmlBlock(
      `<blockquote><p><strong>Research note</strong></p><p>${escapeHtml(scratchNote).replace(/\n/g, "<br />")}</p></blockquote>`,
    )
    setScratchNote("")
    setToolMessage("Note inserted into the document.")
  }

  const handleSaveScratchNote = () => {
    if (!scratchNote.trim()) {
      setToolMessage("Add a note before saving.")
      return
    }
    setScratchNotes((prev) => [{ id: crypto.randomUUID(), text: scratchNote.trim() }, ...prev].slice(0, 20))
    setScratchNote("")
    setToolMessage("Note saved.")
  }

  const handleInsertSavedNote = (id: string) => {
    const note = scratchNotes.find((item) => item.id === id)
    if (!note) return
    insertHtmlBlock(
      `<blockquote><p><strong>Research note</strong></p><p>${escapeHtml(note.text).replace(/\n/g, "<br />")}</p></blockquote>`,
    )
    setToolMessage("Saved note inserted.")
  }

  const handleDeleteScratchNote = (id: string) => {
    setScratchNotes((prev) => prev.filter((item) => item.id !== id))
  }

  const sidebarItems: {
    id: "documents" | "collaborators" | "comments" | "toolkit"
    label: string
    hint: string
    icon: typeof FolderOpen
    colorClass: string
  }[] = [
    { id: "documents", label: "Docs", hint: "Open drafts", icon: FolderOpen, colorClass: "text-primary" },
    { id: "collaborators", label: "Collab", hint: "Manage access", icon: Users, colorClass: "text-secondary" },
    { id: "comments", label: "Notes", hint: "Review thread", icon: MessagesSquare, colorClass: "text-accent" },
    { id: "toolkit", label: "Tools", hint: "Citations", icon: SearchCheck, colorClass: "text-success" },
  ]

  const inTable = Boolean(editor?.isActive("table"))

  return (
    <div className="relative">
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b border-hairline bg-background/70 p-3 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-input bg-background p-1">
              <ToolButton label="Undo" disabled={!canEdit} onClick={() => editor?.chain().focus().undo().run()}>
                <Undo2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Redo" disabled={!canEdit} onClick={() => editor?.chain().focus().redo().run()}>
                <Redo2 className="h-4 w-4" />
              </ToolButton>
              <ToolbarDivider />
              <ToolButton label="Paragraph" disabled={!canEdit} active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()}>
                <Pilcrow className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Heading 1" disabled={!canEdit} active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
                <Heading1 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Heading 2" disabled={!canEdit} active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Heading 3" disabled={!canEdit} active={editor?.isActive("heading", { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
                <Heading3 className="h-4 w-4" />
              </ToolButton>
              <ToolbarDivider />
              <ToolButton label="Bold" disabled={!canEdit} active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}>
                <Bold className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Italic" disabled={!canEdit} active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                <Italic className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Underline" disabled={!canEdit} active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                <Underline className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Strikethrough" disabled={!canEdit} active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}>
                <Strikethrough className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Highlight" disabled={!canEdit} active={editor?.isActive("highlight")} onClick={() => editor?.chain().focus().toggleHighlight().run()}>
                <HighlighterIcon className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Superscript" disabled={!canEdit} active={editor?.isActive("superscript")} onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
                <Superscript className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Subscript" disabled={!canEdit} active={editor?.isActive("subscript")} onClick={() => editor?.chain().focus().toggleSubscript().run()}>
                <Subscript className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Inline code" disabled={!canEdit} active={editor?.isActive("code")} onClick={() => editor?.chain().focus().toggleCode().run()}>
                <Code className="h-4 w-4" />
              </ToolButton>
              <ToolbarDivider />
              <ToolButton label="Align left" disabled={!canEdit} active={editor?.isActive({ textAlign: "left" })} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
                <AlignLeft className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Align center" disabled={!canEdit} active={editor?.isActive({ textAlign: "center" })} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
                <AlignCenter className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Align right" disabled={!canEdit} active={editor?.isActive({ textAlign: "right" })} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
                <AlignRight className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Justify" disabled={!canEdit} active={editor?.isActive({ textAlign: "justify" })} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
                <AlignJustify className="h-4 w-4" />
              </ToolButton>
              <ToolbarDivider />
              <ToolButton label="Bulleted list" disabled={!canEdit} active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <List className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Numbered list" disabled={!canEdit} active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                <ListOrdered className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Blockquote" disabled={!canEdit} active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
                <Quote className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Code block" disabled={!canEdit} active={editor?.isActive("codeBlock")} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>
                <Code2 className="h-4 w-4" />
              </ToolButton>
              <ToolbarDivider />
              <ToolButton label="Insert link" disabled={!canEdit} active={editor?.isActive("link")} onClick={handleSetLink}>
                <LinkIcon className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Insert image" disabled={!canEdit} onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Insert table" disabled={!canEdit} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <Table2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Two columns" disabled={!canEdit} onClick={() => editor?.chain().focus().setColumns(2).run()}>
                <Columns2 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Three columns" disabled={!canEdit} onClick={() => editor?.chain().focus().setColumns(3).run()}>
                <Columns3 className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Horizontal rule" disabled={!canEdit} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
                <Minus className="h-4 w-4" />
              </ToolButton>
              <ToolButton label="Clear formatting" disabled={!canEdit} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}>
                <Eraser className="h-4 w-4" />
              </ToolButton>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Input
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="ml-2 h-9 w-56"
              placeholder="Document title"
              disabled={!canEdit}
            />
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-hairline px-2 py-1 text-xs">
                {docPermission === "owner"
                  ? "Owner"
                  : docPermission === "edit"
                  ? "Edit access"
                  : "View only"}
              </span>
              {statusMessage}
              {lastSaved && (
                <span className="text-xs text-muted-foreground/80">
                  Last saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => persistDocument(content, title)} disabled={isSaving || !canEdit}>
                <Save className="mr-2 h-4 w-4" /> Save now
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadDoc} disabled={exporting === "doc"}>
                {exporting === "doc" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Word
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={exporting === "pdf"}>
                {exporting === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={handleShare} disabled={shareInProgress}>
                {shareInProgress ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                {shareInProgress ? "Sharing..." : "Share"}
              </Button>
              <Button size="sm" variant="outline" onClick={buildLatexPreview}>
                <Code2 className="mr-2 h-4 w-4" /> View LaTeX
              </Button>
            </div>
            {shareFeedback && <span className="text-xs text-primary">{shareFeedback}</span>}
          </div>
        </div>

        {/* Contextual table controls */}
        {inTable && canEdit && (
          <div className="flex flex-wrap items-center gap-1 border-b border-hairline bg-background/60 px-3 py-1.5 text-xs backdrop-blur-sm">
            <span className="mr-1 text-muted-foreground">Table:</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor?.chain().focus().addColumnAfter().run()}>Add col</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor?.chain().focus().deleteColumn().run()}>Del col</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor?.chain().focus().addRowAfter().run()}>Add row</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor?.chain().focus().deleteRow().run()}>Del row</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor?.chain().focus().toggleHeaderRow().run()}>
              <Rows3 className="mr-1 h-3.5 w-3.5" /> Header
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-error" onClick={() => editor?.chain().focus().deleteTable().run()}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete table
            </Button>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="hidden border-r border-hairline bg-background/65 px-3 py-4 backdrop-blur-sm lg:flex lg:w-24 lg:flex-col lg:items-center lg:gap-3">
            <div className="text-center text-xs font-medium text-muted-foreground">
              <p>Open</p>
              <p>Panels</p>
            </div>
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSidebarPanel === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSidebarPanel((current) => (current === item.id ? null : item.id))}
                  className={[
                    "flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all",
                    isActive
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-hairline bg-background/40 text-muted-foreground hover:border-white/20 hover:text-foreground",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-10 w-10 items-center justify-center rounded-xl border bg-background/40",
                      isActive ? "border-primary/30 text-primary" : "border-hairline",
                      item.colorClass,
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.hint}</p>
                  </div>
                </button>
              )
            })}
            <div className="rounded-2xl border border-hairline bg-background/40 px-3 py-4 text-center text-[11px] text-muted-foreground">
              Click an icon to reveal workspace utilities.
            </div>
          </div>

          {activeSidebarPanel && (
            <div className="hidden border-r border-hairline bg-background/72 p-4 backdrop-blur-sm lg:block lg:w-[23rem] lg:overflow-y-auto">
              {activeSidebarPanel === "documents" && (
                <Card className="border-hairline bg-transparent">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-primary" /> Your Documents
                    </CardTitle>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createNewDocument}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${
                          doc.id === currentDocumentId
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-hairline bg-background/35 hover:border-white/30"
                        }`}
                        onClick={() => loadDocument(doc)}
                      >
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(doc.updatedAt).toLocaleDateString()}
                          {doc.permission && doc.permission !== "owner" && (
                            <span className="ml-2 rounded bg-muted px-2 py-[2px] text-[10px] uppercase tracking-wide">
                              {doc.permission}
                            </span>
                          )}
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}

              {activeSidebarPanel === "collaborators" && (
                <Card className="border-hairline bg-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary" /> Collaborators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isOwner && (
                      <div className="space-y-2 rounded-xl border border-hairline p-3">
                        <p className="text-xs text-muted-foreground">Share access via account ID (preferred) or email.</p>
                        <Input
                          placeholder="Account ID from profile"
                          value={inviteAccountId}
                          onChange={(event) => setInviteAccountId(event.target.value)}
                          className="h-9"
                        />
                        <Input
                          type="email"
                          placeholder="email@lab.edu (optional)"
                          value={inviteEmail}
                          onChange={(event) => setInviteEmail(event.target.value)}
                          className="h-9"
                        />
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Permission</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={invitePermission === "view" ? "secondary" : "outline"}
                              onClick={() => setInvitePermission("view")}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant={invitePermission === "edit" ? "secondary" : "outline"}
                              onClick={() => setInvitePermission("edit")}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                        {inviteError && <p className="text-xs text-error">{inviteError}</p>}
                        <Button size="sm" className="w-full" onClick={handleInvite} disabled={inviteStatus === "sending"}>
                          {inviteStatus === "sending" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending
                            </>
                          ) : inviteStatus === "success" ? (
                            "Sent"
                          ) : (
                            "Send"
                          )}
                        </Button>
                      </div>
                    )}

                    {collabError && <p className="text-xs text-error">{collabError}</p>}

                    {collaborators.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">No collaborators yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {collaborators.map((collaborator) => (
                          <div
                            key={collaborator.id}
                            className="rounded-xl border border-hairline p-3 text-sm flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">{collaborator.name || collaborator.email || "Collaborator"}</p>
                                <p className="text-xs text-muted-foreground">{collaborator.email ?? "Account access"}</p>
                              </div>
                              {isOwner && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-xs text-error"
                                  onClick={() => handleRevokeCollaborator(collaborator.id)}
                                  disabled={collabBusyId === collaborator.id}
                                >
                                  Revoke
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Permission</p>
                              {isOwner ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={collaborator.permission === "view" ? "secondary" : "outline"}
                                    className="h-8 px-3 text-xs"
                                    onClick={() => handlePermissionChange(collaborator.id, "view")}
                                    disabled={collabBusyId === collaborator.id}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={collaborator.permission === "edit" ? "secondary" : "outline"}
                                    className="h-8 px-3 text-xs"
                                    onClick={() => handlePermissionChange(collaborator.id, "edit")}
                                    disabled={collabBusyId === collaborator.id}
                                  >
                                    Edit
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground uppercase">{collaborator.permission}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeSidebarPanel === "comments" && (
                <Card className="border-hairline bg-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessagesSquare className="h-4 w-4 text-accent" /> Comments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment for collaborators..."
                          value={commentDraft}
                          onChange={(event) => setCommentDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              handleAddComment()
                            }
                          }}
                        />
                        <Button variant="secondary" onClick={handleAddComment}>
                          Post
                        </Button>
                      </div>
                      {comments.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">No comments yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {comments.map((comment) => (
                            <div key={comment.id} className="rounded-xl border border-hairline p-3 text-sm">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold">{comment.author}</p>
                                <button
                                  className="text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => handleDeleteComment(comment.id)}
                                >
                                  Delete
                                </button>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap">{comment.text}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {comment.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSidebarPanel === "toolkit" && (
                <Card className="border-hairline bg-transparent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Beaker className="h-4 w-4 text-success" /> Research Toolkit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-hairline p-3 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" /> Citation helper
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          placeholder="Author(s)"
                          value={citationFields.author}
                          onChange={(event) => setCitationFields((prev) => ({ ...prev, author: event.target.value }))}
                          className="h-9"
                        />
                        <Input
                          placeholder="Year"
                          value={citationFields.year}
                          onChange={(event) => setCitationFields((prev) => ({ ...prev, year: event.target.value }))}
                          className="h-9"
                        />
                      </div>
                      <Input
                        placeholder="Title of work"
                        value={citationFields.title}
                        onChange={(event) => setCitationFields((prev) => ({ ...prev, title: event.target.value }))}
                        className="h-9"
                      />
                      <Input
                        placeholder="Link or DOI (optional)"
                        value={citationFields.link}
                        onChange={(event) => setCitationFields((prev) => ({ ...prev, link: event.target.value }))}
                        className="h-9"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={handleInsertCitation} disabled={!canEdit}>
                          <Sparkles className="mr-2 h-4 w-4" /> Inline cite
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleReferenceNote} disabled={!canEdit}>
                          <BookOpen className="mr-2 h-4 w-4" /> Add reference note
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-background/70 px-6 py-6 lg:px-8">
            <div className="mx-auto max-w-4xl glass rounded-3xl border border-hairline p-6 min-h-full">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-hairline pb-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Focused Writing Workspace</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight">{title || "Untitled Document"}</h1>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Documents, collaborators, comments, and citation tools are tucked behind the left icon rail so the draft stays central.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full border border-hairline px-3 py-1 text-xs uppercase tracking-wide">
                      {docPermission === "owner"
                        ? "Owner"
                        : docPermission === "edit"
                        ? "Edit access"
                        : "View only"}
                    </span>
                    {statusMessage && <span>{statusMessage}</span>}
                    {lastSaved && (
                      <span className="text-xs text-muted-foreground/80">
                        Last saved {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {shareFeedback && <span className="text-xs text-primary">{shareFeedback}</span>}
                </div>
              </div>
              {remoteUpdateAvailable && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  <span className="text-warning">
                    A collaborator saved newer changes. Loading now would replace your unsaved edits.
                  </span>
                  <Button size="sm" variant="outline" onClick={loadRemoteUpdate}>
                    Load latest
                  </Button>
                </div>
              )}
              <div className={!canEdit ? "opacity-80" : undefined}>
                <EditorContent editor={editor} />
              </div>
              {(isLoading || !editor) && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading document...
                </div>
              )}
            </div>
          </div>

          {rightDockOpen && (
            <div className="w-full border-l border-hairline bg-background/72 p-4 backdrop-blur-sm lg:w-[28rem] lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workspace</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setRightDockOpen(false)}
                  title="Hide panel"
                  aria-label="Hide workspace panel"
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
              <Card className="border-hairline bg-transparent">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <NotebookPen className="h-4 w-4 text-primary" /> Scratchpad
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setScratchpadCollapsed((value) => !value)}
                  >
                    {scratchpadCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle scratchpad</span>
                  </Button>
                </CardHeader>
                {!scratchpadCollapsed && (
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">Capture ideas, TODOs, and snippets without leaving the draft.</p>
                    <textarea
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      rows={4}
                      placeholder="Drop interview quotes, TODOs, or a rough idea."
                      value={scratchNote}
                      onChange={(event) => setScratchNote(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={handleInsertNote} disabled={!canEdit}>
                        <Highlighter className="mr-2 h-4 w-4" /> Insert note
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleSaveScratchNote} disabled={!canEdit}>
                        <NotebookPen className="mr-2 h-4 w-4" /> Save note
                      </Button>
                    </div>
                    {scratchNotes.length > 0 && (
                      <div className="space-y-2">
                        {scratchNotes.map((note) => (
                          <div key={note.id} className="rounded-xl border border-hairline bg-muted/40 p-3 text-sm">
                            <p className="whitespace-pre-wrap">{note.text}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs"
                                variant="ghost"
                                onClick={() => handleInsertSavedNote(note.id)}
                                disabled={!canEdit}
                              >
                                Insert
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs"
                                variant="ghost"
                                onClick={() => handleDeleteScratchNote(note.id)}
                                disabled={!canEdit}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {toolMessage && <p className="text-xs text-primary">{toolMessage}</p>}
                  </CardContent>
                )}
              </Card>

              <Card className="border-hairline bg-transparent flex flex-col min-h-[24rem]">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setAssistantCollapsed((value) => !value)}
                  >
                    {assistantCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="sr-only">Toggle AI assistant</span>
                  </Button>
                </CardHeader>
                {!assistantCollapsed && (
                  <CardContent className="flex flex-1 flex-col gap-3 min-h-0">
                    <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-xl border border-hairline p-3">
                      {assistantMessages.map((message, index) => (
                        <div
                          key={index}
                          className={`rounded-xl p-3 text-sm ${
                            message.role === "assistant" ? "bg-primary/10" : "bg-muted/30"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {message.role === "assistant" ? "AI" : "You"}
                          </p>
                          <div className="space-y-2">{renderAssistantContent(message.content)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask for feedback..."
                        value={assistantInput}
                        onChange={(event) => setAssistantInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleAskAssistant()
                          }
                        }}
                      />
                      <Button onClick={handleAskAssistant} disabled={assistantLoading}>
                        {assistantLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating toggle to reopen the workspace dock */}
      {!rightDockOpen && (
        <Button
          type="button"
          onClick={() => setRightDockOpen(true)}
          className="fixed bottom-6 right-6 z-40 shadow-lg"
          size="sm"
        >
          <PanelRightOpen className="mr-2 h-4 w-4" /> Workspace
        </Button>
      )}

      {latexModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="absolute inset-0" onClick={() => setLatexModalOpen(false)} />
          <Card className="relative z-10 w-full max-w-3xl border-white/20 bg-background">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>LaTeX Preview</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setLatexModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                readOnly
                value={latexContent}
                className="h-64 w-full rounded-md border border-white/20 bg-black/40 p-3 font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleCopyLatex}>
                  <Copy className="mr-2 h-4 w-4" /> Copy LaTeX
                </Button>
                {latexCopyStatus && <p className="text-xs text-muted-foreground">{latexCopyStatus}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function renderAssistantContent(content: string) {
  const blocks = content.split(/\n\n+/).map((block) => block.trim()).filter(Boolean)
  if (blocks.length === 0) {
    return [<p key="empty">{content}</p>]
  }

  return blocks.map((block, index) => {
    const lines = block.split("\n")
    const isList = lines.every((line) => /^[-•]\s+/.test(line.trim()))

    if (isList) {
      return (
        <ul key={index} className="list-disc pl-5 space-y-1">
          {lines.map((line, idx) => (
            <li key={idx}>{line.replace(/^[-•]\s+/, "")}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={index} className="leading-relaxed">
        {block.split("\n").map((line, idx) => (
          <span key={idx}>
            {line}
            {idx < block.split("\n").length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  })
}

function convertHtmlToLatex(html: string) {
  if (typeof window === "undefined") return ""
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, "text/html")
  if (!doc.body) return ""
  return Array.from(doc.body.childNodes)
    .map((node) => serializeNode(node))
    .join("\n")
    .trim()
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeLatex(node.textContent ?? "")
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ""
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  const children = Array.from(element.childNodes).map((child) => serializeNode(child)).join("")

  switch (tag) {
    case "strong":
    case "b":
      return `\\textbf{${children}}`
    case "em":
    case "i":
      return `\\textit{${children}}`
    case "u":
      return `\\underline{${children}}`
    case "h1":
      return `\\section{${children.trim()}}`
    case "h2":
      return `\\subsection{${children.trim()}}`
    case "h3":
      return `\\subsubsection{${children.trim()}}`
    case "p":
      return `${children}\n`
    case "br":
      return "\\newline "
    case "blockquote":
      return `\\begin{quote}${children}\\end{quote}`
    case "ul":
      return convertList(element, "itemize")
    case "ol":
      return convertList(element, "enumerate")
    case "li":
      return `\\item ${children.trim()}`
    case "img": {
      const src = element.getAttribute("src") ?? ""
      const alt = escapeLatex(element.getAttribute("alt") ?? "figure")
      return `\\begin{figure}[h]\\centering\\includegraphics[width=0.8\\linewidth]{${src}}\\caption{${alt}}\\end{figure}\n`
    }
    default:
      return children
  }
}

function convertList(element: Element, environment: "itemize" | "enumerate") {
  const items = Array.from(element.children)
    .map((child) => serializeNode(child))
    .join("\n")
  return `\\begin{${environment}}\n${items}\n\\end{${environment}}\n`
}

function escapeLatex(text: string) {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([#$%&_{}])/g, "\\$1")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/~/g, "\\textasciitilde{}")
}
