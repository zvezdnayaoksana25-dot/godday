import { format } from "date-fns"
import type { StateCreator } from "zustand"
import type { DayPlan } from "@/types"
import type { StoreState } from "./useStore"

export interface DayStore {
  dayPlans: Record<string, DayPlan>
  saveDayPlan: (plan: DayPlan) => void
  getDayPlan: (date: string) => DayPlan | undefined
  getTodayPlan: () => DayPlan | undefined
  markDayComplete: (date: string) => void
  hasMorningRoutine: (date: string) => boolean
}

const getTodayString = () => format(new Date(), "yyyy-MM-dd")

export const createDayStore: StateCreator<StoreState, [], [], DayStore> = (set, get) => ({
  dayPlans: {},

  saveDayPlan: (plan) => {
    set((state) => ({
      dayPlans: { ...state.dayPlans, [plan.date]: plan },
    }))
  },

  getDayPlan: (date) => {
    return get().dayPlans[date]
  },

  getTodayPlan: () => {
    return get().dayPlans[getTodayString()]
  },

  markDayComplete: (date) => {
    set((state) => {
      const plan = state.dayPlans[date]
      if (!plan) return state
      return {
        dayPlans: {
          ...state.dayPlans,
          [date]: { ...plan, completed: true },
        },
      }
    })
  },

  hasMorningRoutine: (date) => {
    return !!get().dayPlans[date]
  },
})
