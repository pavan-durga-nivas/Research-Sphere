import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { FileText, Clock, Bookmark, TrendingUp, Plus, Sparkles, ArrowUpRight } from "lucide-react"
import { getDashboardSnapshot } from "@/lib/app-data"
import { requireSessionUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await requireSessionUser()
  const snapshot = await getDashboardSnapshot(user.id, user.email)

  const metrics = [
    {
      title: "Documents",
      value: snapshot.totalDocuments,
      icon: FileText,
      description: `${snapshot.recentDocuments.length} active drafts`,
    },
    {
      title: "Saved Papers",
      value: snapshot.savedPapers,
      icon: Bookmark,
      description: "Library items",
    },
    {
      title: "Reading Time",
      value: `${snapshot.estimatedReadingHours}h`,
      icon: Clock,
      description: "Estimated this month",
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-primary font-semibold">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight">Hi {user.name.split(" ")[0]}, here&apos;s your workspace</h1>
          <p className="text-muted-foreground">Track your drafts, saved papers, and AI insights in one view.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/discovery">Discover Papers</Link>
          </Button>
          <Button asChild>
            <Link href="/editor">
              <Plus className="mr-2 h-4 w-4" /> New Document
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}

        <Card className="border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Insight</CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {snapshot.recentDocuments.length > 0
                ? `Finish "${snapshot.recentDocuments[0].title}" and send for validation.`
                : "Start a collaborative draft to unlock AI structure suggestions."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="col-span-4 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest document edits and saved literature.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/library">
                View Library <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity. Start by saving a paper.</p>
            ) : (
              snapshot.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-lg border border-white/10 p-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    {item.type === "document" ? <FileText className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 border-white/10">
          <CardHeader>
            <CardTitle>Reading Queue</CardTitle>
            <CardDescription>Next up from your saved papers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshot.recentSaved.length === 0 ? (
              <p className="text-sm text-muted-foreground">Save papers from Discovery to build your queue.</p>
            ) : (
              snapshot.recentSaved.map((paper) => (
                <div key={paper.id} className="rounded-lg border border-white/10 p-3 space-y-1">
                  <p className="text-sm font-semibold">{paper.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {paper.authors} • {paper.year ?? "n/a"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{paper.venue ?? "Research"}</span>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-primary" asChild>
                      <Link href={paper.url || "/library"} target={paper.url ? "_blank" : "_self"}>
                        Open
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-white/10">
        <CardHeader>
          <CardTitle>Productivity Boost</CardTitle>
          <CardDescription>Quick stats to keep momentum.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-sm text-muted-foreground">Average session</p>
            <p className="text-2xl font-semibold">{Math.max(1, Math.floor(snapshot.estimatedReadingHours / 2))} hrs</p>
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> up vs last week
            </p>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-sm text-muted-foreground">AI requests sent</p>
            <p className="text-2xl font-semibold">{snapshot.totalDocuments + snapshot.savedPapers}</p>
            <p className="text-xs text-muted-foreground mt-1">Ask Gemini for section rewrites anytime.</p>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-sm text-muted-foreground">Next action</p>
            <p className="text-2xl font-semibold">Validate draft</p>
            <p className="text-xs text-muted-foreground mt-1">Send your latest document through Validation.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
