import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { ArrowRight, Sparkles, Search, ShieldCheck, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 text-center md:py-32 lg:py-40 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50" />
        <div className="container relative z-10 space-y-8">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            <span>Revolutionizing Research with AI</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-white via-primary to-secondary animate-gradient-x pb-2">
            Accelerate Your <br className="hidden sm:block" />
            Scientific Discovery
          </h1>
          <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Research-Sphere integrates GenAI tools, real-time collaboration, and validation to empower researchers worldwide.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/discovery">
                Start Discovering <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base glass hover:bg-white/5" asChild>
              <Link href="/editor">
                Try Editor
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-16 md:py-24 lg:py-32">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Everything you need to <span className="text-primary">research better</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A comprehensive suite of tools designed for the modern researcher.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card className="glass-hover transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <CardTitle>Smart Discovery</CardTitle>
              <CardDescription>
                Find relevant papers instantly with our AI-powered semantic search engine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stop relying on keyword matching. Our AI understands the context of your research to surface the most relevant literature.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-hover transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                <Users className="h-6 w-6" />
              </div>
              <CardTitle>Real-time Collaboration</CardTitle>
              <CardDescription>
                Write and edit papers with colleagues in real-time, anywhere in the world.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Seamlessly co-author documents with integrated chat, comments, and version control designed for academic writing.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-hover transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <CardTitle>AI Validation</CardTitle>
              <CardDescription>
                Ensure integrity with advanced plagiarism and AI content detection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pre-publication checks that give you confidence. Verify originality and detect potential AI-generated content issues.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10 bg-primary/5" />
        <div className="container px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to transform your research workflow?
          </h2>
          <p className="mb-8 mx-auto max-w-[600px] text-lg text-muted-foreground">
            Join thousands of researchers who are already using Research-Sphere to accelerate their discoveries.
          </p>
          <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
            Get Started for Free
          </Button>
        </div>
      </section>
    </div>
  )
}
