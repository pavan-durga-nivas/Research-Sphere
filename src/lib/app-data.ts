import { randomUUID } from "node:crypto"
import { CollaboratorInvite, SavedPaper, StoredDocument } from "@/types"
import { readStore, writeStore } from "@/lib/data-store"

export async function getUserDocuments(userId: string) {
  const store = await readStore("appData")
  return store.documents
    .filter((doc) => doc.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function upsertDocument(userId: string, payload: { id?: string; title: string; content: string }) {
  const store = await readStore("appData")
  const now = new Date().toISOString()

  if (payload.id) {
    const index = store.documents.findIndex((doc) => doc.id === payload.id && doc.userId === userId)
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

export async function getDashboardSnapshot(userId: string) {
  const [documents, savedPapers] = await Promise.all([getUserDocuments(userId), getSavedPapers(userId)])
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
  status: CollaboratorInvite["status"]
  deliveryMessage?: string
}) {
  const store = await readStore("appData")
  const invite: CollaboratorInvite = {
    id: randomUUID(),
    documentId: params.documentId,
    inviterId: params.inviterId,
    inviteeEmail: params.inviteeEmail,
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
