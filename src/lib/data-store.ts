import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { CollaboratorInvite, SavedPaper, StoredDocument, StoredUser } from "@/types"

type DataFile = "users" | "appData"

type StoreShape = {
  users: { users: StoredUser[] }
  appData: { documents: StoredDocument[]; savedPapers: SavedPaper[]; collaboratorInvites: CollaboratorInvite[] }
}

const defaultData: StoreShape = {
  users: { users: [] },
  appData: { documents: [], savedPapers: [], collaboratorInvites: [] },
}

const dataDirectory = path.join(process.cwd(), "data")

async function ensureDataFile(file: DataFile) {
  await mkdir(dataDirectory, { recursive: true })
  const filePath = path.join(dataDirectory, `${file}.json`)
  try {
    await access(filePath)
  } catch {
    await writeFile(filePath, JSON.stringify(defaultData[file], null, 2), "utf8")
  }
  return filePath
}

export async function readStore<T extends DataFile>(file: T): Promise<StoreShape[T]> {
  const filePath = await ensureDataFile(file)
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw) as StoreShape[T]
  } catch (error) {
    console.error(`Failed to read ${file} store`, error)
    return structuredClone(defaultData[file]) as StoreShape[T]
  }
}

export async function writeStore<T extends DataFile>(file: T, data: StoreShape[T]) {
  const filePath = await ensureDataFile(file)
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8")
}
