import type { StateCreator } from "zustand"
import { v4 as uuidv4 } from "uuid"
import { format } from "date-fns"
import type { Task, Priority, Category, TimeBlock } from "@/types"
import type { StoreState } from "./useStore"

export interface TaskStore {
  tasks: Task[]
  addTask: (title: string, priority?: Priority, category?: Category, timeBlock?: TimeBlock, aiGenerated?: boolean, aiNotes?: string, dueDate?: string) => Task
  addTasks: (newTasks: Task[]) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, status: Task["status"]) => void
  completeTask: (id: string) => void
  uncompleteTask: (id: string) => void
  reorderTasks: (tasks: Task[]) => void
  getTasksByStatus: (status: Task["status"]) => Task[]
  getTasksByDate: (date: string) => Task[]
  getTodayTasks: () => Task[]
}

const getTodayString = () => format(new Date(), "yyyy-MM-dd")

export const createTaskStore: StateCreator<StoreState, [], [], TaskStore> = (set, get) => ({
  tasks: [],

  addTask: (title, priority = "medium", category = "other", timeBlock, aiGenerated = false, aiNotes, dueDate) => {
    const tasks = get().tasks || []
    const task: Task = {
      id: uuidv4(),
      title,
      priority,
      category,
      timeBlock,
      status: "todo",
      aiGenerated,
      aiNotes,
      dueDate: dueDate || getTodayString(),
      createdAt: new Date().toISOString(),
      order: tasks.length,
    }
    set((state) => ({ tasks: [...(state.tasks || []), task] }))
    return task
  },

  addTasks: (newTasks) => {
    set((state) => ({ tasks: [...(state.tasks || []), ...newTasks] }))
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: (state.tasks || []).map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)),
    }))
  },

  deleteTask: (id) => {
    set((state) => ({ tasks: (state.tasks || []).filter((t) => t.id !== id) }))
  },

  moveTask: (id, status) => {
    set((state) => ({
      tasks: (state.tasks || []).map((t) =>
        t.id === id
          ? { ...t, status, completedAt: status === "done" ? new Date().toISOString() : t.completedAt }
          : t,
      ),
    }))
  },

  completeTask: (id) => {
    set((state) => ({
      tasks: (state.tasks || []).map((t) =>
        t.id === id ? { ...t, status: "done" as const, completedAt: new Date().toISOString() } : t,
      ),
    }))
  },

  uncompleteTask: (id) => {
    set((state) => ({
      tasks: (state.tasks || []).map((t) =>
        t.id === id ? { ...t, status: "todo" as const, completedAt: undefined } : t,
      ),
    }))
  },

  reorderTasks: (tasks) => {
    set({ tasks })
  },

  getTasksByStatus: (status) => {
    return (get().tasks || []).filter((t) => t.status === status)
  },

  getTasksByDate: (date) => {
    return (get().tasks || []).filter((t) => t.dueDate === date)
  },

  getTodayTasks: () => {
    const today = getTodayString()
    return (get().tasks || []).filter((t) => t.dueDate === today)
  },
})
