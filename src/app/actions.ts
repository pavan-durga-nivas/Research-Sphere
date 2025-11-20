'use server'

import { randomUUID } from "node:crypto"

export interface Paper {
  paperId: string
  title: string
  abstract: string | null
  year: number | null
  authors: { name: string }[]
  url: string | null
  venue: string | null
  openAccessPdf: { url: string } | null
}

interface SemanticScholarResponse {
  total: number
  offset: number
  data: Paper[]
}

interface CrossrefResponse {
  status: string
  message?: {
    items?: CrossrefItem[]
  }
}

interface CrossrefItem {
  DOI?: string
  title?: string[]
  abstract?: string
  author?: Array<{ given?: string; family?: string; name?: string }>
  issued?: { "date-parts"?: number[][] }
  "container-title"?: string[]
  URL?: string
  link?: Array<{ URL?: string; "content-type"?: string }>
}

interface OpenAlexResponse {
  results?: OpenAlexWork[]
}

interface OpenAlexWork {
  id: string
  display_name: string
  abstract_inverted_index?: Record<string, number[]>
  publication_year?: number
  authorships?: Array<{
    author?: { display_name?: string }
  }>
  primary_location?: {
    landing_page_url?: string
    pdf_url?: string
    source?: { display_name?: string }
  }
  host_venue?: { display_name?: string }
  open_access?: { oa_url?: string }
}

const SEMANTIC_FIELDS = "paperId,title,abstract,year,authors,url,venue,openAccessPdf"
const SEMANTIC_LIMIT = 30
const MIN_PAPER_RESULTS = 30
const CROSSREF_ROWS = 30
const OPEN_ACCESS_TARGET = 8
const RATE_LIMIT_COOLDOWN_MS = 1000 * 60 * 2 // 2 minutes

class SemanticScholarRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SemanticScholarRateLimitError"
  }
}

let semanticScholarCooldownUntil = 0

export async function searchPapers(query: string): Promise<Paper[]> {
  if (!query) return []

  const papersById = new Map<string, Paper>()
  const addPapers = (incoming?: Paper[] | null) => {
    if (!incoming) return
    for (const paper of incoming) {
      if (!paper?.paperId) continue
      if (!papersById.has(paper.paperId)) {
        papersById.set(paper.paperId, paper)
      }
    }
  }

  try {
    addPapers(await fetchFromSemanticScholar(query, SEMANTIC_LIMIT))
  } catch (error) {
    if (error instanceof SemanticScholarRateLimitError) {
      console.warn("Semantic Scholar rate limit reached, skipping until cooldown expires.")
    } else {
      console.error("Semantic Scholar search failed:", error)
    }
  }

  if (papersById.size < MIN_PAPER_RESULTS) {
    try {
      const needed = Math.max(MIN_PAPER_RESULTS - papersById.size, CROSSREF_ROWS)
      addPapers(await fetchFromCrossref(query, needed))
    } catch (error) {
      console.error("Crossref supplemental fetch failed:", error)
    }
  }

  const openAccessCount = Array.from(papersById.values()).filter((paper) => Boolean(paper.openAccessPdf?.url)).length
  if (openAccessCount < OPEN_ACCESS_TARGET) {
    try {
      addPapers(await fetchOpenAccessFromOpenAlex(query, OPEN_ACCESS_TARGET * 2))
    } catch (error) {
      console.error("OpenAlex open-access fetch failed:", error)
    }
  }

  if (papersById.size < MIN_PAPER_RESULTS) {
    try {
      addPapers(await fetchFromCrossref(query, MIN_PAPER_RESULTS - papersById.size + 10))
    } catch (error) {
      console.error("Final Crossref fetch failed:", error)
    }
  }

  const finalResults = Array.from(papersById.values())
  return finalResults.slice(0, Math.max(MIN_PAPER_RESULTS, finalResults.length))
}

