import type { StateCreator } from "zustand"
import type { DiaryEntry } from "@/types"
import type { StoreState } from "./useStore"

const DIARY_BACKUP_KEY = "flowday-diary-backup"

const saveToLocalStorage = (entries: DiaryEntry[]) => {
  try {
    localStorage.setItem(DIARY_BACKUP_KEY, JSON.stringify(entries))
  } catch {}
}

const loadFromLocalStorage = (): DiaryEntry[] => {
  try {
    const raw = localStorage.getItem(DIARY_BACKUP_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export interface DiaryStore {
  diaryEntries: DiaryEntry[]
  saveDiaryEntry: (entry: DiaryEntry) => void
  getEntriesByDate: (date: string) => DiaryEntry[]
  getAllEntries: () => DiaryEntry[]
  getEntriesByDateRange: (start: string, end: string) => DiaryEntry[]
  deleteDiaryEntry: (id: string) => void
  restoreFromBackup: () => void
  getDiaryEntriesForPeriod: (period: string) => string
}

export const createDiaryStore: StateCreator<StoreState, [], [], DiaryStore> = (set, get) => ({
  diaryEntries: [],

  saveDiaryEntry: (entry) => {
    set((state) => {
      const updated = [...state.diaryEntries, entry]
      saveToLocalStorage(updated)
      return { diaryEntries: updated }
    })
  },

  getEntriesByDate: (date) => {
    return get().diaryEntries.filter((e) => e.date === date)
  },

  getAllEntries: () => {
    return get().diaryEntries
  },

  getEntriesByDateRange: (start, end) => {
    return get().diaryEntries.filter((e) => e.date >= start && e.date <= end)
  },

  deleteDiaryEntry: (id) => {
    set((state) => {
      const updated = state.diaryEntries.filter((e) => e.id !== id)
      saveToLocalStorage(updated)
      return { diaryEntries: updated }
    })
  },

  restoreFromBackup: () => {
    const backup = loadFromLocalStorage()
    if (backup.length > 0) {
      set({ diaryEntries: backup })
    }
  },

  getDiaryEntriesForPeriod: (period) => {
    const entries = get().diaryEntries.filter((e) => e.date.startsWith(period))
    if (entries.length === 0) return "нет записей в дневнике"
    return entries
      .map((e) => `${e.date}${e.mood ? ` (настроение: ${e.mood}/5)` : ""}: ${e.content}`)
      .join("\n\n")
  },
})
