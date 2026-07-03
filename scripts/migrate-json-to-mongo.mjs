import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MongoClient } from "mongodb"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, "..")

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("Missing MONGODB_URI in environment.")
  process.exit(1)
}
const dbName = process.env.MONGODB_DB || "Research-sphere"

async function loadJson(relativePath, fallback) {
  try {
    const raw = await readFile(path.join(rootDir, relativePath), "utf8")
    return JSON.parse(raw)
  } catch (error) {
    console.warn(`Could not read ${relativePath}, using fallback.`, error)
    return fallback
  }
}

async function upsertMany(collection, items, key = "id") {
  if (!items || items.length === 0) return { matchedCount: 0, upsertedCount: 0 }
  const operations = items.map((item) => ({
    updateOne: {
      filter: { [key]: item[key] },
      update: { $set: item },
      upsert: true,
    },
  }))
  return collection.bulkWrite(operations)
}

async function main() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  console.log(`Connected to MongoDB database: ${dbName}`)
  
  const usersJson = await loadJson("data/users.json", { users: [] })
  const appDataJson = await loadJson("data/appData.json", {
    documents: [],
    savedPapers: [],
    collaboratorInvites: [],
    collaboratorAccess: [],
  })

  const users = db.collection("users")
  const documents = db.collection("documents")
  const savedPapers = db.collection("savedPapers")
  const collaboratorInvites = db.collection("collaboratorInvites")
  const collaboratorAccess = db.collection("collaboratorAccess")

  const userResult = await upsertMany(users, usersJson.users ?? [], "id")
  const docResult = await upsertMany(documents, appDataJson.documents ?? [], "id")
  const paperResult = await upsertMany(savedPapers, appDataJson.savedPapers ?? [], "id")
  const inviteResult = await upsertMany(collaboratorInvites, appDataJson.collaboratorInvites ?? [], "id")
  const accessResult = await upsertMany(collaboratorAccess, appDataJson.collaboratorAccess ?? [], "id")

  console.log("Migration complete:")
  console.log(`  Users upserted/matched: ${userResult.upsertedCount}/${userResult.matchedCount}`)
  console.log(`  Documents upserted/matched: ${docResult.upsertedCount}/${docResult.matchedCount}`)
  console.log(`  Saved papers upserted/matched: ${paperResult.upsertedCount}/${paperResult.matchedCount}`)
  console.log(`  Invites upserted/matched: ${inviteResult.upsertedCount}/${inviteResult.matchedCount}`)
  console.log(`  Collaborator access upserted/matched: ${accessResult.upsertedCount}/${accessResult.matchedCount}`)

  await client.close()
}

main().catch((error) => {
  console.error("Migration failed", error)
  process.exit(1)
})
