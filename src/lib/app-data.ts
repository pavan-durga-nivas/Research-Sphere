import { randomUUID } from "node:crypto"
import {
  CollaboratorAccess,
  CollaboratorInvite,
  DocumentPermission,
  SavedPaper,
  StoredDocument,
} from "@/types"
import { getCollection } from "@/lib/mongo"

const sortByUpdatedDesc = <T extends { updatedAt: string }>(items: T[]) =>
  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

export async function getDocumentById(documentId: string) {
  const documents = await getCollection<StoredDocument>("documents")
  return documents.findOne({ id: documentId })
}

export async function getAccessibleDocuments(userId: string, email: string) {
  const documents = await getCollection<StoredDocument>("documents")
  const collabAccess = await getCollection<CollaboratorAccess>("collaboratorAccess")

  const collabEntries = await collabAccess
    .find({
      $or: [{ userId }, { email }],
    })
    .toArray()

  const collabDocIds = collabEntries.map((entry) => entry.documentId)

  const docs = await documents
    .find({
      $or: [{ userId }, ...(collabDocIds.length > 0 ? [{ id: { $in: collabDocIds } }] : [])],
    })
    .toArray()

  const result: (StoredDocument & { permission: DocumentPermission })[] = docs.map((doc) => {
    if (doc.userId === userId) {
      return { ...doc, permission: "owner" }
    }
    const match = collabEntries.find((entry) => entry.documentId === doc.id)
    return { ...doc, permission: match?.permission ?? "view" }
  })

  return sortByUpdatedDesc(result)
}

export async function upsertDocument(userId: string, payload: { id?: string; title: string; content: string }) {
  const documents = await getCollection<StoredDocument>("documents")
  const now = new Date().toISOString()

  if (payload.id) {
    const existing = await documents.findOne({ id: payload.id })
    if (existing) {
      const updated: StoredDocument = {
        ...existing,
        title: payload.title,
        content: payload.content,
        updatedAt: now,
      }
      await documents.updateOne({ id: payload.id }, { $set: updated })
      return updated
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

  await documents.insertOne(newDocument)
  return newDocument
}

export async function deleteDocument(userId: string, documentId: string) {
  const documents = await getCollection<StoredDocument>("documents")
  const result = await documents.deleteOne({ id: documentId, userId })
  return result.deletedCount > 0
}

export async function setCollaboratorAccess(params: {
  documentId: string
  userId?: string
  email?: string
  permission: CollaboratorAccess["permission"]
}) {
  const collabAccess = await getCollection<CollaboratorAccess>("collaboratorAccess")
  const normalizedEmail = params.email?.trim().toLowerCase()

  const filter: { documentId: string; userId?: string; email?: string } = { documentId: params.documentId }
  if (params.userId) {
    filter.userId = params.userId
  } else if (normalizedEmail) {
    filter.email = normalizedEmail
  }

  const collaboratorId = params.userId
    ? `${params.documentId}:${params.userId}`
    : normalizedEmail
      ? `${params.documentId}:${normalizedEmail}`
      : randomUUID()

  await collabAccess.updateOne(
    filter,
    {
      $set: {
        id: collaboratorId,
        documentId: params.documentId,
        userId: params.userId,
        email: normalizedEmail,
        permission: params.permission,
      },
      $setOnInsert: {
        addedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  )
}

export async function removeCollaboratorAccess(params: { documentId: string; userId?: string; email?: string }) {
  const collabAccess = await getCollection<CollaboratorAccess>("collaboratorAccess")
  const normalizedEmail = params.email?.trim().toLowerCase()
  const result = await collabAccess.deleteOne({
    documentId: params.documentId,
    ...(params.userId ? { userId: params.userId } : {}),
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
  })
  return result.deletedCount > 0
}

export async function listCollaboratorAccess(documentId: string) {
  const collabAccess = await getCollection<CollaboratorAccess>("collaboratorAccess")
  return collabAccess.find({ documentId }).toArray()
}

export async function getUserDocumentPermission(userId: string, email: string, documentId: string): Promise<DocumentPermission | null> {
  const documents = await getCollection<StoredDocument>("documents")
  const collabAccess = await getCollection<CollaboratorAccess>("collaboratorAccess")

  const document = await documents.findOne({ id: documentId })
  if (!document) return null
  if (document.userId === userId) return "owner"

  const match = await collabAccess.findOne({
    documentId,
    $or: [{ userId }, { email }],
  })
  if (!match) return null
  return match.permission
}

export async function getSavedPapers(userId: string) {
  const savedPapers = await getCollection<SavedPaper>("savedPapers")
  return savedPapers.find({ userId }).sort({ addedAt: -1 }).toArray()
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
  const savedPapers = await getCollection<SavedPaper>("savedPapers")
  const now = new Date().toISOString()

  const newPaper: SavedPaper = {
    id: randomUUID(),
    userId,
    addedAt: now,
    ...payload,
  }

  await savedPapers.updateOne(
    { userId, paperId: payload.paperId },
    { $set: { ...newPaper, addedAt: now } },
    { upsert: true },
  )

  return newPaper
}

export async function removeSavedPaper(userId: string, paperId: string) {
  const savedPapers = await getCollection<SavedPaper>("savedPapers")
  const result = await savedPapers.deleteOne({ userId, paperId })
  return result.deletedCount > 0
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
  const invites = await getCollection<CollaboratorInvite>("collaboratorInvites")
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
  await invites.insertOne(invite)
  return invite
}

export async function listCollaboratorInvites(documentId: string) {
  const invites = await getCollection<CollaboratorInvite>("collaboratorInvites")
  return invites.find({ documentId }).toArray()
}
