import { NextResponse } from "next/server"
import { extractTextFromFile, isSupportedFile } from "@/lib/text-extraction"
import { getSessionUser } from "@/lib/auth"

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
  }

  if (!isSupportedFile(file)) {
    return NextResponse.json({ error: "Unsupported file type. Use PDF, Word, or text files." }, { status: 400 })
  }

  try {
    const text = (await extractTextFromFile(file)).trim()
    if (!text) {
      return NextResponse.json({ error: "No readable text found in the file." }, { status: 400 })
    }
    return NextResponse.json({ text })
  } catch (error) {
    console.error("File extraction failed", error)
    return NextResponse.json({ error: "Could not extract text from the file." }, { status: 500 })
  }
}
