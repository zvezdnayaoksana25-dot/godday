import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TabBar from "@/components/layout/TabBar"
import DayProgressCircle from "@/components/DayProgressCircle"
import TaskCard from "@/components/TaskCard"
import NewTaskDialog from "@/components/NewTaskDialog"
import MorningRoutine from "@/components/MorningRoutine"
import { useStore } from "@/store/useStore"
import type { Priority, Category, TimeBlock } from "@/types"

const timeBlockLabels: Record<string, string> = {
  morning: "Утро",
  afternoon: "День",
  evening: "Вечер",
}

const timeBlockOrder: TimeBlock[] = ["morning", "afternoon", "evening"]

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

  const handleAddTask = (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock) => {
    addTask(title, priority, category, timeBlock)
  }

  const handleComplete = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (task?.status === "done") {
      completeTask(id)
    } else {
      completeTask(id)
    }
  }

  const groupedTasks = timeBlockOrder.map((block) => ({
    block,
    tasks: todayTasks
      .filter((t) => t.timeBlock === block)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }),
  }))

  const otherTasks = todayTasks.filter((t) => !t.timeBlock)

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

          {totalToday === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Задач на сегодня нет</p>
              <button
                onClick={() => setShowNewTask(true)}
                className="mt-3 text-primary text-sm font-medium"
              >
                + Добавить задачу
              </button>
            </div>
          )}

          <div className="space-y-6">
            {groupedTasks.map(
              ({ block, tasks: blockTasks }) =>
                blockTasks.length > 0 && (
                  <div key={block}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      {timeBlockLabels[block]}
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {blockTasks.filter((t) => t.status === "done").length}/{blockTasks.length}
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {blockTasks.map((task, i) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onComplete={handleComplete}
                          onDelete={deleteTask}
                          index={i}
                        />
                      ))}
                    </div>
                  </div>
                ),
            )}

            {otherTasks.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  Без времени
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {otherTasks.filter((t) => t.status === "done").length}/{otherTasks.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {otherTasks.map((task, i) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onDelete={deleteTask}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <TabBar onAddTask={() => setShowNewTask(true)} />
      </motion.div>
    </>
  )
}

export default TodayPage
