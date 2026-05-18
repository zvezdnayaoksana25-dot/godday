import { format } from "date-fns"
import type { StateCreator } from "zustand"
import type { Patterns, Category } from "@/types"
import type { StoreState } from "./useStore"

const defaultPatterns: Patterns = {
  avgStartTime: 9,
  avgTasksPerDay: 5,
  avgCompletionRate: 0.6,
  frequentlyPostponedCategories: [],
  motivationHistory: [],
  sleepHistory: [],
  lastUpdated: new Date().toISOString(),
}

export interface PatternStore {
  patterns: Patterns
  recordDayData: (sleepScore: number, motivationScore: number, tasksTotal: number, tasksCompleted: number, postponedCategories: Category[]) => void
  getPatternsSummary: () => string
}

export const createPatternStore: StateCreator<StoreState, [], [], PatternStore> = (set, get) => ({
  patterns: defaultPatterns,

  recordDayData: (sleepScore, motivationScore, tasksTotal, tasksCompleted, postponedCategories) => {
    set((state) => {
      const p = state.patterns
      const today = format(new Date(), "yyyy-MM-dd")
      const newMotivation = [...p.motivationHistory, { date: today, score: motivationScore }].slice(-30)
      const newSleep = [...p.sleepHistory, { date: today, score: sleepScore }].slice(-30)

      const completionRate = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0
      const newAvgRate = p.avgCompletionRate * 0.7 + completionRate * 0.3

      const categoryCount: Record<string, number> = {}
      postponedCategories.forEach((c) => {
        categoryCount[c] = (categoryCount[c] || 0) + 1
      })
      const frequentlyPostponed = Object.entries(categoryCount)
        .filter(([, count]) => count >= 2)
        .map(([cat]) => cat as Category)

      return {
        patterns: {
          ...p,
          avgCompletionRate: newAvgRate,
          motivationHistory: newMotivation,
          sleepHistory: newSleep,
          frequentlyPostponedCategories: frequentlyPostponed,
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  getPatternsSummary: () => {
    const p = get().patterns
    const avgMotivation =
      p.motivationHistory.length > 0
        ? p.motivationHistory.reduce((sum, m) => sum + m.score, 0) / p.motivationHistory.length
        : 5
    const avgSleep =
      p.sleepHistory.length > 0
        ? p.sleepHistory.reduce((sum, s) => sum + s.score, 0) / p.sleepHistory.length
        : 5

    return `Средняя мотивация: ${avgMotivation.toFixed(1)}/10. Средний сон: ${avgSleep.toFixed(1)}/10. Средний процент выполнения: ${(p.avgCompletionRate * 100).toFixed(0)}%. Обычно делаешь около ${p.avgTasksPerDay} задач в день. Часто переносимые категории: ${p.frequentlyPostponedCategories.join(", ") || "нет"}.`
  },
})
