"use client"

import { FormEvent, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import type { SessionUser } from "@/types"
import { useAuth } from "@/components/providers/AuthProvider"
import {
  AtSign,
  BadgeCheck,
  Building2,
  Globe,
  Loader2,
  NotebookPen,
  UserRound,
} from "lucide-react"

interface ProfileClientProps {
  initialUser: SessionUser
}

export default function ProfileClient({ initialUser }: ProfileClientProps) {
  const { setUser } = useAuth()
  const [form, setForm] = useState({
    name: initialUser.name ?? "",
    email: initialUser.email ?? "",
    institution: initialUser.institution ?? "",
    role: initialUser.role ?? "",
    website: initialUser.website ?? "",
    orcid: initialUser.orcid ?? "",
    bio: initialUser.bio ?? "",
  })
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const handleChange = (field: keyof typeof form) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus("saving")
    setMessage(null)

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.")
      }
      setUser(data.user)
      setStatus("success")
      setMessage("Profile updated")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setTimeout(() => setStatus("idle"), 1500)
    }
  }

  const handleCopyAccountId = async () => {
    try {
      await navigator.clipboard?.writeText(initialUser.id)
      setCopyMessage("Copied")
    } catch {
      setCopyMessage("Copy failed")
    } finally {
      setTimeout(() => setCopyMessage(null), 1500)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 flex flex-col gap-3">
        <p className="text-sm uppercase tracking-wide text-primary font-semibold">Profile</p>
        <h1 className="text-3xl font-bold tracking-tight">Your researcher identity</h1>
        <p className="text-muted-foreground max-w-2xl">
          Keep your collaborator card up to date so co-authors know who they are working with and how to reach you.
        </p>
        <div className="inline-flex items-center gap-3 rounded-md border border-hairline bg-muted/40 px-3 py-2 text-sm w-fit">
          <span className="text-muted-foreground">Account ID</span>
          <code className="rounded bg-background px-2 py-[2px] text-xs">{initialUser.id}</code>
          <Button size="sm" variant="outline" onClick={handleCopyAccountId}>
            Copy
          </Button>
          {copyMessage && <span className="text-xs text-muted-foreground">{copyMessage}</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border-hairline">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Full name</span>
                  <Input value={form.name} onChange={(event) => handleChange("name")(event.target.value)} required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Email</span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email")(event.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Institution / Lab</span>
                  <Input
                    placeholder="e.g., MIT CSAIL"
                    value={form.institution}
                    onChange={(event) => handleChange("institution")(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Role or title</span>
                  <Input
                    placeholder="Research Scientist, PhD Candidate, PI"
                    value={form.role}
                    onChange={(event) => handleChange("role")(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">Website</span>
                  <Input
                    placeholder="https://"
                    value={form.website}
                    onChange={(event) => handleChange("website")(event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-muted-foreground">ORCID</span>
                  <Input
                    placeholder="0000-0000-0000-0000"
                    value={form.orcid}
                    onChange={(event) => handleChange("orcid")(event.target.value)}
                  />
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Research focus / bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) => handleChange("bio")(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Keywords, methodologies, current questions you are exploring."
                />
              </label>

              {message && (
                <p
                  className={`text-sm ${
                    status === "error" ? "text-error" : "text-success"
                  }`}
                >
                  {message}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={status === "saving"}>
                  {status === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
                <p className="text-xs text-muted-foreground">
                  Profile updates refresh your collaborator badge and invite emails.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-hairline">
            <CardHeader>
              <CardTitle>Profile preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold leading-tight">{form.name || "Your name"}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {form.role || "Researcher"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{form.institution || "Add a lab or institution"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AtSign className="h-4 w-4" />
                  <span>{form.email || "Add your email"}</span>
                </div>
                {form.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-4 w-4" />
                    <span className="truncate">{form.website}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <NotebookPen className="h-4 w-4" />
                  <code className="rounded bg-background px-2 py-[2px] text-xs">{initialUser.id}</code>
                </div>
                {form.orcid && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <NotebookPen className="h-4 w-4" />
                    <span>{form.orcid}</span>
                  </div>
                )}
              </div>
              <div className="rounded-md border border-hairline bg-muted/40 p-3 text-sm leading-relaxed">
                {form.bio || "A short bio about your research focus will appear here."}
              </div>
            </CardContent>
          </Card>

          <Card className="border-hairline">
            <CardHeader>
              <CardTitle>Collaboration readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Keep your institution and role current for collaborator invites.</p>
              <p>• Add ORCID/website so reviewers can verify your work quickly.</p>
              <p>• Bio highlights get shared alongside document invites.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
