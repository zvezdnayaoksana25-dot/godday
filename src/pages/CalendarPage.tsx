import { useState } from "react"
import { motion } from "framer-motion"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns"
import { ru } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import TabBar from "@/components/layout/TabBar"
import DayView from "@/components/DayView"
import NewTaskDialog from "@/components/NewTaskDialog"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"
import type { Priority, Category, TimeBlock } from "@/types"

const CalendarPage = () => {
  const { tasks, completeTask, deleteTask, addTask } = useStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showNewTask, setShowNewTask] = useState(false)

  const selectedDateStr = selectedDate.toISOString().split("T")[0]
  const selectedTasks = tasks.filter((t) => t.dueDate === selectedDateStr)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const firstDayOfWeek = monthStart.getDay()
  const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
  const leadingDays = Array.from({ length: adjustedFirstDay }, (_, i) => {
    const d = new Date(monthStart)
    d.setDate(d.getDate() - (adjustedFirstDay - i))
    return d
  })

  const lastDayOfWeek = monthEnd.getDay()
  const adjustedLastDay = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1
  const trailingDays = Array.from({ length: 6 - adjustedLastDay }, (_, i) => {
    const d = new Date(monthEnd)
    d.setDate(d.getDate() + i + 1)
    return d
  })

  const allDays = [...leadingDays, ...days, ...trailingDays]

  const taskDates = new Set(tasks.map((t) => t.dueDate))

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const handleAddTask = (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock, dueDate?: string) => {
    addTask(title, priority, category, timeBlock, false, undefined, dueDate || selectedDateStr)
  }

  return (
    <>
      <NewTaskDialog
        open={showNewTask}
        onOpenChange={setShowNewTask}
        onSubmit={handleAddTask}
        defaultDate={selectedDateStr}
      />

      <motion.div
        className="min-h-screen bg-background pb-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-semibold mb-6">Календарь</h1>

          <div className="bg-card rounded-2xl border border-border/50 shadow-soft p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-base font-semibold capitalize">
                {format(currentMonth, "LLLL yyyy", { locale: ru })}
              </h2>
              <button onClick={nextMonth} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {allDays.map((day, i) => {
                const dateStr = day.toISOString().split("T")[0]
                const hasTasks = taskDates.has(dateStr)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isTodayDate = isToday(day)

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative h-10 rounded-xl text-sm flex flex-col items-center justify-center transition-all",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && "text-foreground",
                      isSelected && "bg-primary text-primary-foreground font-semibold",
                      !isSelected && isTodayDate && "bg-accent font-medium",
                      !isSelected && !isTodayDate && isCurrentMonth && "hover:bg-accent/50",
                    )}
                  >
                    {format(day, "d")}
                    {hasTasks && !isSelected && (
                      <div className="flex gap-0.5 mt-0.5">
                        <div className="h-1 w-1 rounded-full bg-primary/60" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              {isToday(selectedDate)
                ? "Сегодня"
                : format(selectedDate, "d MMMM yyyy", { locale: ru })}
            </h3>
            <button
              onClick={() => setShowNewTask(true)}
              className="h-8 px-3 rounded-full bg-primary/10 text-primary flex items-center gap-1.5 text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Задача
            </button>
          </div>

          <DayView
            tasks={selectedTasks}
            onComplete={completeTask}
            onDelete={deleteTask}
            onAddTask={() => setShowNewTask(true)}
            emptyMessage={
              isToday(selectedDate)
                ? "Задач на сегодня нет"
                : `Нет задач на ${format(selectedDate, "d MMMM", { locale: ru })}`
            }
          />
        </div>

        <TabBar onAddTask={() => setShowNewTask(true)} />
      </motion.div>
    </>
  )
}

export default CalendarPage
