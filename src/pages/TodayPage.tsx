import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Sparkles, Repeat } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TabBar from "@/components/layout/TabBar"
import DayProgressCircle from "@/components/DayProgressCircle"
import DayView from "@/components/DayView"
import NewTaskDialog from "@/components/NewTaskDialog"
import MorningRoutine from "@/components/MorningRoutine"
import DayAdjustDialog from "@/components/DayAdjustDialog"
import { useStore } from "@/store/useStore"
import type { Priority, Category, TimeBlock } from "@/types"

const TodayPage = () => {
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const completeTask = useStore((s) => s.completeTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTask = useStore((s) => s.addTask)
  const hasMorningRoutine = useStore((s) => s.hasMorningRoutine)
  const getDisplayName = useStore((s) => s.getDisplayName)
  const settings = useStore((s) => s.settings)

  const [showMorningRoutine, setShowMorningRoutine] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [showAdjustDay, setShowAdjustDay] = useState(false)
  const morningShownRef = useRef(false)

  const today = format(new Date(), "yyyy-MM-dd")
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  const completedToday = todayTasks.filter((t) => t.status === "done").length
  const totalToday = todayTasks.length
  const hasApiKey = !!settings.groqApiKey

  useEffect(() => {
    if (hasApiKey && !hasMorningRoutine(today) && !morningShownRef.current && !showMorningRoutine) {
      morningShownRef.current = true
      setShowMorningRoutine(true)
    }
  }, [today, hasApiKey])

  const handleAddTask = (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock, dueDate?: string) => {
    addTask(title, priority, category, timeBlock, false, undefined, dueDate || today)
  }

  return (
    <>
      {showMorningRoutine && (
        <MorningRoutine onComplete={() => setShowMorningRoutine(false)} />
      )}

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} onSubmit={handleAddTask} />
      <DayAdjustDialog open={showAdjustDay} onOpenChange={setShowAdjustDay} />

      <div className="min-h-screen bg-background pb-24">
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

          <div className="flex justify-center mb-4">
            <DayProgressCircle completed={completedToday} total={totalToday} />
          </div>

          {hasApiKey && totalToday > 0 && (
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setShowAdjustDay(true)}
                className="h-9 px-4 rounded-full bg-accent/60 text-accent-foreground flex items-center gap-2 text-xs font-medium hover:bg-accent transition-colors"
              >
                <Repeat className="h-3.5 w-3.5" />
                Скорректировать день
              </button>
            </div>
          )}

          <DayView
            tasks={todayTasks}
            onComplete={completeTask}
            onDelete={deleteTask}
            onAddTask={() => setShowNewTask(true)}
            emptyMessage="Задач на сегодня нет"
          />
        </div>

        <TabBar onAddTask={() => setShowNewTask(true)} />
      </div>
    </>
  )
}

export default TodayPage
