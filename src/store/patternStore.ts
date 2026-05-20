import { format } from "date-fns"
import type { StateCreator } from "zustand"
import type { Patterns, Category, EnergyLevel } from "@/types"
import type { StoreState } from "./useStore"

const defaultPatterns: Patterns = {
  avgStartTime: 9,
  avgTasksPerDay: 5,
  avgCompletionRate: 0.6,
  avgSleepDuration: 8,
  frequentlyPostponedCategories: [],
  frequentlyPostponedTasks: [],
  taskMoveHistory: [],
  motivationHistory: [],
  sleepHistory: [],
  energyHistory: [],
  lastUpdated: new Date().toISOString(),
}

export interface PatternStore {
  patterns: Patterns
  recordDayData: (sleepScore: number, sleepTime: string, wakeTime: string, energyLevel: EnergyLevel, motivationScore: number, tasksTotal: number, tasksCompleted: number, postponedCategories: Category[]) => void
  recalcPatternsFromTasks: () => void
  getPatternsSummary: () => string
}

function calcSleepDuration(sleepTime: string, wakeTime: string): number {
  const [sh, sm] = (sleepTime || "23:00").split(":").map(Number)
  const [wh, wm] = (wakeTime || "07:00").split(":").map(Number)
  let sleepMin = sh * 60 + sm
  let wakeMin = wh * 60 + wm
  if (wakeMin <= sleepMin) wakeMin += 24 * 60
  return (wakeMin - sleepMin) / 60
}

export const createPatternStore: StateCreator<StoreState, [], [], PatternStore> = (set, get) => ({
  patterns: defaultPatterns,

  recordDayData: (sleepScore, sleepTime, wakeTime, energyLevel, motivationScore, tasksTotal, tasksCompleted, postponedCategories) => {
    set((state) => {
      const p = state.patterns
      const today = format(new Date(), "yyyy-MM-dd")
      const motivationHistory = p.motivationHistory || []
      const sleepHistory = p.sleepHistory || []
      const energyHistory = p.energyHistory || []
      const frequentlyPostponedCategories = p.frequentlyPostponedCategories || []
      const duration = calcSleepDuration(sleepTime, wakeTime)
      const newMotivation = [...motivationHistory, { date: today, score: motivationScore }].slice(-30)
      const newSleep = [...sleepHistory, { date: today, score: sleepScore, duration, sleepTime, wakeTime }].slice(-30)
      const newEnergy = [...energyHistory, { date: today, level: energyLevel }].slice(-30)

      const completionRate = tasksTotal > 0 ? tasksCompleted / tasksTotal : 0
      const newAvgRate = p.avgCompletionRate * 0.7 + completionRate * 0.3

      const oldAvgDuration = p.avgSleepDuration
      const newAvgDuration = sleepHistory.length > 0
        ? oldAvgDuration * 0.7 + duration * 0.3
        : duration

      const categoryCount: Record<string, number> = {}
      postponedCategories.forEach((c) => {
        categoryCount[c] = (categoryCount[c] || 0) + 1
      })
      const frequentlyPostponed = Object.entries(categoryCount)
        .filter(([, count]) => count >= 2)
        .map(([cat]) => cat as Category)

      const allDays = new Set([...motivationHistory.map((m) => m.date), ...sleepHistory.map((s) => s.date), today])
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
          avgSleepDuration: newAvgDuration,
          motivationHistory: newMotivation,
          sleepHistory: newSleep,
          energyHistory: newEnergy,
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
          frequentlyPostponedTasks: p.frequentlyPostponedTasks || [],
          taskMoveHistory: p.taskMoveHistory || [],
        },
      }
    })
  },

  getPatternsSummary: () => {
    const p = get().patterns
    const motivationHistory = p.motivationHistory || []
    const sleepHistory = p.sleepHistory || []
    const energyHistory = p.energyHistory || []
    const frequentlyPostponedCategories = p.frequentlyPostponedCategories || []
    const frequentlyPostponedTasks = p.frequentlyPostponedTasks || []
    const taskMoveHistory = p.taskMoveHistory || []

    const avgMotivation =
      motivationHistory.length > 0
        ? motivationHistory.reduce((sum, m) => sum + m.score, 0) / motivationHistory.length
        : 5
    const avgSleep =
      sleepHistory.length > 0
        ? sleepHistory.reduce((sum, s) => sum + s.score, 0) / sleepHistory.length
        : 5
    const avgDuration =
      sleepHistory.length > 0
        ? sleepHistory.reduce((sum, s) => sum + s.duration, 0) / sleepHistory.length
        : (p.avgSleepDuration || 8)

    const energyCounts = { low: 0, medium: 0, high: 0 }
    energyHistory.forEach((e) => { energyCounts[e.level]++ })
    const totalEnergy = energyHistory.length || 1
    const energySummary = energyCounts.high > energyCounts.low
      ? "чаще полна энергии"
      : energyCounts.low > energyCounts.high
        ? "чаще чувствуешь разбитость"
        : "энергия обычно в норме"

    const avgCompletionRate = p.avgCompletionRate ?? 0
    const avgTasksPerDay = p.avgTasksPerDay ?? 0

    const postponedTasksStr = frequentlyPostponedTasks
      .filter((t) => t.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((t) => `${t.title} (${t.count}x)`)
      .join(", ") || "нет"

    const recentMoves = taskMoveHistory
      .slice(-10)
      .map((m) => `${m.title}: ${m.from} → ${m.to} (${m.reason})`)
      .join("; ") || "нет"

    return `Средняя мотивация: ${avgMotivation.toFixed(1)}/10. Средний сон: ${avgSleep.toFixed(1)}/10. Средняя длительность сна: ${avgDuration.toFixed(1)}ч. ${energySummary}. Средний процент выполнения: ${(avgCompletionRate * 100).toFixed(0)}%. Обычно делаешь около ${avgTasksPerDay} задач в день. Часто переносимые категории: ${frequentlyPostponedCategories.join(", ") || "нет"}. Часто переносимые задачи: ${postponedTasksStr}. Последние переносы: ${recentMoves}.`
  },
})
