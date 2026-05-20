import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { createTaskStore, type TaskStore } from "./taskStore"
import { createDayStore, type DayStore } from "./dayStore"
import { createPatternStore, type PatternStore } from "./patternStore"
import { createSettingsStore, type SettingsStore } from "./settingsStore"
import { createAIStore, type AIStore } from "./aiStore"
import { createSummaryStore, type SummaryStore } from "./summaryStore"
import { createMemoryStore, type MemoryStore } from "./memoryStore"
import { createDiaryStore, type DiaryStore } from "./diaryStore"
import { indexedDBStorage } from "@/lib/storage"

export type StoreState = TaskStore & DayStore & PatternStore & SettingsStore & AIStore & SummaryStore & MemoryStore & DiaryStore

export const useStore = create<StoreState>()(
  persist(
    (set, get, api) => ({
      ...createTaskStore(set, get, api),
      ...createDayStore(set, get, api),
      ...createPatternStore(set, get, api),
      ...createSettingsStore(set, get, api),
      ...createAIStore(set, get, api),
      ...createSummaryStore(set, get, api),
      ...createMemoryStore(set, get, api),
      ...createDiaryStore(set, get, api),
    }),
    {
      name: "flowday-data",
      storage: createJSONStorage(() => indexedDBStorage),
      version: 3,
      migrate: (persistedState: any, version: number) => {
        if (version < 3 && persistedState?.state) {
          const s = persistedState.state
          if (!s.tasks) s.tasks = []
          if (!s.dayPlans) s.dayPlans = {}
          if (!s.conversationHistory) s.conversationHistory = {}
          if (!s.dailySummaries) s.dailySummaries = {}
          if (!s.weeklySummaries) s.weeklySummaries = {}
          if (!s.monthlySummaries) s.monthlySummaries = {}
          if (!s.diaryEntries) s.diaryEntries = []
          if (s.patterns) {
            const p = s.patterns
            if (!p.energyHistory) p.energyHistory = []
            if (!p.avgSleepDuration) p.avgSleepDuration = 8
            if (!p.motivationHistory) p.motivationHistory = []
            if (!p.sleepHistory) p.sleepHistory = []
            if (!p.frequentlyPostponedCategories) p.frequentlyPostponedCategories = []
          }
          if (!s.semanticMemory) {
            s.semanticMemory = { facts: [], goals: [], preferences: [], projects: [], lastUpdated: new Date().toISOString() }
          } else {
            const sm = s.semanticMemory
            if (!sm.facts) sm.facts = []
            if (!sm.goals) sm.goals = []
            if (!sm.preferences) sm.preferences = []
            if (!sm.projects) sm.projects = []
          }
          if (!s.morningSession) {
            s.morningSession = { step: "sleep", sleepScore: 5, sleepTime: "23:00", wakeTime: "07:00", energyLevel: "medium", motivationScore: 5, voiceNotes: "", focusOfTheDay: "", yesterdayTaskDecisions: {}, aiPlan: [], aiGreeting: "", aiCommentary: "", aiEncouragement: "", isLoading: false, error: null }
          } else {
            const ms = s.morningSession
            if (!ms.step) ms.step = "sleep"
            if (!ms.sleepTime) ms.sleepTime = "23:00"
            if (!ms.wakeTime) ms.wakeTime = "07:00"
            if (!ms.energyLevel) ms.energyLevel = "medium"
            if (ms.sleepScore == null) ms.sleepScore = 5
            if (ms.motivationScore == null) ms.motivationScore = 5
            if (!ms.voiceNotes) ms.voiceNotes = ""
            if (!ms.focusOfTheDay) ms.focusOfTheDay = ""
            if (!ms.yesterdayTaskDecisions) ms.yesterdayTaskDecisions = {}
            if (!ms.aiPlan) ms.aiPlan = []
            if (!ms.aiGreeting) ms.aiGreeting = ""
            if (!ms.aiCommentary) ms.aiCommentary = ""
            if (!ms.aiEncouragement) ms.aiEncouragement = ""
          }
          if (!s.patterns) {
            s.patterns = { avgStartTime: 9, avgTasksPerDay: 5, avgCompletionRate: 0.6, avgSleepDuration: 8, frequentlyPostponedCategories: [], motivationHistory: [], sleepHistory: [], energyHistory: [], lastUpdated: new Date().toISOString() }
          }
        }
        return persistedState
      },
    },
  ),
)
