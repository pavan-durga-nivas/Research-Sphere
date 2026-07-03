import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto"
import { SessionUser, StoredUser } from "@/types"
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/session-token"
import { AUTH_COOKIE_NAME } from "@/lib/constants"
import {
  DEV_LOGIN_EMAIL,
  DEV_LOGIN_PASSWORD,
  DEV_LOGIN_USER,
  DEV_LOGIN_USER_ID,
  isDevLoginEnabled,
} from "@/lib/dev-credentials"
import { getCollection } from "@/lib/mongo"

const baseCookieConfig = {
  name: AUTH_COOKIE_NAME,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
}

export const buildAuthCookie = (token: string) => ({
  ...baseCookieConfig,
  value: token,
  maxAge: SESSION_TTL_SECONDS,
})

export const clearAuthCookie = {
  ...baseCookieConfig,
  value: "",
  maxAge: 0,
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const derivedKey = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${derivedKey}`
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":")
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, "hex")
  const derivedBuffer = scryptSync(password, salt, 64)
  return (
    hashBuffer.length === derivedBuffer.length &&
    timingSafeEqual(hashBuffer, derivedBuffer)
  )
}

export function sanitizeUser(user: StoredUser & { _id?: unknown }): SessionUser {
  const { passwordHash, _id, ...rest } = user
  void passwordHash
  void _id
  return { ...rest }
}

export async function registerUser(name: string, email: string, password: string) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const users = await getCollection<StoredUser>("users")
  const existing = await users.findOne({ email: normalizedEmail })
  if (existing) {
    throw new Error("A user with this email already exists.")
  }

  const newUser: StoredUser = {
    id: randomUUID(),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  await users.insertOne(newUser)

  const token = createSessionToken({ userId: newUser.id, email: normalizedEmail })
  return { user: sanitizeUser(newUser), token }
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()

  if (
    isDevLoginEnabled() &&
    normalizedEmail === DEV_LOGIN_EMAIL &&
    password === DEV_LOGIN_PASSWORD
  ) {
    const token = createSessionToken({
      userId: DEV_LOGIN_USER.id,
      email: DEV_LOGIN_USER.email,
    })
    return { user: DEV_LOGIN_USER, token }
  }

  const users = await getCollection<StoredUser>("users")
  const existingUser = await users.findOne({ email: normalizedEmail })

  if (!existingUser || !verifyPassword(password, existingUser.passwordHash)) {
    throw new Error("Invalid email or password.")
  }

  const token = createSessionToken({ userId: existingUser.id, email: existingUser.email })
  return { user: sanitizeUser(existingUser), token }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  if (isDevLoginEnabled() && payload.userId === DEV_LOGIN_USER_ID) {
    return DEV_LOGIN_USER
  }

  const users = await getCollection<StoredUser>("users")
  const user = await users.findOne({ id: payload.userId })
  return user ? sanitizeUser(user) : null
}

export async function requireSessionUser() {
  const user = await getSessionUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

export async function getUserById(id: string) {
  const users = await getCollection<StoredUser>("users")
  return (await users.findOne({ id })) ?? null
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<StoredUser, "name" | "email" | "bio" | "institution" | "role" | "website" | "orcid">>,
) {
  const users = await getCollection<StoredUser>("users")
  const existing = await users.findOne({ id: userId })
  if (!existing) {
    throw new Error("User not found.")
  }

  const normalizedEmail = updates.email ? updates.email.trim().toLowerCase() : existing.email
  const emailChanged = normalizedEmail !== existing.email
  if (emailChanged) {
    const emailConflict = await users.findOne({ email: normalizedEmail })
    if (emailConflict && emailConflict.id !== userId) {
      throw new Error("That email is already in use.")
    }
  }

  const updatedUser: StoredUser = {
    ...existing,
    ...updates,
    email: normalizedEmail,
    name: (updates.name ?? existing.name).trim() || existing.name,
    bio: updates.bio ?? existing.bio,
    institution: updates.institution ?? existing.institution,
    role: updates.role ?? existing.role,
    website: updates.website ?? existing.website,
    orcid: updates.orcid ?? existing.orcid,
  }

  await users.updateOne({ id: userId }, { $set: updatedUser })

  const token = createSessionToken({ userId: updatedUser.id, email: updatedUser.email })
  return { user: sanitizeUser(updatedUser), token }
}

export { AUTH_COOKIE_NAME } from "@/lib/constants"
