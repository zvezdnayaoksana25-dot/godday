import { useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Loader2, X, Check, Sparkles } from "lucide-react"
import { v4 as uuidv4 } from "uuid"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/store/useStore"
import { adjustDayPlan } from "@/services/ai"
import type { DayPlanTask, Task, AIConversationMessage } from "@/types"

interface DayAdjustDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const timeBlockLabels: Record<string, string> = {
  morning: "Утро",
  afternoon: "День",
  evening: "Вечер",
}

const timeBlockEmojis: Record<string, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
}

const priorityLabels: Record<string, string> = {
  high: "Важно",
  medium: "Средне",
  low: "Можно позже",
}

const DayAdjustDialog = ({ open, onOpenChange }: DayAdjustDialogProps) => {
  const tasks = useStore((s) => s.tasks)
  const dayPlans = useStore((s) => s.dayPlans)
  const saveDayPlan = useStore((s) => s.saveDayPlan)
  const getPatternsSummary = useStore((s) => s.getPatternsSummary)
  const deleteTask = useStore((s) => s.deleteTask)
  const addTasks = useStore((s) => s.addTasks)
  const getConversationHistory = useStore((s) => s.getConversationHistory)
  const addConversationMessage = useStore((s) => s.addConversationMessage)
  const getSemanticSummary = useStore((s) => s.getSemanticSummary)

  const today = format(new Date(), "yyyy-MM-dd")
  const todayTasks = tasks.filter((t) => t.dueDate === today)
  const completedTasks = todayTasks.filter((t) => t.status === "done")
  const pendingTasks = todayTasks.filter((t) => t.status !== "done")
  const dayPlan = dayPlans[today]

  const [userInput, setUserInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ summary: string; commentary: string; newTasks: DayPlanTask[] } | null>(null)

  const handleAdjust = async () => {
    if (!userInput.trim()) return
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const now = new Date()
      const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`

      const completedStr = completedTasks.map((t) => `- ${t.title} ✅`).join("\n") || "ничего"
      const pendingStr = pendingTasks.map((t) => `- ${t.title} (${t.priority})`).join("\n") || "ничего"
      const originalPlanStr = dayPlan?.originalPlan
        ? JSON.stringify(dayPlan.originalPlan)
        : JSON.stringify(todayTasks.map((t) => ({ title: t.title, priority: t.priority, category: t.category, suggestedTime: t.timeBlock })))

      const conversationHistory = getConversationHistory(today)
      const conversationStr = conversationHistory.length > 0
        ? conversationHistory
            .map((m) => `${m.role === "user" ? "Я" : "AI"}: ${m.content}`)
            .join("\n\n")
        : "нет"

      const adjusted = await adjustDayPlan(
        currentTime,
        JSON.parse(originalPlanStr),
        completedStr,
        pendingStr,
        getPatternsSummary(),
        userInput,
        conversationStr,
        getSemanticSummary(),
      )

      const userMsg: AIConversationMessage = {
        role: "user",
        content: `Корректировка дня: ${userInput}`,
        timestamp: new Date().toISOString(),
      }
      const aiMsg: AIConversationMessage = {
        role: "assistant",
        content: `${adjusted.summary}\n\nНовый план:\n${adjusted.newTasks.map((t) => `- ${t.title}`).join("\n")}\n\n${adjusted.commentary}`,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(today, userMsg)
      addConversationMessage(today, aiMsg)

      setResult(adjusted)
    } catch (e: any) {
      setError(e.message || "Ошибка при корректировке")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return

    const todayStr = format(new Date(), "yyyy-MM-dd")

    pendingTasks.forEach((t) => deleteTask(t.id))

    const newTaskList: Task[] = result.newTasks.map((t, i) => ({
      id: uuidv4(),
      title: t.title,
      priority: t.priority,
      category: t.category,
      timeBlock: t.suggestedTime,
      status: "todo",
      aiGenerated: true,
      aiNotes: t.aiNote,
      dueDate: todayStr,
      createdAt: new Date().toISOString(),
      order: i,
    }))

    addTasks(newTaskList)

    if (dayPlan) {
      saveDayPlan({
        ...dayPlan,
        originalPlan: result.newTasks,
        aiCommentary: result.commentary,
      })
    }

    onOpenChange(false)
    setResult(null)
    setUserInput("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Скорректировать день
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {completedTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">✅ Выполнено</h4>
              <div className="space-y-1.5">
                {completedTasks.map((t) => (
                  <div key={t.id} className="text-sm text-muted-foreground line-through pl-2">
                    {t.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">⏳ Осталось</h4>
              <div className="space-y-1.5">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="text-sm flex items-center gap-2">
                    <span>{t.title}</span>
                    <Badge variant="soft" className="text-[10px] px-1.5 py-0">
                      {priorityLabels[t.priority]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingTasks.length === 0 && completedTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Задач на сегодня нет
            </p>
          )}

          {!result && (
            <>
              <Textarea
                placeholder="Что изменилось? Например: 'Пришла подруга, хочу с ней погулять вместо работы'"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="min-h-[80px]"
              />
              <Button
                onClick={handleAdjust}
                className="w-full"
                size="lg"
                disabled={isLoading || !userInput.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Думаю...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Скорректировать
                  </>
                )}
              </Button>
            </>
          )}

          {error && (
            <div className="text-center space-y-3">
              <p className="text-destructive text-sm">{error}</p>
              <Button variant="outline" onClick={() => setError(null)}>
                Попробовать снова
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground italic">{result.summary}</p>

              {result.commentary && (
                <Card className="p-4 bg-secondary/30 border-secondary/50">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    {result.commentary}
                  </p>
                </Card>
              )}

              <div className="space-y-2">
                {result.newTasks.map((task, i) => (
                  <Card key={i} className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{timeBlockEmojis[task.suggestedTime]}</span>
                      <span className="text-sm font-medium">{task.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="soft" className="text-[10px] px-1.5 py-0">
                        {timeBlockLabels[task.suggestedTime]}
                      </Badge>
                      <Badge variant="soft" className="text-[10px] px-1.5 py-0">
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                    {task.aiNote && (
                      <p className="text-xs text-muted-foreground">{task.aiNote}</p>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setResult(null); setUserInput("") }}>
                  <X className="mr-2 h-4 w-4" /> Отмена
                </Button>
                <Button className="flex-1" onClick={handleApply}>
                  <Check className="mr-2 h-4 w-4" /> Применить
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DayAdjustDialog
