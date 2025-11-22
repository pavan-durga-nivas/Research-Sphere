import { requireSessionUser } from "@/lib/auth"
import ProfileClient from "./profile-client"

export default async function ProfilePage() {
  const user = await requireSessionUser()

  return <ProfileClient initialUser={user} />
}
