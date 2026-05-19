import type { StateCreator } from "zustand"
import type { MorningSession, DayPlanTask, EnergyLevel } from "@/types"
import type { StoreState } from "./useStore"

const defaultSession: MorningSession = {
  step: "sleep",
  sleepScore: 5,
  sleepTime: "23:00",
  wakeTime: "07:00",
  energyLevel: "medium",
  motivationScore: 5,
  voiceNotes: "",
  focusOfTheDay: "",
  yesterdayTaskDecisions: {},
  aiPlan: [],
  aiGreeting: "",
  aiCommentary: "",
  aiEncouragement: "",
  isLoading: false,
  error: null,
}

export interface AIStore {
  morningSession: MorningSession
  setMorningStep: (step: MorningSession["step"]) => void
  setSleepScore: (score: number) => void
  setSleepTime: (time: string) => void
  setWakeTime: (time: string) => void
  setEnergyLevel: (level: EnergyLevel) => void
  setMotivationScore: (score: number) => void
  setVoiceNotes: (notes: string) => void
  setFocusOfTheDay: (focus: string) => void
  setYesterdayTaskDecisions: (decisions: Record<string, "move" | "delete" | "later">) => void
  setAIPlan: (plan: DayPlanTask[], greeting: string, commentary: string, encouragement: string) => void
  setAILoading: (loading: boolean) => void
  setAIError: (error: string | null) => void
  resetMorningSession: () => void
}

export const createAIStore: StateCreator<StoreState, [], [], AIStore> = (set) => ({
  morningSession: defaultSession,

  setMorningStep: (step) => {
    set((state) => ({
      morningSession: { ...state.morningSession, step },
    }))
  },

  setSleepScore: (score) => {
    set((state) => ({
      morningSession: { ...state.morningSession, sleepScore: score },
    }))
  },

  setSleepTime: (time) => {
    set((state) => ({
      morningSession: { ...state.morningSession, sleepTime: time },
    }))
  },

  setWakeTime: (time) => {
    set((state) => ({
      morningSession: { ...state.morningSession, wakeTime: time },
    }))
  },

  setEnergyLevel: (level) => {
    set((state) => ({
      morningSession: { ...state.morningSession, energyLevel: level },
    }))
  },

  setMotivationScore: (score) => {
    set((state) => ({
      morningSession: { ...state.morningSession, motivationScore: score },
    }))
  },

  setVoiceNotes: (notes) => {
    set((state) => ({
      morningSession: { ...state.morningSession, voiceNotes: notes },
    }))
  },

  setFocusOfTheDay: (focus) => {
    set((state) => ({
      morningSession: { ...state.morningSession, focusOfTheDay: focus },
    }))
  },

  setYesterdayTaskDecisions: (decisions) => {
    set((state) => ({
      morningSession: { ...state.morningSession, yesterdayTaskDecisions: decisions },
    }))
  },

  setAIPlan: (plan, greeting, commentary, encouragement) => {
    set((state) => ({
      morningSession: {
        ...state.morningSession,
        aiPlan: plan,
        aiGreeting: greeting,
        aiCommentary: commentary,
        aiEncouragement: encouragement,
      },
    }))
  },

  setAILoading: (loading) => {
    set((state) => ({
      morningSession: { ...state.morningSession, isLoading: loading },
    }))
  },

  setAIError: (error) => {
    set((state) => ({
      morningSession: { ...state.morningSession, error },
    }))
  },

  resetMorningSession: () => {
    set({ morningSession: defaultSession })
  },
})
