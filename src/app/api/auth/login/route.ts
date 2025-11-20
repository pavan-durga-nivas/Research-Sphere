import { NextResponse } from "next/server"
import { authenticateUser, buildAuthCookie } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const { user, token } = await authenticateUser(email, password)
    const response = NextResponse.json({ user })
    response.cookies.set(buildAuthCookie(token))
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 401 },
    )
  }
}
