const GEMINI_API_KEY = process.env.GEMINI_FLASH_API_KEY || process.env.GOOGLE_API_KEY
const GEMINI_MODEL = process.env.GEMINI_FLASH_MODEL || "gemini-1.5-flash"

interface GenerateOptions {
  prompt: string
  context?: string
  temperature?: number
  json?: boolean
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
}

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("Gemini API key is missing. Set GEMINI_FLASH_API_KEY in your environment.")
  }
}

export async function generateWithGemini({ prompt, context, temperature = 0.2, json }: GenerateOptions) {
  if (!GEMINI_API_KEY) {
    throw new GeminiNotConfiguredError()
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const parts = [{ text: prompt }]
  if (context) {
    parts.push({ text: `\nContext:\n${context}` })
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature,
      responseMimeType: json ? "application/json" : undefined,
    },
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    console.error("Gemini error", await response.text())
    throw new Error("Gemini request failed")
  }

  const data = (await response.json()) as GeminiResponse
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n").trim()
  if (!text) {
    throw new Error("Gemini returned no content")
  }

  return text
}
