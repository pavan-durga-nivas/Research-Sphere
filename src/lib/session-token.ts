import { createHmac, timingSafeEqual } from "node:crypto"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days
const SECRET = process.env.AUTH_SECRET || "research-sphere-dev-secret"

type JwtHeader = { alg: "HS256"; typ: "JWT" }

export interface SessionPayload {
  userId: string
  email: string
  exp: number
}

const base64UrlEncode = (input: string) =>
  Buffer.from(input).toString("base64url")

const base64UrlDecode = (input: string) =>
  Buffer.from(input, "base64url").toString("utf8")

const sign = (data: string) =>
  createHmac("sha256", SECRET).update(data).digest("base64url")

export function createSessionToken(payload: Omit<SessionPayload, "exp">, ttl = SESSION_TTL_SECONDS) {
  const header: JwtHeader = { alg: "HS256", typ: "JWT" }
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttl,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = sign(unsignedToken)
  return `${unsignedToken}.${signature}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split(".")
    if (!encodedHeader || !encodedPayload || !signature) {
      return null
    }

    const unsignedToken = `${encodedHeader}.${encodedPayload}`
    const expectedSignature = sign(unsignedToken)
    const isValid =
      expectedSignature.length === signature.length &&
      timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))

    if (!isValid) {
      return null
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export { SESSION_TTL_SECONDS }
