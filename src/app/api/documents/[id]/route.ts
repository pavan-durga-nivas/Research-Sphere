import { NextResponse } from "next/server"
import { deleteDocument } from "@/lib/app-data"
import { getSessionUser } from "@/lib/auth"

interface RouteParams {
  params: { id: string }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const removed = await deleteDocument(user.id, params.id)
  if (!removed) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
