import { useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Trash2, ChevronDown, AlertTriangle, Pencil, CalendarDays, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import type { Task, TimeBlock } from "@/types"
import EditTaskDialog from "@/components/EditTaskDialog"

const categoryEmojis: Record<string, string> = {
  work: "💼",
  personal: "🏠",
  health: "🌿",
  study: "📚",
  errand: "🛒",
  other: "📝",
}

const timeBlockEmojis: Record<TimeBlock, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
}

const timeBlockOrder: TimeBlock[] = ["morning", "afternoon", "evening"]

const priorityColors: Record<string, string> = {
  high: "border-l-destructive/50",
  medium: "border-l-primary/50",
  low: "border-l-muted-foreground/30",
}

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onEdit?: (id: string, title: string, priority: Task["priority"], category: Task["category"], timeBlock?: TimeBlock, dueDate?: string) => void
  onMoveDate?: (id: string, newDate: string) => void
  onTimeBlockChange?: (id: string, newTimeBlock?: TimeBlock) => void
  index?: number
}

const TaskCard = ({ task, onComplete, onDelete, onEdit, onMoveDate, onTimeBlockChange, index = 0 }: TaskCardProps) => {
  const isDone = task.status === "done"
  const [expanded, setExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMoveCalendar, setShowMoveCalendar] = useState(false)

  const hasNote = !!task.aiNotes

  const cycleTimeBlock = () => {
    if (!onTimeBlockChange) return
    const currentIdx = task.timeBlock ? timeBlockOrder.indexOf(task.timeBlock) : -1
    const nextIdx = (currentIdx + 1) % timeBlockOrder.length
    const next = timeBlockOrder[nextIdx]
    onTimeBlockChange(task.id, next === task.timeBlock ? undefined : next)
  }

  const handleMoveDate = (date: Date | undefined) => {
    if (!date || !onMoveDate) return
    const dateStr = format(date, "yyyy-MM-dd")
    onMoveDate(task.id, dateStr)
    setShowMoveCalendar(false)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        <Card
          className={cn(
            "p-3 border-l-4 transition-all",
            priorityColors[task.priority],
            isDone && "opacity-60",
          )}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => onComplete(task.id)}
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                isDone
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border hover:border-primary",
              )}
            >
              {isDone && <Check className="h-3.5 w-3.5" />}
            </button>

            <div className="flex-1 min-w-0">
              <button
                onClick={() => hasNote && setExpanded(!expanded)}
                className={cn(
                  "text-sm font-medium text-left w-full",
                  isDone && "line-through text-muted-foreground",
                  hasNote && "cursor-pointer",
                )}
              >
                {task.title}
              </button>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs">
                  {categoryEmojis[task.category]}
                </span>
                {task.timeBlock && onTimeBlockChange && (
                  <button
                    onClick={cycleTimeBlock}
                    className="text-xs hover:opacity-70 transition-opacity flex items-center gap-0.5"
                  >
                    {timeBlockEmojis[task.timeBlock]}
                    <Clock className="h-2.5 w-2.5" />
                  </button>
                )}
                {task.timeBlock && !onTimeBlockChange && (
                  <span className="text-xs">{timeBlockEmojis[task.timeBlock]}</span>
                )}
                {task.aiGenerated && (
                  <Badge variant="soft" className="text-[10px] px-1.5 py-0">
                    AI
                  </Badge>
                )}
                {hasNote && (
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 text-muted-foreground transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                )}
              </div>

              <AnimatePresence>
                {expanded && hasNote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed pt-2 border-t border-border/50">
                      {task.aiNotes}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
              {onEdit && (
                <button
                  onClick={() => setShowEditDialog(true)}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onMoveDate && (
                <Popover open={showMoveCalendar} onOpenChange={setShowMoveCalendar}>
                  <PopoverTrigger asChild>
                    <button
                      className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={task.dueDate ? new Date(task.dueDate + "T00:00:00") : undefined}
                      onSelect={handleMoveDate}
                      locale={ru}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-xs shadow-xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-base font-semibold mb-1">Удалить задачу?</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
                  {task.title}
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-11 rounded-xl bg-muted text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => {
                      onDelete(task.id)
                      setShowDeleteConfirm(false)
                    }}
                    className="flex-1 h-11 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {onEdit && (
        <EditTaskDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          task={task}
          onSubmit={onEdit}
        />
      )}
    </>
  )
}

export default TaskCard
