import { randomUUID } from "node:crypto"
import { CollaboratorAccess, CollaboratorInvite, DocumentPermission, SavedPaper, StoredDocument } from "@/types"
import { readStore, writeStore } from "@/lib/data-store"

export async function getDocumentById(documentId: string) {
  const store = await readStore("appData")
  return store.documents.find((doc) => doc.id === documentId) ?? null
}

export async function getAccessibleDocuments(userId: string, email: string) {
  const store = await readStore("appData")
  const owned = store.documents.map((doc) => ({
    ...doc,
    permission: "owner" as DocumentPermission,
  }))

  const collabEntries = store.collaboratorAccess.filter(
    (access) => (access.userId && access.userId === userId) || (access.email && access.email === email),
  )

  const collabDocuments = collabEntries
    .map((entry) => {
      const doc = store.documents.find((d) => d.id === entry.documentId)
      if (!doc) return null
      return {
        ...doc,
        permission: entry.permission as DocumentPermission,
      }
    })
    .filter((item): item is StoredDocument & { permission: DocumentPermission } => Boolean(item))

  const mergedMap = new Map<string, StoredDocument & { permission: DocumentPermission }>()
  for (const doc of [...owned, ...collabDocuments]) {
    mergedMap.set(doc.id, doc)
  }

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export async function upsertDocument(userId: string, payload: { id?: string; title: string; content: string }) {
  const store = await readStore("appData")
  const now = new Date().toISOString()

  if (payload.id) {
    const index = store.documents.findIndex((doc) => doc.id === payload.id)
    if (index >= 0) {
      store.documents[index] = {
        ...store.documents[index],
        title: payload.title,
        content: payload.content,
        updatedAt: now,
      }
      await writeStore("appData", store)
      return store.documents[index]
    }
  }

  const newDocument: StoredDocument = {
    id: randomUUID(),
    userId,
    title: payload.title || "Untitled Document",
    content: payload.content,
    createdAt: now,
    updatedAt: now,
  }

  store.documents.push(newDocument)
  await writeStore("appData", store)
  return newDocument
}

export async function deleteDocument(userId: string, documentId: string) {
  const store = await readStore("appData")
  const before = store.documents.length
  store.documents = store.documents.filter((doc) => !(doc.id === documentId && doc.userId === userId))
  const removed = before !== store.documents.length
  if (removed) {
    await writeStore("appData", store)
  }
  return removed
}

export async function setCollaboratorAccess(params: {
  documentId: string
  userId?: string
  email?: string
  permission: CollaboratorAccess["permission"]
}) {
  const store = await readStore("appData")
  const now = new Date().toISOString()
  const normalizedEmail = params.email?.trim().toLowerCase()

  const existingIndex = store.collaboratorAccess.findIndex(
    (entry) =>
      entry.documentId === params.documentId &&
      ((params.userId && entry.userId === params.userId) || (normalizedEmail && entry.email === normalizedEmail)),
  )

  if (existingIndex >= 0) {
    store.collaboratorAccess[existingIndex] = {
      ...store.collaboratorAccess[existingIndex],
      permission: params.permission,
      email: normalizedEmail ?? store.collaboratorAccess[existingIndex].email,
      userId: params.userId ?? store.collaboratorAccess[existingIndex].userId,
    }
  } else {
    store.collaboratorAccess.push({
      id: randomUUID(),
      documentId: params.documentId,
      userId: params.userId,
      email: normalizedEmail,
      permission: params.permission,
      addedAt: now,
    })
  }

  await writeStore("appData", store)
}

export async function removeCollaboratorAccess(params: { documentId: string; userId?: string; email?: string }) {
  const store = await readStore("appData")
  const normalizedEmail = params.email?.trim().toLowerCase()
  const before = store.collaboratorAccess.length
  store.collaboratorAccess = store.collaboratorAccess.filter((entry) => {
    if (entry.documentId !== params.documentId) return true
    if (params.userId && entry.userId === params.userId) return false
    if (normalizedEmail && entry.email === normalizedEmail) return false
    return true
  })
  const removed = before !== store.collaboratorAccess.length
  if (removed) {
    await writeStore("appData", store)
  }
  return removed
}

export async function listCollaboratorAccess(documentId: string) {
  const store = await readStore("appData")
  return store.collaboratorAccess.filter((entry) => entry.documentId === documentId)
}

export async function getUserDocumentPermission(userId: string, email: string, documentId: string): Promise<DocumentPermission | null> {
  const store = await readStore("appData")
  const document = store.documents.find((doc) => doc.id === documentId)
  if (!document) return null
  if (document.userId === userId) return "owner"

  const match = store.collaboratorAccess.find(
    (entry) =>
      entry.documentId === documentId &&
      ((entry.userId && entry.userId === userId) || (entry.email && entry.email === email)),
  )
  if (!match) return null
  return match.permission
}

export async function getSavedPapers(userId: string) {
  const store = await readStore("appData")
  return store.savedPapers
    .filter((paper) => paper.userId === userId)
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
}

interface PaperPayload {
  paperId: string
  title: string
  abstract?: string | null
  authors: string
  year?: number | null
  venue?: string | null
  url?: string | null
  pdfUrl?: string | null
}

export async function savePaper(userId: string, payload: PaperPayload) {
  const store = await readStore("appData")
  const existingIndex = store.savedPapers.findIndex(
    (paper) => paper.paperId === payload.paperId && paper.userId === userId,
  )
  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    store.savedPapers[existingIndex] = {
      ...store.savedPapers[existingIndex],
      ...payload,
      addedAt: now,
    }
    await writeStore("appData", store)
    return store.savedPapers[existingIndex]
  }

  const newPaper: SavedPaper = {
    id: randomUUID(),
    userId,
    addedAt: now,
    ...payload,
  }
  store.savedPapers.push(newPaper)
  await writeStore("appData", store)
  return newPaper
}

