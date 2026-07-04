"use client"

import { useState } from "react"
import { SavedPaper } from "@/types"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { ExternalLink, Loader2, RefreshCw, BookmarkX } from "lucide-react"

interface LibraryClientProps {
  initialPapers: SavedPaper[]
}

export function LibraryClient({ initialPapers }: LibraryClientProps) {
  const [papers, setPapers] = useState(initialPapers)
  const [query, setQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const filtered = papers.filter((paper) => {
    if (!query) return true
    return (
      paper.title.toLowerCase().includes(query.toLowerCase()) ||
      paper.authors.toLowerCase().includes(query.toLowerCase()) ||
      (paper.venue ?? "").toLowerCase().includes(query.toLowerCase())
    )
  })

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch("/api/library", { cache: "no-store" })
      const data = await response.json()
      setPapers(data.papers ?? [])
    } catch (error) {
      console.error("Failed to refresh library", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRemove = async (paperId: string) => {
    setRemovingId(paperId)
    try {
      await fetch(`/api/library/${paperId}`, { method: "DELETE" })
      setPapers((items) => items.filter((paper) => paper.paperId !== paperId))
    } catch (error) {
      console.error("Failed to remove paper", error)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Input
            placeholder="Search saved papers..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11"
          />
          <Button variant="outline" className="h-11" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Total saved: {papers.length}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-xl border border-dashed border-hairline p-12 text-center text-muted-foreground">
          <BookmarkX className="mx-auto mb-4 h-10 w-10 text-primary/60" />
          <p>No papers match your search. Save papers from Discovery to build your reading list.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((paper) => (
            <Card key={paper.paperId} className="border-hairline bg-background/70">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg leading-tight">{paper.title}</CardTitle>
                    <CardDescription>
                      {paper.authors}
                      {paper.year ? ` · ${paper.year}` : null}
                    </CardDescription>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {paper.venue || "Research"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {paper.abstract && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{paper.abstract}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {paper.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={paper.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> View Source
                      </a>
                    </Button>
                  )}
                  {paper.pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" /> PDF
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(paper.paperId)}
                    disabled={removingId === paper.paperId}
                  >
                    {removingId === paper.paperId ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BookmarkX className="mr-2 h-4 w-4" />
                    )}
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
