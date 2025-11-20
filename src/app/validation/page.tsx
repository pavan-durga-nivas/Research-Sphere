"use client"

import { ChangeEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Upload, FileText, ShieldAlert, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

interface ValidationResult {
  originality: number
  aiProbability: number
  strengths: string[]
  risks: string[]
  recommendations: string[]
}

export default function ValidationPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [textInput, setTextInput] = useState("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Please keep it under 20MB.")
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const text = loadEvent.target?.result
        if (typeof text === "string") {
          setTextInput(text)
          setSelectedFile(file.name)
          setError(null)
        } else {
          setError("Unable to read this file. Try a plain text version.")
        }
      }
      reader.readAsText(file)
    } catch (err) {
      console.error(err)
      setError("Failed to read the file contents.")
    }
  }

  const handleValidation = async () => {
    if (textInput.trim().length < 100) {
      setError("Paste at least a paragraph (100+ characters) for analysis.")
      return
    }
    setError(null)
    setResult(null)
    setIsScanning(true)
    try {
      const response = await fetch("/api/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Validation failed")
      }
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center max-w-2xl mx-auto space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">AI Integrity Lab</p>
        <h1 className="text-3xl font-bold tracking-tight">Research Validation</h1>
        <p className="text-muted-foreground">
          Upload your manuscript or paste an abstract. Gemini-powered validation checks originality, potential AI usage,
          and highlights actionable feedback before submission.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Upload or paste content</CardTitle>
            <CardDescription>TXT, Markdown, or copied abstracts up to 20MB.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Upload className="h-8 w-8" />
                </div>
                <div>
                  <p className="font-medium">
                    {selectedFile ? `Selected: ${selectedFile}` : "Drag & drop or click to browse"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">We convert the text locally before sending to AI.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.tex,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button variant="outline">Select File</Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Or paste text directly:</p>
              <textarea
                className="w-full min-h-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none glass"
                placeholder="Paste introduction, methodology, or abstract..."
                value={textInput}
                onChange={(event) => setTextInput(event.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button className="w-full h-12" onClick={handleValidation} disabled={isScanning}>
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing...
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" /> Run Validation Check
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!result && !isScanning && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/10 rounded-xl p-12">
              <ShieldAlert className="h-12 w-12 mb-4 opacity-20" />
              <p>Upload a document or paste text to see AI validation.</p>
            </div>
          )}

          {isScanning && (
            <Card className="border-primary/40 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Generating report
                </CardTitle>
                <CardDescription>Compiling originality, AI probability, and flagged sections.</CardDescription>
              </CardHeader>
            </Card>
          )}

          {result && (
            <Card className="border-primary/60 bg-primary/5 animate-in fade-in slide-in-from-bottom-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Analysis Complete
                </CardTitle>
                <CardDescription>Generated just now</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 p-4 text-center">
                    <p className="text-sm text-muted-foreground">Originality</p>
                    <p className="text-3xl font-bold text-green-400">{result.originality}%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 p-4 text-center">
                    <p className="text-sm text-muted-foreground">AI Probability</p>
                    <p className={`text-3xl font-bold ${result.aiProbability > 35 ? "text-red-400" : "text-yellow-300"}`}>
                      {result.aiProbability}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Strengths</h4>
                  {result.strengths.map((item, index) => (
                    <div key={index} className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Risks</h4>
                  {result.risks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No serious issues detected.</p>
                  ) : (
                    result.risks.map((item, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                        {item}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Action Items</h4>
                  {result.recommendations.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 rounded-lg border border-white/10 bg-background/70 p-3 text-sm">
                      <FileText className="h-4 w-4 mt-0.5 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
