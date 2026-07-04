"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import {
  BookOpen,
  FilePenLine,
  FlaskConical,
  LibraryBig,
  LogOut,
  Loader2,
  Menu,
  Moon,
  Search,
  Sun,
  UserRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"
import { useTheme } from "@/components/providers/ThemeProvider"

const links: { href: string; label: string; hint: string; icon: LucideIcon; auth: boolean; color: string }[] = [
  { href: "/discovery", label: "Discovery", hint: "Explore", icon: Search, auth: false, color: "text-primary" },
  { href: "/editor", label: "Editor", hint: "Write", icon: FilePenLine, auth: true, color: "text-secondary" },
  { href: "/validation", label: "Validation", hint: "Check", icon: FlaskConical, auth: true, color: "text-accent" },
  { href: "/library", label: "Library", hint: "Store", icon: LibraryBig, auth: true, color: "text-success" },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, setUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      router.push("/")
    } finally {
      setIsSigningOut(false)
    }
  }

  const isAuthenticated = Boolean(user)
  const visibleLinks = links.filter((link) => (link.auth ? isAuthenticated : true))

  return (
    <header className="sticky top-0 z-50 w-full border-b border-hairline bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 rounded-2xl border border-hairline bg-background/60 px-3 py-2 transition-colors hover:border-primary/30">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-secondary to-primary text-sm font-black text-background shadow-[0_0_24px_rgba(99,102,241,0.18)]">
            RS
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">
              Research<span className="text-primary">Sphere</span>
            </p>
            <p className="text-xs font-medium text-muted-foreground">AI research workspace</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2 rounded-2xl border border-hairline bg-background/55 p-2">
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "flex items-center gap-3 rounded-xl border px-3 py-2 transition-all",
                  isActive
                    ? "border-primary/40 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(6,182,212,0.08)]"
                    : "border-hairline bg-background/45 text-muted-foreground hover:border-white/20 hover:text-foreground",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-lg border",
                    isActive ? "border-current/30 bg-background/40" : "border-hairline bg-background/40",
                    link.color,
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-foreground">{link.label}</p>
                  <p className={`text-[11px] ${isActive ? link.color : "text-muted-foreground"}`}>{link.hint}</p>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="border border-hairline bg-background/45 hover:border-border"
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" className="border-hairline bg-background/45" asChild>
                  <Link href="/profile">
                    <UserRound className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="border-hairline bg-background/45" asChild>
                  <Link href="/dashboard">
                    <BookOpen className="mr-2 h-4 w-4" /> Dashboard
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" className="border border-transparent hover:border-hairline" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="border border-hairline bg-background/45" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
          {isAuthenticated && (
            <Button variant="ghost" size="icon" className="md:hidden" asChild>
              <Link href="/profile">
                <UserRound className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" asChild>
            <Link href={isAuthenticated ? "/dashboard" : "/login"}>
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
