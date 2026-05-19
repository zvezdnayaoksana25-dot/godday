import type { StateCreator } from "zustand"
import type { MorningSession, DayPlanTask } from "@/types"
import type { StoreState } from "./useStore"

const defaultSession: MorningSession = {
  step: "sleep",
  sleepScore: 5,
  motivationScore: 5,
  voiceNotes: "",
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
  setMotivationScore: (score: number) => void
  setVoiceNotes: (notes: string) => void
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
