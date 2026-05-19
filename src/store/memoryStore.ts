import { format } from "date-fns"
import type { StateCreator } from "zustand"
import type { AIConversationMessage, SemanticMemory } from "@/types"
import type { StoreState } from "./useStore"

export interface MemoryStore {
  conversationHistory: Record<string, AIConversationMessage[]>
  semanticMemory: SemanticMemory
  addConversationMessage: (date: string, message: AIConversationMessage) => void
  getConversationHistory: (date: string) => AIConversationMessage[]
  formatConversationHistory: (date: string) => string
  clearConversationHistory: (date: string) => void
  setSemanticMemory: (memory: SemanticMemory) => void
  addSemanticFact: (fact: string) => void
  removeSemanticFact: (index: number) => void
  addSemanticGoal: (goal: string) => void
  removeSemanticGoal: (index: number) => void
  addSemanticPreference: (pref: string) => void
  removeSemanticPreference: (index: number) => void
  addSemanticProject: (project: string) => void
  removeSemanticProject: (index: number) => void
  getSemanticSummary: () => string
}

const defaultSemanticMemory: SemanticMemory = {
  facts: [],
  goals: [],
  preferences: [],
  projects: [],
  lastUpdated: new Date().toISOString(),
}

export const createMemoryStore: StateCreator<StoreState, [], [], MemoryStore> = (set, get) => ({
  conversationHistory: {},
  semanticMemory: defaultSemanticMemory,

  addConversationMessage: (date, message) => {
    set((state) => {
      const existing = state.conversationHistory[date] || []
      return {
        conversationHistory: {
          ...state.conversationHistory,
          [date]: [...existing, message],
        },
      }
    })
  },

  getConversationHistory: (date) => {
    return get().conversationHistory[date] || []
  },

  formatConversationHistory: (date) => {
    const history = get().getConversationHistory(date)
    if (history.length === 0) return "нет"
    return history
      .map((m) => `${m.role === "user" ? "Пользователь" : "AI"}: ${m.content}`)
      .join("\n\n")
  },

  clearConversationHistory: (date) => {
    set((state) => {
      const newHistory = { ...state.conversationHistory }
      delete newHistory[date]
      return { conversationHistory: newHistory }
    })
  },

  setSemanticMemory: (memory) => {
    set({ semanticMemory: { ...memory, lastUpdated: new Date().toISOString() } })
  },

  addSemanticFact: (fact) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        facts: [...state.semanticMemory.facts, fact],
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  removeSemanticFact: (index) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        facts: state.semanticMemory.facts.filter((_, i) => i !== index),
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  addSemanticGoal: (goal) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        goals: [...state.semanticMemory.goals, goal],
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  removeSemanticGoal: (index) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        goals: state.semanticMemory.goals.filter((_, i) => i !== index),
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  addSemanticPreference: (pref) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        preferences: [...state.semanticMemory.preferences, pref],
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  removeSemanticPreference: (index) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        preferences: state.semanticMemory.preferences.filter((_, i) => i !== index),
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  addSemanticProject: (project) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        projects: [...state.semanticMemory.projects, project],
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  removeSemanticProject: (index) => {
    set((state) => ({
      semanticMemory: {
        ...state.semanticMemory,
        projects: state.semanticMemory.projects.filter((_, i) => i !== index),
        lastUpdated: new Date().toISOString(),
      },
    }))
  },

  getSemanticSummary: () => {
    const m = get().semanticMemory
    const parts: string[] = []
    if (m.facts.length > 0) parts.push(`Факты: ${m.facts.join("; ")}`)
    if (m.goals.length > 0) parts.push(`Цели: ${m.goals.join("; ")}`)
    if (m.preferences.length > 0) parts.push(`Предпочтения: ${m.preferences.join("; ")}`)
    if (m.projects.length > 0) parts.push(`Проекты: ${m.projects.join("; ")}`)
    return parts.length > 0 ? parts.join(". ") : "нет"
  },
})
