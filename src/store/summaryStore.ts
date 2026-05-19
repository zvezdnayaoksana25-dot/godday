import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import type { StateCreator } from "zustand"
import type { DaySummary, PeriodSummary, Task, DayPlan } from "@/types"
import type { StoreState } from "./useStore"

export interface SummaryStore {
  dailySummaries: Record<string, DaySummary>
  weeklySummaries: Record<string, PeriodSummary>
  monthlySummaries: Record<string, PeriodSummary>
  aiStats: string | null
  aiStatsGeneratedAt: string | null
  saveDailySummary: (date: string, summary: DaySummary) => void
  saveWeeklySummary: (period: string, summary: PeriodSummary) => void
  saveMonthlySummary: (period: string, summary: PeriodSummary) => void
  saveAIStats: (stats: string) => void
  getWeekKey: (date: Date) => string
  getMonthKey: (date: Date) => string
  getLastSummarizedDay: () => string | null
  getLastSummarizedWeek: () => string | null
  getLastSummarizedMonth: () => string | null
  getDayTasksData: (date: string, tasks: Task[], dayPlans: Record<string, DayPlan>) => { total: number; completed: number; plan: DayPlan | undefined }
}

export const createSummaryStore: StateCreator<StoreState, [], [], SummaryStore> = (set, get) => ({
  dailySummaries: {},
  weeklySummaries: {},
  monthlySummaries: {},
  aiStats: null,
  aiStatsGeneratedAt: null,

  saveDailySummary: (date, summary) => {
    set((state) => ({
      dailySummaries: { ...state.dailySummaries, [date]: summary },
    }))
  },

  saveWeeklySummary: (period, summary) => {
    set((state) => ({
      weeklySummaries: { ...state.weeklySummaries, [period]: summary },
    }))
  },

  saveMonthlySummary: (period, summary) => {
    set((state) => ({
      monthlySummaries: { ...state.monthlySummaries, [period]: summary },
    }))
  },

  saveAIStats: (stats) => {
    set({
      aiStats: stats,
      aiStatsGeneratedAt: new Date().toISOString(),
    })
  },

  getWeekKey: (date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    return format(start, "yyyy-MM-dd")
  },

  getMonthKey: (date) => {
    return format(date, "yyyy-MM")
  },

  getLastSummarizedDay: () => {
    const summaries = get().dailySummaries || {}
    const keys = Object.keys(summaries).sort()
    return keys.length > 0 ? keys[keys.length - 1] : null
  },

  getLastSummarizedWeek: () => {
    const summaries = get().weeklySummaries || {}
    const keys = Object.keys(summaries).sort()
    return keys.length > 0 ? keys[keys.length - 1] : null
  },

  getLastSummarizedMonth: () => {
    const summaries = get().monthlySummaries || {}
    const keys = Object.keys(summaries).sort()
    return keys.length > 0 ? keys[keys.length - 1] : null
  },

  getDayTasksData: (date, tasks, dayPlans) => {
    const dayTasks = (tasks || []).filter((t) => t.dueDate === date)
    const completed = dayTasks.filter((t) => t.status === "done").length
    return {
      total: dayTasks.length,
      completed,
      plan: dayPlans?.[date],
    }
  },
})
