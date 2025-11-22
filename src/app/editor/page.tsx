"use client"

import type { ChangeEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Image as ImageIcon,
  MessageSquare,
  Users,
  Sparkles,
  Save,
  Share2,
  Loader2,
  Plus,
  FileText,
  Code2,
  Copy,
  X,
  Beaker,
  BookOpen,
  Highlighter,
  Link2,
  NotebookPen,
  Superscript,
  Subscript,
  Highlighter as HighlighterIcon,
  Undo2,
  Redo2,
  Eraser,
  Table2,
} from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import type { LucideIcon } from "lucide-react"
import type { StoredDocument } from "@/types"

interface AssistantMessage {
  role: "user" | "assistant"
  content: string
}

export default function EditorPage() {
  const editorRef = useRef<HTMLDivElement>(null)
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
  const { user } = useAuth()

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
      if (editorRef.current) {
        editorRef.current.innerHTML = doc.content
      }
      setLastSaved(new Date(doc.updatedAt))
      fetchCollaborators(doc.id, doc.userId)
    },
    [fetchCollaborators, user?.id],
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

  const scheduleSave = (docContent: string, docTitle: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      persistDocument(docContent, docTitle)
    }, 1000)
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    scheduleSave(content, value)
  }

  const handleEditorInput = () => {
    if (!canEdit) return
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setContent(newContent)
      scheduleSave(newContent, title)
    }
  }

  const handleToolbarAction = (command: string) => {
    if (!canEdit) return
    if (!editorRef.current || typeof document === "undefined") return
    editorRef.current.focus()

    switch (command) {
      case "insertImage":
        imageInputRef.current?.click()
        return
      case "format-h2":
        document.execCommand("formatBlock", false, "h2")
        break
      case "format-h3":
        document.execCommand("formatBlock", false, "h3")
        break
      case "superscript":
        document.execCommand("superscript", false)
        break
      case "subscript":
        document.execCommand("subscript", false)
        break
      case "highlight":
        document.execCommand("hiliteColor", false, "#fff3b0")
        break
      case "removeFormat":
        document.execCommand("removeFormat", false)
        break
      case "insertTable":
        insertHtmlBlock(
          `<table class="my-4 w-full border border-border text-sm">
            <thead>
              <tr class="bg-muted/60">
                <th class="border border-border px-2 py-1">Metric</th>
                <th class="border border-border px-2 py-1">Group A</th>
                <th class="border border-border px-2 py-1">Group B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-border px-2 py-1">Mean</td>
                <td class="border border-border px-2 py-1"></td>
                <td class="border border-border px-2 py-1"></td>
              </tr>
              <tr>
                <td class="border border-border px-2 py-1">Std. dev</td>
                <td class="border border-border px-2 py-1"></td>
                <td class="border border-border px-2 py-1"></td>
              </tr>
            </tbody>
          </table>`,
        )
        handleEditorInput()
        return
      default:
        document.execCommand(command, false)
    }

    handleEditorInput()
  }

  const insertHtmlBlock = (html: string) => {
    if (!canEdit) return
    if (!editorRef.current || typeof document === "undefined") return
    editorRef.current.focus()
    document.execCommand("insertHTML", false, html)
    handleEditorInput()
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result
      if (typeof result === "string" && typeof document !== "undefined") {
        if (!editorRef.current) return
        editorRef.current.focus()
        const figure = `<figure class="my-4"><img src="${result}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:0.5rem;" /></figure>`
        document.execCommand("insertHTML", false, figure)
        handleEditorInput()
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
    const html = editorRef.current?.innerHTML ?? ""
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
    insertHtmlBlock(`<sup class="text-sm text-muted-foreground">(${escapeHtml(inline)})</sup>`)
    setToolMessage("Inline citation added.")
  }

  const handleReferenceNote = () => {
    const author = citationFields.author.trim() || "Unknown author"
    const title = citationFields.title.trim() || "Working title"
    const year = citationFields.year.trim()
    const link = citationFields.link.trim()
    const safeLink = link ? encodeURI(link) : ""

    const refLink = link
      ? `<a class="text-primary underline break-all" href="${safeLink}" target="_blank" rel="noreferrer">${escapeHtml(link)}</a>`
      : ""

    insertHtmlBlock(
      `<div class="my-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-sm leading-relaxed">
        <p class="font-semibold text-primary">${escapeHtml(author)}${year ? ` (${escapeHtml(year)})` : ""}</p>
        <p class="text-foreground">${escapeHtml(title)}</p>
        ${refLink}
      </div>`,
    )
    setToolMessage("Reference note added to the draft.")
  }

  const handleInsertNote = () => {
    if (!scratchNote.trim()) {
      setToolMessage("Add a note before inserting.")
      return
    }
    insertHtmlBlock(
      `<aside class="my-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p class="mb-1 font-semibold text-primary">Research note</p>
        <p>${escapeHtml(scratchNote).replace(/\n/g, "<br />")}</p>
      </aside>`,
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
      `<aside class="my-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <p class="mb-1 font-semibold text-primary">Research note</p>
        <p>${escapeHtml(note.text).replace(/\n/g, "<br />")}</p>
      </aside>`,
    )
    setToolMessage("Saved note inserted.")
  }

  const handleDeleteScratchNote = (id: string) => {
    setScratchNotes((prev) => prev.filter((item) => item.id !== id))
  }

  const toolbarActions: { icon: LucideIcon; command: string; label: string }[] = [
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { icon: Underline, command: "underline", label: "Underline" },
    { icon: HighlighterIcon, command: "highlight", label: "Highlight" },
    { icon: Superscript, command: "superscript", label: "Superscript" },
    { icon: Subscript, command: "subscript", label: "Subscript" },
    { icon: AlignLeft, command: "justifyLeft", label: "Align left" },
    { icon: AlignCenter, command: "justifyCenter", label: "Align center" },
    { icon: AlignRight, command: "justifyRight", label: "Align right" },
    { icon: List, command: "insertUnorderedList", label: "Bulleted list" },
    { icon: ImageIcon, command: "insertImage", label: "Insert image" },
    { icon: Table2, command: "insertTable", label: "Insert table" },
    { icon: Undo2, command: "undo", label: "Undo" },
    { icon: Redo2, command: "redo", label: "Redo" },
    { icon: Eraser, command: "removeFormat", label: "Clear formatting" },
  ]

  return (
    <div className="relative">
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b border-white/10 bg-background/70 p-3 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-input bg-background p-1">
              {toolbarActions.map((action) => (
                <Button
                  key={action.command}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToolbarAction(action.command)}
                  title={action.label}
                  aria-label={action.label}
                  disabled={!canEdit}
                >
                  <action.icon className="h-4 w-4" />
                </Button>
              ))}
            </div>
            <div className="flex items-center rounded-md border border-input bg-background p-1">
              <Button
                size="sm"
                variant="ghost"
                className="px-3 text-xs"
                onClick={() => handleToolbarAction("format-h2")}
                disabled={!canEdit}
              >
                H2
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="px-3 text-xs"
                onClick={() => handleToolbarAction("format-h3")}
                disabled={!canEdit}
              >
                H3
              </Button>
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
              className="ml-4 h-9 w-64"
              placeholder="Document title"
              disabled={!canEdit}
            />
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-white/10 px-2 py-1 text-xs">
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

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-background/70 px-8 py-6">
            <div className="glass rounded-2xl border border-white/10 p-6 min-h-full">
              <div
                ref={editorRef}
                className={`rich-editor min-h-[70vh] text-base leading-relaxed focus:outline-none text-white ${
                  !canEdit ? "pointer-events-none opacity-80" : ""
                }`}
                contentEditable={canEdit}
                aria-readonly={!canEdit}
                onInput={handleEditorInput}
                suppressContentEditableWarning
              />
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading document...
                </div>
              )}
            </div>
          </div>

          <div className="w-full border-l border-white/10 bg-background/70 backdrop-blur-sm p-4 space-y-4 lg:w-96 lg:space-y-0 lg:flex lg:flex-col lg:gap-4 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <Card className="bg-transparent border-white/10 lg:shrink-0">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Your Documents
                </CardTitle>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={createNewDocument}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                      doc.id === currentDocumentId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-white/10 hover:border-white/30"
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

            <Card className="bg-transparent border-white/10 lg:shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" /> Collaborators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isOwner && (
                  <div className="space-y-2 rounded-md border border-white/10 p-3">
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
                    {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
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

                {collabError && <p className="text-xs text-red-400">{collabError}</p>}

                {collaborators.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">No collaborators yet.</p>
                ) : (
                  <div className="space-y-2">
                    {collaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="rounded-md border border-white/10 p-3 text-sm flex flex-col gap-2"
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
                              className="h-8 px-2 text-xs text-red-300"
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
                            <span className="text-xs text-muted-foreground uppercase">
                              {collaborator.permission}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-transparent border-white/10">
              <CardHeader className="pb-2 flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Beaker className="h-4 w-4" /> Research Toolkit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-white/10 p-3 space-y-2">
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

                <div className="rounded-md border border-white/10 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <NotebookPen className="h-4 w-4 text-primary" /> Scratchpad
                  </p>
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      rows={3}
                      placeholder="Drop interview quotes, TODOs, or a rough idea."
                      value={scratchNote}
                      onChange={(event) => setScratchNote(event.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Save notes for later or drop them into the draft.</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleInsertNote} disabled={!canEdit}>
                          <Highlighter className="mr-2 h-4 w-4" /> Insert note
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleSaveScratchNote} disabled={!canEdit}>
                          <NotebookPen className="mr-2 h-4 w-4" /> Save note
                        </Button>
                      </div>
                    </div>
                  </div>

                  {scratchNotes.length > 0 && (
                    <div className="space-y-2">
                      {scratchNotes.map((note) => (
                        <div key={note.id} className="rounded-md border border-white/10 p-2 text-sm bg-muted/40">
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
                </div>
              </CardContent>
            </Card>

            <Card className="bg-transparent border-white/10 flex flex-col min-h-[20rem] lg:flex-1 max-h-[36rem]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-lg border border-white/10 p-3">
                  {assistantMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-3 text-sm ${
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
            </Card>

            <Card className="bg-transparent border-white/10 lg:shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comments
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
                        <div key={comment.id} className="rounded-md border border-white/10 p-3 text-sm">
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
          </div>
        </div>
      </div>
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
