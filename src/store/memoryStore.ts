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
    set((state) => {
      const facts = state.semanticMemory?.facts || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          facts: [...facts, fact],
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  removeSemanticFact: (index) => {
    set((state) => {
      const facts = state.semanticMemory?.facts || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          facts: facts.filter((_, i) => i !== index),
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  addSemanticGoal: (goal) => {
    set((state) => {
      const goals = state.semanticMemory?.goals || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          goals: [...goals, goal],
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  removeSemanticGoal: (index) => {
    set((state) => {
      const goals = state.semanticMemory?.goals || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          goals: goals.filter((_, i) => i !== index),
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  addSemanticPreference: (pref) => {
    set((state) => {
      const preferences = state.semanticMemory?.preferences || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          preferences: [...preferences, pref],
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  removeSemanticPreference: (index) => {
    set((state) => {
      const preferences = state.semanticMemory?.preferences || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          preferences: preferences.filter((_, i) => i !== index),
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  addSemanticProject: (project) => {
    set((state) => {
      const projects = state.semanticMemory?.projects || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          projects: [...projects, project],
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  removeSemanticProject: (index) => {
    set((state) => {
      const projects = state.semanticMemory?.projects || []
      return {
        semanticMemory: {
          ...state.semanticMemory,
          projects: projects.filter((_, i) => i !== index),
          lastUpdated: new Date().toISOString(),
        },
      }
    })
  },

  getSemanticSummary: () => {
    const m = get().semanticMemory
    const facts = m?.facts || []
    const goals = m?.goals || []
    const preferences = m?.preferences || []
    const projects = m?.projects || []
    const parts: string[] = []
    if (facts.length > 0) parts.push(`Факты: ${facts.join("; ")}`)
    if (goals.length > 0) parts.push(`Цели: ${goals.join("; ")}`)
    if (preferences.length > 0) parts.push(`Предпочтения: ${preferences.join("; ")}`)
    if (projects.length > 0) parts.push(`Проекты: ${projects.join("; ")}`)
    return parts.length > 0 ? parts.join(". ") : "нет"
  },
})
