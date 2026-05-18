import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TabBar from "@/components/layout/TabBar"
import DayProgressCircle from "@/components/DayProgressCircle"
import DayView from "@/components/DayView"
import NewTaskDialog from "@/components/NewTaskDialog"
import MorningRoutine from "@/components/MorningRoutine"
import { useStore } from "@/store/useStore"
import type { Priority, Category, TimeBlock } from "@/types"

const TodayPage = () => {
  const navigate = useNavigate()
  const {
    tasks,
    completeTask,
    deleteTask,
    addTask,
    dayPlans,
    hasMorningRoutine,
    getDisplayName,
    settings,
  } = useStore()

  const [showMorningRoutine, setShowMorningRoutine] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)

  const today = new Date().toISOString().split("T")[0]
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  const completedToday = todayTasks.filter((t) => t.status === "done").length
  const totalToday = todayTasks.length
  const hasApiKey = !!settings.groqApiKey

  useEffect(() => {
    if (hasApiKey && !hasMorningRoutine(today) && !showMorningRoutine) {
      setShowMorningRoutine(true)
    }
  }, [today, hasMorningRoutine, showMorningRoutine, hasApiKey])

  const handleAddTask = (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock, dueDate?: string) => {
    addTask(title, priority, category, timeBlock, false, undefined, dueDate || today)
  }

  const handleComplete = (id: string) => {
    completeTask(id)
  }

  return (
    <>
      <AnimatePresence>
        {showMorningRoutine && (
          <MorningRoutine onComplete={() => setShowMorningRoutine(false)} />
        )}
      </AnimatePresence>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} onSubmit={handleAddTask} />

      <motion.div
        className="min-h-screen bg-background pb-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="px-5 pt-12 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">
                Доброе утро, {getDisplayName()} 🌸
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {hasApiKey ? "AI подключён" : "Добавь Groq API ключ в настройках ✨"}
              </p>
            </div>
            {!hasMorningRoutine(today) && (
              <button
                onClick={() => hasApiKey ? setShowMorningRoutine(true) : navigate("/settings")}
                className="h-10 px-4 rounded-full bg-primary/10 text-primary flex items-center gap-2 text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {hasApiKey ? "Утро" : "Настрой AI"}
              </button>
            )}
          </div>

          <div className="flex justify-center mb-8">
            <DayProgressCircle completed={completedToday} total={totalToday} />
          </div>

          <DayView
            tasks={todayTasks}
            onComplete={handleComplete}
            onDelete={deleteTask}
            onAddTask={() => setShowNewTask(true)}
            emptyMessage="Задач на сегодня нет"
          />
        </div>

        <TabBar onAddTask={() => setShowNewTask(true)} />
      </motion.div>
    </>
  )
}

export default TodayPage
