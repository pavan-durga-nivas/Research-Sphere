import { NextResponse } from "next/server"
import { getUserDocuments, upsertDocument } from "@/lib/app-data"
import { getSessionUser } from "@/lib/auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const documents = await getUserDocuments(user.id)
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

  const document = await upsertDocument(user.id, {
    id,
    title: typeof title === "string" ? title : "Untitled Document",
    content,
  })

  return NextResponse.json({ document })
}
