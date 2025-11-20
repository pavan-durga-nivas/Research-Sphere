import { NextResponse } from "next/server"
import { GeminiNotConfiguredError, generateWithGemini } from "@/lib/ai"
import { getSessionUser } from "@/lib/auth"

interface ValidationRequest {
  text: string
}

const MAX_INPUT_LENGTH = 8000

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = (await request.json()) as ValidationRequest
  if (!text || text.trim().length < 100) {
    return NextResponse.json({ error: "Provide at least 100 characters for analysis." }, { status: 400 })
  }

  const truncatedText = text.slice(0, MAX_INPUT_LENGTH)
  const prompt = `You are a research integrity reviewer. Analyse the submission below for originality, AI-generation likelihood, and provide clear strengths, risks, and next steps.

Respond ONLY with JSON using this schema:
{
  "originality": number (0-100),
  "aiProbability": number (0-100),
  "strengths": string[],
  "risks": string[],
  "recommendations": string[]
}`

  try {
    const response = await generateWithGemini({
      prompt,
      context: truncatedText,
      json: true,
      temperature: 0.1,
    })

    const sanitized = response.replace(/```json|```/gi, "").trim()
    const parsed = JSON.parse(sanitized)
    const normalized = {
      originality: Math.min(100, Math.max(0, Number(parsed.originality ?? 0))),
      aiProbability: Math.min(100, Math.max(0, Number(parsed.aiProbability ?? 0))),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    }
    return NextResponse.json({ result: normalized })
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    console.error("Validation analysis failed", error)
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 })
  }
}
