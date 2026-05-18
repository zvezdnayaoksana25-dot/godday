import { motion } from "framer-motion"
import { Check, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Task } from "@/types"

interface TaskCardProps {
  task: Task
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  index?: number
}

const categoryEmojis: Record<string, string> = {
  work: "💼",
  personal: "🏠",
  health: "🌿",
  study: "📚",
  errand: "🛒",
  other: "📝",
}

const timeBlockEmojis: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
}

const priorityColors: Record<string, string> = {
  high: "border-l-destructive/50",
  medium: "border-l-primary/50",
  low: "border-l-muted-foreground/30",
}

const TaskCard = ({ task, onComplete, onDelete, index = 0 }: TaskCardProps) => {
  const isDone = task.status === "done"

  return (
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isDone ? onComplete(task.id) : onComplete(task.id))}
            className={cn(
              "h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              isDone
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border hover:border-primary",
            )}
          >
            {isDone && <Check className="h-3.5 w-3.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium truncate",
                isDone && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs">
                {categoryEmojis[task.category]} {timeBlockEmojis[task.timeBlock || ""]}
              </span>
              {task.aiGenerated && (
                <Badge variant="soft" className="text-[10px] px-1.5 py-0">
                  AI
                </Badge>
              )}
            </div>
          </div>

          <button
            onClick={() => onDelete(task.id)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </motion.div>
  )
}

export default TaskCard
