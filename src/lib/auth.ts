import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto"
import { readStore, writeStore } from "@/lib/data-store"
import { SessionUser, StoredUser } from "@/types"
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/session-token"
import { AUTH_COOKIE_NAME } from "@/lib/constants"

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

export function sanitizeUser(user: StoredUser): SessionUser {
  const { passwordHash, ...rest } = user
  void passwordHash
  return rest
}

export async function registerUser(name: string, email: string, password: string) {
  const trimmedName = name.trim()
  const normalizedEmail = email.trim().toLowerCase()
  const usersStore = await readStore("users")

  if (usersStore.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("A user with this email already exists.")
  }

  const newUser: StoredUser = {
    id: randomUUID(),
    name: trimmedName,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }

  usersStore.users.push(newUser)
  await writeStore("users", usersStore)

  const token = createSessionToken({ userId: newUser.id, email: normalizedEmail })
  return { user: sanitizeUser(newUser), token }
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const usersStore = await readStore("users")
  const existingUser = usersStore.users.find((user) => user.email === normalizedEmail)

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

  const usersStore = await readStore("users")
  const user = usersStore.users.find((item) => item.id === payload.userId)
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
  const usersStore = await readStore("users")
  return usersStore.users.find((user) => user.id === id) ?? null
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<StoredUser, "name" | "email" | "bio" | "institution" | "role" | "website" | "orcid">>,
) {
  const usersStore = await readStore("users")
  const index = usersStore.users.findIndex((user) => user.id === userId)
  if (index < 0) {
    throw new Error("User not found.")
  }

  const normalizedEmail = updates.email
    ? updates.email.trim().toLowerCase()
    : usersStore.users[index].email

  const emailChanged = normalizedEmail !== usersStore.users[index].email
  if (emailChanged && usersStore.users.some((user, idx) => idx !== index && user.email === normalizedEmail)) {
    throw new Error("That email is already in use.")
  }

  const updatedUser: StoredUser = {
    ...usersStore.users[index],
    ...updates,
    email: normalizedEmail,
    name: (updates.name ?? usersStore.users[index].name).trim() || usersStore.users[index].name,
    bio: updates.bio ?? usersStore.users[index].bio,
    institution: updates.institution ?? usersStore.users[index].institution,
    role: updates.role ?? usersStore.users[index].role,
    website: updates.website ?? usersStore.users[index].website,
    orcid: updates.orcid ?? usersStore.users[index].orcid,
  }

  usersStore.users[index] = updatedUser
  await writeStore("users", usersStore)

  const token = createSessionToken({ userId: updatedUser.id, email: updatedUser.email })
  return { user: sanitizeUser(updatedUser), token }
}

export { AUTH_COOKIE_NAME } from "@/lib/constants"
