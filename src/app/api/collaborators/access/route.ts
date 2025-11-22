import { NextResponse } from "next/server"
import {
  getDocumentById,
  listCollaboratorAccess,
  removeCollaboratorAccess,
  setCollaboratorAccess,
} from "@/lib/app-data"
import { getSessionUser, getUserById } from "@/lib/auth"

function ensureOwner(documentUserId: string, userId: string) {
  if (documentUserId !== userId) {
    throw new Error("Forbidden")
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(request.url)
  const documentId = url.searchParams.get("documentId")
  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 })
  }

  const document = await getDocumentById(documentId)
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 })
  try {
    ensureOwner(document.userId, user.id)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const accessList = await listCollaboratorAccess(documentId)
  const collaborators = await Promise.all(
    accessList.map(async (access) => {
      const profile = access.userId ? await getUserById(access.userId) : null
      return {
        id: access.id,
        userId: access.userId,
        email: access.email ?? profile?.email,
        name: profile?.name ?? "Pending collaborator",
        permission: access.permission,
        addedAt: access.addedAt,
      }
    }),
  )

  return NextResponse.json({ collaborators })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const documentId = typeof body.documentId === "string" ? body.documentId : ""
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const permission = body.permission === "view" ? "view" : "edit"

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 })
  }
  if (!accountId && !email) {
    return NextResponse.json({ error: "Provide an accountId or email." }, { status: 400 })
  }

  const document = await getDocumentById(documentId)
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 })
  try {
    ensureOwner(document.userId, user.id)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await setCollaboratorAccess({
    documentId,
    userId: accountId || undefined,
    email: email || undefined,
    permission,
  })

  return NextResponse.json({ message: "Access updated." })
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const documentId = typeof body.documentId === "string" ? body.documentId : ""
  const accountId = typeof body.accountId === "string" ? body.accountId.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

  if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 })
  }
  if (!accountId && !email) {
    return NextResponse.json({ error: "Provide an accountId or email." }, { status: 400 })
  }

  const document = await getDocumentById(documentId)
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 })
  try {
    ensureOwner(document.userId, user.id)
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const removed = await removeCollaboratorAccess({
    documentId,
    userId: accountId || undefined,
    email: email || undefined,
  })

  return NextResponse.json({ removed })
}
