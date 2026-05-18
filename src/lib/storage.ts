import { openDB, type DBSchema } from "idb"

const DB_NAME = "flowday-db"
const STORE_NAME = "kv"
const KEY = "flowday-state"

interface FlowDayDB extends DBSchema {
  kv: {
    key: string
    value: string
  }
}

let dbPromise: ReturnType<typeof openDB<FlowDayDB>> | null = null

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<FlowDayDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME)
      },
    })
  }
  return dbPromise
}

export const indexedDBStorage = {
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const db = await getDB()
      return (await db.get(STORE_NAME, KEY)) || null
    } catch {
      return null
    }
  },

  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      const db = await getDB()
      await db.put(STORE_NAME, value, KEY)
    } catch (e) {
      console.error("IndexedDB write error", e)
    }
  },

  removeItem: async (_name: string): Promise<void> => {
    try {
      const db = await getDB()
      await db.delete(STORE_NAME, KEY)
    } catch (e) {
      console.error("IndexedDB delete error", e)
    }
  },
}

export async function exportData(): Promise<string | null> {
  try {
    const db = await getDB()
    return (await db.get(STORE_NAME, KEY)) || null
  } catch {
    return null
  }
}

export async function importData(data: string): Promise<void> {
  try {
    const db = await getDB()
    await db.put(STORE_NAME, data, KEY)
    window.location.reload()
  } catch (e) {
    console.error("Import error", e)
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const db = await getDB()
    await db.clear(STORE_NAME)
    window.location.reload()
  } catch (e) {
    console.error("Clear error", e)
  }
}
