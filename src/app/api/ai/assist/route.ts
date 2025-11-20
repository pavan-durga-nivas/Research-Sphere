import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { GeminiNotConfiguredError, generateWithGemini } from "@/lib/ai"

interface RequestBody {
  question: string
  document?: { title?: string; content?: string }
}

const MAX_CONTEXT_LENGTH = 5000

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as RequestBody
  if (!body.question) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 })
  }

  const sanitizedContent = body.document?.content
    ? body.document.content.replace(/<[^>]+>/g, " ").slice(0, MAX_CONTEXT_LENGTH)
    : ""

  const prompt = `You are an AI research assistant helping ${user.name} improve a scientific paper.
Question: ${body.question}

Respond with concrete, actionable suggestions. When referencing the document, quote short sections and explain how to improve them.`

  try {
    const message = await generateWithGemini({
      prompt,
      context: sanitizedContent ? `Title: ${body.document?.title ?? "Untitled"}\n${sanitizedContent}` : undefined,
    })
    return NextResponse.json({ message })
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Unable to contact AI assistant." }, { status: 500 })
  }
}