export async function removeSavedPaper(userId: string, paperId: string) {
  const store = await readStore("appData")
  const before = store.savedPapers.length
  store.savedPapers = store.savedPapers.filter(
    (paper) => !(paper.paperId === paperId && paper.userId === userId),
  )
  const removed = before !== store.savedPapers.length
  if (removed) {
    await writeStore("appData", store)
  }
  return removed
}

export async function getDashboardSnapshot(userId: string, email: string) {
  const [documents, savedPapers] = await Promise.all([getAccessibleDocuments(userId, email), getSavedPapers(userId)])
  const recentActivity = [
    ...documents.map((doc) => ({
      id: doc.id,
      type: "document" as const,
      title: doc.title,
      timestamp: doc.updatedAt,
      description: "Edited document",
    })),
    ...savedPapers.map((paper) => ({
      id: paper.id,
      type: "paper" as const,
      title: paper.title,
      timestamp: paper.addedAt,
      description: "Saved to library",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const totalWords = documents.reduce((sum, doc) => sum + doc.content.split(/\s+/).filter(Boolean).length, 0)

  return {
    totalDocuments: documents.length,
    savedPapers: savedPapers.length,
    recentActivity: recentActivity.slice(0, 5),
    recentDocuments: documents.slice(0, 3),
    recentSaved: savedPapers.slice(0, 3),
    estimatedReadingHours: Math.ceil(totalWords / 250),
  }
}

export async function addCollaboratorInvite(params: {
  documentId: string
  inviterId: string
  inviteeEmail: string
  inviteeId?: string
  permission?: CollaboratorInvite["permission"]
  status: CollaboratorInvite["status"]
  deliveryMessage?: string
}) {
  const store = await readStore("appData")
  const invite: CollaboratorInvite = {
    id: randomUUID(),
    documentId: params.documentId,
    inviterId: params.inviterId,
    inviteeEmail: params.inviteeEmail,
    inviteeId: params.inviteeId,
    permission: params.permission ?? "edit",
    status: params.status,
    deliveryMessage: params.deliveryMessage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  store.collaboratorInvites.push(invite)
  await writeStore("appData", store)
  return invite
}

export async function listCollaboratorInvites(documentId: string) {
  const store = await readStore("appData")
  return store.collaboratorInvites.filter((invite) => invite.documentId === documentId)
}
