import type { SessionUser } from "@/types"

export const DEV_LOGIN_EMAIL = "demo@research-sphere.local"
export const DEV_LOGIN_PASSWORD = "research-demo"
export const DEV_LOGIN_USER_ID = "local-development-user"

export const DEV_LOGIN_USER: SessionUser = {
  id: DEV_LOGIN_USER_ID,
  name: "Local Demo User",
  email: DEV_LOGIN_EMAIL,
  createdAt: "2025-01-01T00:00:00.000Z",
  role: "Researcher",
}

export const isDevLoginEnabled = () => process.env.NODE_ENV !== "production"
