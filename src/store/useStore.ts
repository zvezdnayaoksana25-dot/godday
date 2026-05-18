import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { createTaskStore, type TaskStore } from "./taskStore"
import { createDayStore, type DayStore } from "./dayStore"
import { createPatternStore, type PatternStore } from "./patternStore"
import { createSettingsStore, type SettingsStore } from "./settingsStore"
import { createAIStore, type AIStore } from "./aiStore"
import { indexedDBStorage } from "@/lib/storage"

export type StoreState = TaskStore & DayStore & PatternStore & SettingsStore & AIStore

export const useStore = create<StoreState>()(
  persist(
    (set, get, api) => ({
      ...createTaskStore(set, get, api),
      ...createDayStore(set, get, api),
      ...createPatternStore(set, get, api),
      ...createSettingsStore(set, get, api),
      ...createAIStore(set, get, api),
    }),
    {
      name: "flowday-data",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
)
