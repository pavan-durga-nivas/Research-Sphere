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
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { StoredDocument } from "@/types"

const getInitialsFromEmail = (email: string) => {
  const local = email.split("@")[0] ?? ""
  if (!local) return "??"
  const parts = local
    .split(/[.\-_]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return local.slice(0, 2).toUpperCase()
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface AssistantMessage {
  role: "user" | "assistant"
  content: string
}

export default function EditorPage() {
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null)
  const [title, setTitle] = useState("Untitled Document")
  const [content, setContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(true)
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
  const [collaborators, setCollaborators] = useState([
    { id: "jd", initials: "JD", name: "Jordan Diaz", email: "jordan@lab.edu" },
    { id: "as", initials: "AS", name: "Anita Shah", email: "anita@lab.edu" },
    { id: "ml", initials: "ML", name: "Marcus Lee", email: "marcus@lab.edu" },
  ])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [shareInProgress, setShareInProgress] = useState(false)
  const [latexModalOpen, setLatexModalOpen] = useState(false)
  const [latexContent, setLatexContent] = useState("")
  const [latexCopyStatus, setLatexCopyStatus] = useState<string | null>(null)

  const loadDocument = useCallback((doc: StoredDocument) => {
    setCurrentDocumentId(doc.id)
    setTitle(doc.title)
    setContent(doc.content)
    if (editorRef.current) {
      editorRef.current.innerHTML = doc.content
    }
    setLastSaved(new Date(doc.updatedAt))
  }, [])

  const createNewDocument = useCallback(async () => {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document", content: "" }),
    })
    const data = await response.json()
    const newDoc = data.document as StoredDocument
    setDocuments((prev) => [newDoc, ...prev])
    loadDocument(newDoc)
  }, [loadDocument])

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/documents", { cache: "no-store" })
        const data = await response.json()
        const docs = (data.documents as StoredDocument[]) || []
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

  const persistDocument = useCallback(async (docContent: string, docTitle: string) => {
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
      const updatedDoc = data.document as StoredDocument
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
  }, [currentDocumentId])

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
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML
      setContent(newContent)
      scheduleSave(newContent, title)
    }
  }

  const handleToolbarAction = (command: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    if (typeof document === "undefined") return

    if (command === "insertImage") {
      imageInputRef.current?.click()
      return
    }

    document.execCommand(command, false)
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
    const email = inviteEmail.trim()
    if (!email) {
      setInviteError("Enter an email to invite.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Enter a valid email address.")
      return
    }
    if (collaborators.some((collab) => collab.email === email)) {
      setInviteError("This collaborator is already invited.")
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
      const shareUrl =
        typeof window !== "undefined"
          ? (() => {
              const url = new URL("/editor", window.location.origin)
              url.searchParams.set("doc", documentId)
              return url.toString()
            })()
          : undefined

      const response = await fetch("/api/collaborators/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          documentId,
          documentTitle: title || "Research document",
          shareUrl,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.delivery?.message || "Failed to send invite.")
      }

      setCollaborators((prev) => [
        ...prev,
        {
          id: data.invite?.id ?? email,
          initials: getInitialsFromEmail(email),
          name: email.split("@")[0]?.replace(/[._]/g, " "),
          email,
        },
      ])
      setInviteEmail("")
      setInviteStatus("success")
      setInviteError(data.delivery?.message ?? (data.delivery?.delivered ? null : "Email provider not configured."))
      setTimeout(() => setInviteStatus("idle"), 2000)
    } catch (error) {
      console.error("Invite failed", error)
      setInviteStatus("error")
      setInviteError(error instanceof Error ? error.message : "Unable to send invite.")
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

  const toolbarActions: { icon: LucideIcon; command: string; label: string }[] = [
    { icon: Bold, command: "bold", label: "Bold" },
    { icon: Italic, command: "italic", label: "Italic" },
    { icon: Underline, command: "underline", label: "Underline" },
    { icon: AlignLeft, command: "justifyLeft", label: "Align left" },
    { icon: AlignCenter, command: "justifyCenter", label: "Align center" },
    { icon: AlignRight, command: "justifyRight", label: "Align right" },
    { icon: List, command: "insertUnorderedList", label: "Bulleted list" },
    { icon: ImageIcon, command: "insertImage", label: "Insert image" },
  ]

  const visibleCollaborators = collaborators.slice(0, 3)
  const remainingCollaborators = Math.max(0, collaborators.length - visibleCollaborators.length)

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
                >
                  <action.icon className="h-4 w-4" />
                </Button>
              ))}
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
            />
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              {statusMessage}
              {lastSaved && (
                <span className="text-xs text-muted-foreground/80">
                  Last saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => persistDocument(content, title)} disabled={isSaving}>
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
                className="rich-editor min-h-[70vh] text-base leading-relaxed focus:outline-none text-white"
                contentEditable
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
                <div className="flex items-center gap-2">
                  <div className="inline-flex -space-x-2">
                    {visibleCollaborators.map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-primary/20 text-xs font-semibold"
                        title={`${collaborator.name} · ${collaborator.email}`}
                      >
                        {collaborator.initials}
                      </div>
                    ))}
                  </div>
                  {remainingCollaborators > 0 && (
                    <span className="text-xs text-muted-foreground">+{remainingCollaborators} more</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setInviteOpen((prev) => !prev)}
                  >
                    {inviteOpen ? "Close" : "Invite"}
                  </Button>
                </div>

                {inviteOpen && (
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="colleague@lab.edu"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      className="h-9"
                    />
                    {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleInvite}
                      disabled={inviteStatus === "sending"}
                    >
                      {inviteStatus === "sending" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending
                        </>
                      ) : inviteStatus === "success" ? (
                        "Invitation sent!"
                      ) : (
                        "Send invite"
                      )}
                    </Button>
                  </div>
                )}
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
                      <p className="whitespace-pre-wrap">{message.content}</p>
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
                <div className="text-sm text-muted-foreground text-center py-8">No comments yet.</div>
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
