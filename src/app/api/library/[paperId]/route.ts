import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { removeSavedPaper } from "@/lib/app-data"

interface RouteParams {
  params: { paperId: string }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const removed = await removeSavedPaper(user.id, params.paperId)
  if (!removed) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
