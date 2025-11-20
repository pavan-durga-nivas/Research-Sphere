import Link from "next/link"
import { Search } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-background/50 backdrop-blur-lg">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Search className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-bold tracking-tight text-foreground">
                                Research<span className="text-primary">Sphere</span>
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            Accelerating scientific discovery with AI-powered tools for researchers.
                        </p>
                    </div>

                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Platform</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/discovery" className="hover:text-primary">Paper Discovery</Link></li>
                            <li><Link href="/editor" className="hover:text-primary">Collaborative Editor</Link></li>
                            <li><Link href="/validation" className="hover:text-primary">AI Validation</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Resources</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-primary">API Reference</Link></li>
                            <li><Link href="#" className="hover:text-primary">Community</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-foreground">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                            <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Research-Sphere. All rights reserved.
                </div>
            </div>
        </footer>
    )
}
