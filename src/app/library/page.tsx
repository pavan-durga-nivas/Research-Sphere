import { getSavedPapers } from "@/lib/app-data"
import { requireSessionUser } from "@/lib/auth"
import { LibraryClient } from "@/app/library/library-client"

export default async function LibraryPage() {
  const user = await requireSessionUser()
  const papers = await getSavedPapers(user.id)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center space-y-2">
        <p className="text-sm uppercase tracking-wide text-primary font-semibold">Knowledge Hub</p>
        <h1 className="text-3xl font-bold tracking-tight">Saved Papers Library</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Curate, review, and organize your favorite research across disciplines. Everything you&apos;ve saved from
          Discovery and the editor lives here.
        </p>
      </div>
      <LibraryClient initialPapers={papers} />
    </div>
  )
}
