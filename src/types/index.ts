export interface StoredUser {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
  bio?: string
  institution?: string
  role?: string
  website?: string
  orcid?: string
}

export type SessionUser = Omit<StoredUser, "passwordHash">

export interface StoredDocument {
  id: string
  userId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface SavedPaper {
  id: string
  userId: string
  paperId: string
  title: string
  abstract?: string | null
  authors: string
  year?: number | null
  venue?: string | null
  url?: string | null
  pdfUrl?: string | null
  addedAt: string
}

export interface CollaboratorInvite {
  id: string
  documentId: string
  inviterId: string
  inviteeEmail: string
  inviteeId?: string
  permission?: "view" | "edit"
  status: "pending" | "sent" | "failed"
  createdAt: string
  updatedAt: string
  deliveryMessage?: string
}

export interface CollaboratorAccess {
  id: string
  documentId: string
  userId?: string
  email?: string
  permission: "view" | "edit"
  addedAt: string
}

export type DocumentPermission = "owner" | "edit" | "view"
