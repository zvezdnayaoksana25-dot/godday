import { motion } from "framer-motion"
import TaskCard from "@/components/TaskCard"
import type { Task, TimeBlock } from "@/types"

interface DayViewProps {
  tasks: Task[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onAddTask: () => void
  onEdit?: (id: string, title: string, priority: Task["priority"], category: Task["category"], timeBlock?: TimeBlock, dueDate?: string) => void
  onMoveDate?: (id: string, newDate: string) => void
  onTimeBlockChange?: (id: string, newTimeBlock?: TimeBlock) => void
  emptyMessage?: string
}

const timeBlockLabels: Record<string, string> = {
  morning: "Утро",
  afternoon: "День",
  evening: "Вечер",
}

const timeBlockOrder: TimeBlock[] = ["morning", "afternoon", "evening"]

const DayView = ({ tasks, onComplete, onDelete, onAddTask, onEdit, onMoveDate, onTimeBlockChange, emptyMessage = "Задач нет" }: DayViewProps) => {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "done").length

  const groupedTasks = timeBlockOrder.map((block) => ({
    block,
    tasks: tasks
      .filter((t) => t.timeBlock === block)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }),
  }))

  const otherTasks = tasks.filter((t) => !t.timeBlock)

  if (totalTasks === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{emptyMessage}</p>
        <button onClick={onAddTask} className="mt-3 text-primary text-sm font-medium">
          + Добавить задачу
        </button>
      </div>
    )
  }

  return (
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
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onMoveDate={onMoveDate}
                    onTimeBlockChange={onTimeBlockChange}
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
                onComplete={onComplete}
                onDelete={onDelete}
                onEdit={onEdit}
                onMoveDate={onMoveDate}
                onTimeBlockChange={onTimeBlockChange}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DayView
