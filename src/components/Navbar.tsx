"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Search, Menu, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/components/providers/AuthProvider"

const links = [
  { href: "/discovery", label: "Discovery", auth: false },
  { href: "/editor", label: "Editor", auth: true },
  { href: "/validation", label: "Validation", auth: true },
  { href: "/library", label: "Library", auth: true },
]

export function Navbar() {
  const router = useRouter()
  const { user, setUser } = useAuth()
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Search className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Research<span className="text-primary">Sphere</span>
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          {links
            .filter((link) => (link.auth ? isAuthenticated : true))
            .map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="text-right">
                  <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSignOut} disabled={isSigningOut}>
                  {isSigningOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
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
