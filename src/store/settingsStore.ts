import type { StateCreator } from "zustand"
import type { Settings } from "@/types"
import type { StoreState } from "./useStore"

const defaultSettings: Settings = {
  name: "",
  groqApiKey: "",
  telegramBotToken: "",
  telegramChatId: "",
  theme: "light",
  language: "ru",
}

export interface SettingsStore {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  getDisplayName: () => string
}

export const createSettingsStore: StateCreator<StoreState, [], [], SettingsStore> = (set, get) => ({
  settings: defaultSettings,

  updateSettings: (updates) => {
    set((state) => ({
      settings: { ...state.settings, ...updates },
    }))
  },

  getDisplayName: () => {
    const name = get().settings.name
    return name || "друг"
  },
})
