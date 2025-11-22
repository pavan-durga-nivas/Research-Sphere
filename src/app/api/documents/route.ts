import { NextResponse } from "next/server"
import {
  getAccessibleDocuments,
  getDocumentById,
  getUserDocumentPermission,
  upsertDocument,
} from "@/lib/app-data"
import { getSessionUser } from "@/lib/auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const documents = await getAccessibleDocuments(user.id, user.email)
  return NextResponse.json({ documents })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, title, content } = await request.json()
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content is required." }, { status: 400 })
  }

  if (id) {
    const permission = await getUserDocumentPermission(user.id, user.email, id)
    if (!permission) {
      return NextResponse.json({ error: "You do not have access to this document." }, { status: 403 })
    }
    if (permission === "view") {
      return NextResponse.json({ error: "You only have view access to this document." }, { status: 403 })
    }
    const existing = await getDocumentById(id)
    if (existing && existing.userId !== user.id && permission !== "edit") {
      return NextResponse.json({ error: "You need edit permission to modify this document." }, { status: 403 })
    }
  }

  const document = await upsertDocument(user.id, {
    id,
    title: typeof title === "string" ? title : "Untitled Document",
    content,
  })

  return NextResponse.json({ document })
}