async function fetchFromSemanticScholar(query: string, limit = SEMANTIC_LIMIT) {
  if (Date.now() < semanticScholarCooldownUntil) {
    throw new SemanticScholarRateLimitError("Semantic Scholar cooldown active")
  }

  const response = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${SEMANTIC_FIELDS}`,
    {
      headers: {
        "User-Agent": "ResearchSphere/1.0 (contact: support@research-sphere.app)",
        ...(process.env.SEMANTIC_SCHOLAR_API_KEY ? { "x-api-key": process.env.SEMANTIC_SCHOLAR_API_KEY } : {}),
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    if (response.status === 429) {
      semanticScholarCooldownUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS
      throw new SemanticScholarRateLimitError(text)
    }
    throw new Error(`Semantic Scholar responded with ${response.status}: ${text}`)
  }

  const data: SemanticScholarResponse = await response.json()
  return data.data || []
}

async function fetchFromCrossref(query: string, rows = CROSSREF_ROWS) {
  const response = await fetch(
    `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${rows}&select=title,abstract,author,issued,URL,container-title,DOI,link`,
    {
      headers: {
        "User-Agent": "ResearchSphere/1.0 (mailto:support@research-sphere.app)",
        Accept: "application/json",
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Crossref responded with ${response.status}: ${text}`)
  }

  const data: CrossrefResponse = await response.json()
  const items = data.message?.items ?? []

  return items.map((item) => {
    const authors =
      item.author?.map((author) => {
        const fullName = [author.given, author.family].filter(Boolean).join(" ").trim()
        return { name: fullName || author.name || "Unknown Author" }
      }) ?? []

    const year = item.issued?.["date-parts"]?.[0]?.[0] ?? null
    const pdfLink = item.link?.find((link) => link["content-type"] === "application/pdf")?.URL ?? null

    return {
      paperId: item.DOI ?? item.URL ?? randomUUID(),
      title: item.title?.[0] ?? "Untitled Paper",
      abstract: item.abstract ? stripHtml(item.abstract) : null,
      year,
      authors,
      url: item.URL ?? null,
      venue: item["container-title"]?.[0] ?? null,
      openAccessPdf: pdfLink ? { url: pdfLink } : null,
    } satisfies Paper
  })
}

async function fetchOpenAccessFromOpenAlex(query: string, limit = OPEN_ACCESS_TARGET * 2) {
  const response = await fetch(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${limit}&filter=open_access.is_oa:true`,
    {
      headers: {
        "User-Agent": "ResearchSphere/1.0 (mailto:support@research-sphere.app)",
      },
    },
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAlex responded with ${response.status}: ${text}`)
  }

  const data: OpenAlexResponse = await response.json()
  const works = data.results ?? []

  return works.map((work) => {
    const authors =
      work.authorships?.map((authorship) => ({
        name: authorship.author?.display_name ?? "Unknown Author",
      })) ?? []

    const abstract = work.abstract_inverted_index ? flattenOpenAlexAbstract(work.abstract_inverted_index) : null
    const pdfUrl = work.primary_location?.pdf_url ?? work.open_access?.oa_url ?? null
    const landingUrl = work.primary_location?.landing_page_url ?? work.id

    return {
      paperId: work.id,
      title: work.display_name ?? "Untitled Paper",
      abstract,
      year: work.publication_year ?? null,
      authors,
      url: landingUrl,
      venue: work.primary_location?.source?.display_name ?? work.host_venue?.display_name ?? null,
      openAccessPdf: pdfUrl ? { url: pdfUrl } : null,
    } satisfies Paper
  })
}

function stripHtml(text: string) {
  return text.replace(/<\/?[^>]+(>|$)/g, "")
}

function flattenOpenAlexAbstract(abstractIndex: Record<string, number[]>) {
  const tokens: string[] = []
  for (const [word, positions] of Object.entries(abstractIndex)) {
    positions.forEach((position) => {
      tokens[position] = word
    })
  }
  const text = tokens.filter(Boolean).join(" ").trim()
  return text.length ? text : null
}
