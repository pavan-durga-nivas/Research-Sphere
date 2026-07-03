import { Buffer } from "node:buffer"
import mammoth from "mammoth"
import pdfParse from "pdf-parse"

const MAX_FILE_BYTES = 20 * 1024 * 1024

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
const isDocx = (file: File) => file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large (max 20MB).")
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (isPdf(file)) {
    const parsed = await pdfParse(buffer)
    return parsed.text || ""
  }

  if (isDocx(file)) {
    const { value } = await mammoth.extractRawText({ buffer })
    return value || ""
  }

  if (file.name.toLowerCase().endsWith(".doc")) {
    return buffer.toString("utf-8")
  }

  return buffer.toString("utf-8")
}

export function isSupportedFile(file: File) {
  const name = file.name.toLowerCase()
  return (
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".tex") ||
    name.endsWith(".json")
  )
}
