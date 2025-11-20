import { NextResponse } from "next/server"
import { getSavedPapers, savePaper } from "@/lib/app-data"
import { getSessionUser } from "@/lib/auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const papers = await getSavedPapers(user.id)
  return NextResponse.json({ papers })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json()
  if (!payload.paperId || !payload.title || !payload.authors) {
    return NextResponse.json({ error: "Missing paper metadata." }, { status: 400 })
  }

  const paper = await savePaper(user.id, payload)
  return NextResponse.json({ paper })
}
