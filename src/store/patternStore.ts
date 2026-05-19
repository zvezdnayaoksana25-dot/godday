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
  recalcPatternsFromTasks: () => void
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

      const allDays = new Set([...p.motivationHistory.map((m) => m.date), ...p.sleepHistory.map((s) => s.date), today])
      const totalTasksAllTime = state.tasks.reduce((sum, t) => {
        if (allDays.has(t.dueDate || "")) return sum + 1
        return sum
      }, 0)
      const newAvgTasks = allDays.size > 0 ? Math.round((totalTasksAllTime / allDays.size) * 10) / 10 : p.avgTasksPerDay

      return {
        patterns: {
          ...p,
          avgCompletionRate: newAvgRate,
          avgTasksPerDay: newAvgTasks,
          motivationHistory: newMotivation,
          sleepHistory: newSleep,
          frequentlyPostponedCategories: frequentlyPostponed,
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  recalcPatternsFromTasks: () => {
    set((state) => {
      const p = state.patterns
      const tasksByDate: Record<string, number> = {}
      state.tasks.forEach((t) => {
        if (t.dueDate) {
          tasksByDate[t.dueDate] = (tasksByDate[t.dueDate] || 0) + 1
        }
      })
      const dates = Object.keys(tasksByDate)
      if (dates.length === 0) return state

      const totalTasks = dates.reduce((sum, d) => sum + tasksByDate[d], 0)
      const newAvgTasks = Math.round((totalTasks / dates.length) * 10) / 10

      const completedByDate: Record<string, number> = {}
      state.tasks.forEach((t) => {
        if (t.dueDate && t.status === "done") {
          completedByDate[t.dueDate] = (completedByDate[t.dueDate] || 0) + 1
        }
      })

      let newAvgRate = p.avgCompletionRate
      if (dates.length > 0) {
        let totalRate = 0
        let count = 0
        dates.forEach((d) => {
          if (tasksByDate[d] > 0) {
            totalRate += (completedByDate[d] || 0) / tasksByDate[d]
            count++
          }
        })
        if (count > 0) {
          newAvgRate = totalRate / count
        }
      }

      return {
        patterns: {
          ...p,
          avgTasksPerDay: newAvgTasks,
          avgCompletionRate: newAvgRate,
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
