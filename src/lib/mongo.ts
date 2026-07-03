import { MongoClient, type Db, type Document } from "mongodb"

const dbName = process.env.MONGODB_DB || "research-sphere"

function resolveMongoUri() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment.")
  }

  const hosts = process.env.MONGODB_HOSTS
  if (!hosts || !uri.startsWith("mongodb+srv://")) {
    return uri
  }

  const parsed = new URL(uri)
  const replicaSet = process.env.MONGODB_REPLICA_SET
  const params = new URLSearchParams(parsed.searchParams)
  params.set("tls", "true")
  params.set("authSource", "admin")
  if (replicaSet) {
    params.set("replicaSet", replicaSet)
  }

  const credentials = parsed.password
    ? `${parsed.username}:${parsed.password}@`
    : parsed.username
      ? `${parsed.username}@`
      : ""

  return `mongodb://${credentials}${hosts}/${encodeURIComponent(dbName)}?${params.toString()}`
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

const getClientPromise = () => {
  if (!global._mongoClientPromise) {
    const uri = resolveMongoUri()
    const client = new MongoClient(uri)
    global._mongoClientPromise = client.connect()
  }
  return global._mongoClientPromise
}

export async function getMongoClient() {
  return getClientPromise()
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient()
  return client.db(dbName)
}

export async function getCollection<T extends Document>(name: string) {
  const db = await getDb()
  return db.collection<T>(name)
}
