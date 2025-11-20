import { NextResponse } from "next/server"
import { buildAuthCookie, registerUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 })
    }

    const { user, token } = await registerUser(name, email, password)
    const response = NextResponse.json({ user })
    response.cookies.set(buildAuthCookie(token))
    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to register user." },
      { status: 400 },
    )
  }
}
