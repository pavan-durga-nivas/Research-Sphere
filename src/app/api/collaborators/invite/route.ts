import { NextResponse } from "next/server"
import { getSessionUser, getUserById } from "@/lib/auth"
import { addCollaboratorInvite, setCollaboratorAccess } from "@/lib/app-data"

interface InviteRequest {
  email?: string
  accountId?: string
  documentId: string
  documentTitle?: string
  shareUrl?: string
  permission?: "view" | "edit"
}

async function sendEmailInvite(params: { email: string; fromName: string; documentTitle: string; link: string }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      delivered: false,
      message: "Configure RESEND_API_KEY to enable email delivery.",
    }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "ResearchSphere <noreply@research-sphere.app>",
      to: params.email,
      subject: `${params.fromName} invited you to collaborate`,
      html: `<p>${params.fromName} invited you to collaborate on <strong>${params.documentTitle}</strong>.</p><p><a href="${params.link}">Open document</a></p>`,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    return { delivered: false, message: text || "Resend request failed." }
  }

  return { delivered: true, message: "Email dispatched via Resend." }
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as InviteRequest
  if (!body.documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 })
  }

  const permission = body.permission === "view" ? "view" : "edit"

  let inviteEmail = body.email?.trim().toLowerCase()
  let inviteeId: string | undefined

  if (!inviteEmail && body.accountId) {
    const target = await getUserById(body.accountId.trim())
    if (!target) {
      return NextResponse.json({ error: "Account ID not found." }, { status: 404 })
    }
    inviteeId = target.id
    inviteEmail = target.email
  }

  if (!inviteEmail) {
    return NextResponse.json({ error: "Email or accountId is required." }, { status: 400 })
  }

  const shareUrl =
    body.shareUrl ||
    `${process.env.APP_URL ?? "http://localhost:3000"}/editor?doc=${encodeURIComponent(body.documentId)}`

  const emailResult = await sendEmailInvite({
    email: inviteEmail,
    fromName: user.name,
    documentTitle: body.documentTitle ?? "Research document",
    link: shareUrl,
  })

  const invite = await addCollaboratorInvite({
    documentId: body.documentId,
    inviterId: user.id,
    inviteeEmail: inviteEmail,
    inviteeId,
    permission,
    status: emailResult.delivered ? "sent" : "pending",
    deliveryMessage: emailResult.message,
  })

  await setCollaboratorAccess({
    documentId: body.documentId,
    userId: inviteeId,
    email: inviteEmail,
    permission,
  })

  return NextResponse.json({
    invite,
    delivery: emailResult,
    invitee: inviteeId ? { id: inviteeId, email: inviteEmail } : undefined,
  })
}
