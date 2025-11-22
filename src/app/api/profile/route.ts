import { NextResponse } from "next/server"
import { buildAuthCookie, getSessionUser, updateUserProfile } from "@/lib/auth"

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ user })
}

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const name = typeof body.name === "string" ? body.name : undefined
  const email = typeof body.email === "string" ? body.email : undefined
  const bio = typeof body.bio === "string" ? body.bio : undefined
  const institution = typeof body.institution === "string" ? body.institution : undefined
  const role = typeof body.role === "string" ? body.role : undefined
  const website = typeof body.website === "string" ? body.website : undefined
  const orcid = typeof body.orcid === "string" ? body.orcid : undefined

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  try {
    const { user, token } = await updateUserProfile(sessionUser.id, {
      name,
      email,
      bio,
      institution,
      role,
      website,
      orcid,
    })
    const response = NextResponse.json({ user, message: "Profile updated" })
    response.cookies.set(buildAuthCookie(token))
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile." },
      { status: 400 },
    )
  }
}
