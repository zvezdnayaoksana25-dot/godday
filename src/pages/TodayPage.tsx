import { useState, useEffect } from "react"
import { format, subDays } from "date-fns"
import { Sparkles, Repeat } from "lucide-react"
import { useNavigate } from "react-router-dom"
import TabBar from "@/components/layout/TabBar"
import DayProgressCircle from "@/components/DayProgressCircle"
import DayView from "@/components/DayView"
import NewTaskDialog from "@/components/NewTaskDialog"
import MorningRoutine from "@/components/MorningRoutine"
import DayAdjustDialog from "@/components/DayAdjustDialog"
import { useStore } from "@/store/useStore"
import { generateDailySummary, generateWeeklySummary } from "@/services/ai"
import type { Priority, Category, TimeBlock } from "@/types"

const getTimeGreeting = (name: string) => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return `Доброе утро, ${name} 🌅`
  if (hour >= 12 && hour < 18) return `Добрый день, ${name} ☀️`
  if (hour >= 18 && hour < 23) return `Добрый вечер, ${name} 🌆`
  return `Доброй ночи, ${name} 🌙`
}

const TodayPage = () => {
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const completeTask = useStore((s) => s.completeTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTask = useStore((s) => s.addTask)
  const hasMorningRoutine = useStore((s) => s.hasMorningRoutine)
  const getDisplayName = useStore((s) => s.getDisplayName)
  const settings = useStore((s) => s.settings)
  const dayPlans = useStore((s) => s.dayPlans)
  const getPatternsSummary = useStore((s) => s.getPatternsSummary)
  const saveDailySummary = useStore((s) => s.saveDailySummary)
  const saveWeeklySummary = useStore((s) => s.saveWeeklySummary)
  const getWeekKey = useStore((s) => s.getWeekKey)
  const getLastSummarizedDay = useStore((s) => s.getLastSummarizedDay)
  const getLastSummarizedWeek = useStore((s) => s.getLastSummarizedWeek)
  const recalcPatternsFromTasks = useStore((s) => s.recalcPatternsFromTasks)
  const getDiaryEntriesForPeriod = useStore((s) => s.getDiaryEntriesForPeriod)

  const [showMorningRoutine, setShowMorningRoutine] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [showAdjustDay, setShowAdjustDay] = useState(false)

  const today = format(new Date(), "yyyy-MM-dd")
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  const completedToday = todayTasks.filter((t) => t.status === "done").length
  const totalToday = todayTasks.length
  const hasApiKey = !!settings.groqApiKey

  useEffect(() => {
    if (hasApiKey && !hasMorningRoutine(today) && !showMorningRoutine) {
      setShowMorningRoutine(true)
    }
  }, [today, hasApiKey])

  useEffect(() => {
    recalcPatternsFromTasks()
  }, [tasks])

  useEffect(() => {
    if (!hasApiKey) return

    const summaryKey = `flowday-summary-${today}`
    if (localStorage.getItem(summaryKey)) return
    localStorage.setItem(summaryKey, "1")

    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
    const lastSummarized = getLastSummarizedDay()

    if (lastSummarized !== yesterday && dayPlans[yesterday] && dayPlans[yesterday].taskIds.length > 0) {
      const yesterdayTasks = tasks.filter((t) => t.dueDate === yesterday)
      const completed = yesterdayTasks.filter((t) => t.status === "done")
      const pending = yesterdayTasks.filter((t) => t.status !== "done")
      const manual = yesterdayTasks.filter((t) => !t.aiGenerated)
      const plan = dayPlans[yesterday]

      generateDailySummary(
        yesterday,
        yesterdayTasks.length,
        completed.length,
        plan.sleepScore || 0,
        plan.sleepTime || "23:00",
        plan.wakeTime || "07:00",
        plan.energyLevel || "medium",
        plan.motivationScore || 0,
        plan.voiceNotes || "",
        completed.map((t) => t.title).join(", "),
        pending.map((t) => t.title).join(", "),
        manual.map((t) => t.title).join(", "),
        getPatternsSummary(),
        getDiaryEntriesForPeriod(yesterday),
      ).then((summary) => {
        saveDailySummary(yesterday, summary)
      }).catch(() => {})
    }

    const todayDate = new Date()
    const isMonday = todayDate.getDay() === 1
    const lastSummarizedWeek = getLastSummarizedWeek()
    const currentWeekKey = getWeekKey(todayDate)

    if (isMonday && lastSummarizedWeek !== currentWeekKey) {
      const weekStartKey = `flowday-week-summary-${currentWeekKey}`
      if (localStorage.getItem(weekStartKey)) return
      localStorage.setItem(weekStartKey, "1")

      const weekStart = new Date(todayDate)
      weekStart.setDate(todayDate.getDate() - 7)
      let dailyData = ""
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const dateStr = format(d, "yyyy-MM-dd")
        const dayTasks = tasks.filter((t) => t.dueDate === dateStr)
        const completed = dayTasks.filter((t) => t.status === "done").length
        const plan = dayPlans[dateStr]
        dailyData += `${format(d, "dd.MM")}: задач ${dayTasks.length}, выполнено ${completed}${plan ? `, сон ${plan.sleepScore}/10` : ""}\n`
      }

      const weekStartStr = format(weekStart, "yyyy-MM-dd")
      const weekEndStr = format(todayDate, "yyyy-MM-dd")
      let diaryEntries = ""
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const dateStr = format(d, "yyyy-MM-dd")
        const entries = getDiaryEntriesForPeriod(dateStr)
        if (entries !== "нет записей в дневнике") {
          diaryEntries += `${dateStr}: ${entries}\n\n`
        }
      }

      generateWeeklySummary(
        format(weekStart, "dd.MM.yyyy"),
        format(todayDate, "dd.MM.yyyy"),
        dailyData,
        getPatternsSummary(),
        diaryEntries,
      ).then((summary) => {
        saveWeeklySummary(currentWeekKey, summary)
      }).catch(() => {})
    }
  }, [hasApiKey])

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
                {getTimeGreeting(getDisplayName())}
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
