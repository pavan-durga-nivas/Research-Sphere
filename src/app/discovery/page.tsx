"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Search, Filter, Download, Share2, Bookmark, Loader2, ExternalLink, BookmarkCheck } from "lucide-react"
import { searchPapers, type Paper } from "../actions"
import { useAuth } from "@/components/providers/AuthProvider"

const trendingTopics = ["AI safety", "Quantum materials", "Drug discovery", "Climate modeling", "Edge computing"]

export default function DiscoveryPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Paper[]>([])
  const [yearFilter, setYearFilter] = useState("any")
  const [openAccessOnly, setOpenAccessOnly] = useState(false)
  const [savedPapers, setSavedPapers] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setSavedPapers({})
      return
    }
    const fetchSaved = async () => {
      try {
        const response = await fetch("/api/library")
        const data = await response.json()
        const map = Object.fromEntries((data.papers ?? []).map((paper: { paperId: string }) => [paper.paperId, true]))
        setSavedPapers(map)
      } catch (error) {
        console.error("Failed to load saved papers", error)
      }
    }
    fetchSaved()
  }, [user])

  const filteredResults = useMemo(() => {
    return results.filter((paper) => {
      if (yearFilter !== "any") {
        const minYear = Number(yearFilter)
        if (paper.year && paper.year < minYear) {
          return false
        }
      }
      if (openAccessOnly && !paper.openAccessPdf?.url) {
        return false
      }
      return true
    })
  }, [results, yearFilter, openAccessOnly])

  const executeSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setError("Enter a topic, paper title, or author to begin.")
      return
    }
    setError(null)
    startTransition(() => {
      searchPapers(searchQuery)
        .then((papers) => setResults(papers))
        .catch(() => setError("Unable to fetch papers right now."))
    })
  }

  const handleSave = async (paper: Paper) => {
    if (!user) {
      router.push("/login?redirect=/discovery")
      return
    }
    setSavingId(paper.paperId)
    try {
      await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: paper.paperId,
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors.map((author) => author.name).join(", "),
          year: paper.year,
          venue: paper.venue,
          url: paper.url,
          pdfUrl: paper.openAccessPdf?.url,
        }),
      })
      setSavedPapers((prev) => ({ ...prev, [paper.paperId]: true }))
    } catch (err) {
      console.error("Failed to save paper", err)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">Research Discovery</p>
          <h1 className="text-3xl font-bold tracking-tight">Search the global research graph</h1>
          <p className="text-muted-foreground">
            Semantic Scholar integration surfaces the most relevant papers with AI-powered ranking.
          </p>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                className="h-12 pl-10 text-base"
                placeholder="Search by topic, abstract, DOI, or author..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    executeSearch(query)
                  }
                }}
              />
            </div>
            <Button className="h-12 px-8" onClick={() => executeSearch(query)} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Trending:</span>
            {trendingTopics.map((topic) => (
              <button
                key={topic}
                className="rounded-full border border-white/10 px-3 py-1 text-xs hover:text-primary transition-colors"
                onClick={() => {
                  setQuery(topic)
                  executeSearch(topic)
                }}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="glass h-fit border-white/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" /> Refine Results
            </CardTitle>
            <CardDescription>Focus on the literature that matters most.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Publication year</p>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm glass"
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="any">All years</option>
                <option value="2019">2019+</option>
                <option value="2021">2021+</option>
                <option value="2023">2023+</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-white/20 bg-transparent"
                checked={openAccessOnly}
                onChange={(event) => setOpenAccessOnly(event.target.checked)}
              />
              Open-access PDFs only
            </label>
            <div className="rounded-lg bg-background/60 p-3 text-xs text-muted-foreground">
              Tip: hover the abstract to expand. Save papers to build your personal reading queue.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isPending && (
            <div className="glass rounded-xl border border-white/10 p-6 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Scanning Semantic Scholar...
            </div>
          )}
          {!isPending && filteredResults.length === 0 && (
            <div className="glass rounded-xl border border-white/10 p-8 text-center text-muted-foreground">
              No papers yet. Try a different topic or broaden your filters.
            </div>
          )}

          {filteredResults.map((paper) => {
            const authors = paper.authors.map((author) => author.name).join(", ")
            const isSaved = savedPapers[paper.paperId]
            return (
              <Card key={paper.paperId} className="border-white/10 bg-background/70">
                <CardHeader>
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-xl leading-tight">{paper.title}</CardTitle>
                    <CardDescription>
                      {authors}
                      {paper.year ? ` · ${paper.year}` : ""}
                      {paper.venue ? ` · ${paper.venue}` : ""}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paper.abstract && (
                    <p className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {paper.abstract}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {paper.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={paper.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" /> View Paper
                        </a>
                      </Button>
                    )}
                    {paper.openAccessPdf?.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={paper.openAccessPdf.url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </a>
                      </Button>
                    )}
                    <Button
                      variant={isSaved ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleSave(paper)}
                      disabled={savingId === paper.paperId}
                    >
                      {savingId === paper.paperId ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : isSaved ? (
                        <BookmarkCheck className="mr-2 h-4 w-4" />
                      ) : (
                        <Bookmark className="mr-2 h-4 w-4" />
                      )}
                      {isSaved ? "Saved" : user ? "Save to Library" : "Sign in to Save"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(paper.url ?? paper.title).catch(console.error)
                        }
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
