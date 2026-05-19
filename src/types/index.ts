export type Priority = "high" | "medium" | "low"
export type TaskStatus = "todo" | "in-progress" | "done"
export type TimeBlock = "morning" | "afternoon" | "evening"
export type Category = "work" | "personal" | "health" | "study" | "errand" | "other"

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  category: Category
  timeBlock?: TimeBlock
  dueDate?: string
  createdAt: string
  completedAt?: string
  aiGenerated: boolean
  aiNotes?: string
  order: number
}

export interface DayPlan {
  date: string
  taskIds: string[]
  sleepScore: number
  motivationScore: number
  voiceNotes: string
  aiSummary: string
  aiCommentary: string
  completed: boolean
  originalPlan: DayPlanTask[]
}

export interface AIConversationMessage {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export interface DaySummary {
  date: string
  summary: string
  tasksPlanned: number
  tasksCompleted: number
  mood: string
}

export interface PeriodSummary {
  period: string
  summary: string
  insights: string[]
  patterns: string
}

export interface Patterns {
  avgStartTime: number
  avgTasksPerDay: number
  avgCompletionRate: number
  frequentlyPostponedCategories: Category[]
  motivationHistory: { date: string; score: number }[]
  sleepHistory: { date: string; score: number }[]
  lastUpdated: string
}

export interface Settings {
  name: string
  groqApiKey: string
  telegramBotToken: string
  telegramChatId: string
  theme: "light" | "dark"
  language: string
}

export interface MorningSession {
  step: "sleep" | "motivation" | "voice" | "plan" | "done"
  sleepScore: number
  motivationScore: number
  voiceNotes: string
  aiPlan: DayPlanTask[]
  aiGreeting: string
  aiCommentary: string
  aiEncouragement: string
  isLoading: boolean
  error: string | null
}

export interface DayPlanTask {
  title: string
  priority: Priority
  category: Category
  suggestedTime: TimeBlock
  aiNote: string
}

export interface EveningReport {
  summary: string
  completed: string[]
  postponed: string[]
  commentary: string
  insight: string
  tomorrowSuggestion: string
}

export interface AIStatsResult {
  completionRate: number
  streakDays: number
  avgTasksPerDay: number
  bestDay: string
  bestCategory: string
  insight: string
  patterns: string
  weeklyTrend: string
  recommendations: string[]
}

export interface SemanticMemory {
  facts: string[]
  goals: string[]
  preferences: string[]
  projects: string[]
  lastUpdated: string
}
