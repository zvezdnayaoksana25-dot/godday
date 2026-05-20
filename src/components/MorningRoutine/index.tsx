import { useState, useCallback, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { format, subDays } from "date-fns"
import { Mic, MicOff, Sparkles, Check, ArrowRight, ArrowLeft, X, Loader2, ChevronUp, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/store/useStore"
import { generateMorningPlan, adjustPlan } from "@/services/ai"
import { sendMorningPlan } from "@/services/telegram"
import { startSpeechRecognition, isSpeechSupported } from "@/services/speech"
import type { DayPlanTask, MorningSession, Task, AIConversationMessage, EnergyLevel } from "@/types"
import { v4 as uuidv4 } from "uuid"

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

const energyOptions: { level: EnergyLevel; emoji: string; label: string }[] = [
  { level: "low", emoji: "🔋", label: "Разбита" },
  { level: "medium", emoji: "⚡", label: "Нормально" },
  { level: "high", emoji: "🚀", label: "Полна энергии" },
]

const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = ["00", "15", "30", "45"]

interface MorningRoutineProps {
  onComplete: () => void
}

const MorningRoutine = ({ onComplete }: MorningRoutineProps) => {
  const morningSession = useStore((s) => s.morningSession)
  const setMorningStep = useStore((s) => s.setMorningStep)
  const setSleepScore = useStore((s) => s.setSleepScore)
  const setSleepTime = useStore((s) => s.setSleepTime)
  const setWakeTime = useStore((s) => s.setWakeTime)
  const setEnergyLevel = useStore((s) => s.setEnergyLevel)
  const setMotivationScore = useStore((s) => s.setMotivationScore)
  const setVoiceNotes = useStore((s) => s.setVoiceNotes)
  const setFocusOfTheDay = useStore((s) => s.setFocusOfTheDay)
  const setYesterdayTaskDecisions = useStore((s) => s.setYesterdayTaskDecisions)
  const setAIPlan = useStore((s) => s.setAIPlan)
  const setAILoading = useStore((s) => s.setAILoading)
  const setAIError = useStore((s) => s.setAIError)
  const resetMorningSession = useStore((s) => s.resetMorningSession)
  const saveDayPlan = useStore((s) => s.saveDayPlan)
  const addTasks = useStore((s) => s.addTasks)
  const getPatternsSummary = useStore((s) => s.getPatternsSummary)
  const getTodayTasks = useStore((s) => s.getTodayTasks)
  const recordDayData = useStore((s) => s.recordDayData)
  const patterns = useStore((s) => s.patterns)
  const addConversationMessage = useStore((s) => s.addConversationMessage)
  const getConversationHistory = useStore((s) => s.getConversationHistory)
  const getDayPlan = useStore((s) => s.getDayPlan)
  const tasks = useStore((s) => s.tasks)
  const getSemanticSummary = useStore((s) => s.getSemanticSummary)
  const semanticMemory = useStore((s) => s.semanticMemory)
  const setSemanticMemory = useStore((s) => s.setSemanticMemory)
  const deleteTask = useStore((s) => s.deleteTask)
  const updateTaskDueDate = useStore((s) => s.updateTaskDueDate)

  const [voiceInput, setVoiceInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [adjustInput, setAdjustInput] = useState("")
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [expandedYesterday, setExpandedYesterday] = useState(false)
  const isCompleting = useRef(false)
  const isMounted = useRef(true)
  const speechTextRef = useRef("")

  useEffect(() => {
    return () => { isMounted.current = false }
  }, [])

  const today = format(new Date(), "yyyy-MM-dd")
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const yesterdayPlan = getDayPlan(yesterday)
  const yesterdayTasks = (tasks || []).filter((t) => t.dueDate === yesterday)
  const yesterdayCompleted = yesterdayTasks.filter((t) => t.status === "done")
  const yesterdayPending = yesterdayTasks.filter((t) => t.status !== "done")
  const yesterdayData = yesterdayPlan
    ? `Был план. Выполнено: ${yesterdayCompleted.length}/${yesterdayTasks.length}. Заметки: "${yesterdayPlan.voiceNotes || "нет"}". Перенесённые задачи: ${yesterdayPending.map((t) => t.title).join(", ") || "нет"}`
    : "Плана не было"

  const handleNext = useCallback(() => {
    const stepOrder: MorningSession["step"][] = ["sleep", "energy", "yesterday", "voice", "plan", "done"]
    const currentIndex = stepOrder.indexOf(morningSession?.step || "sleep")
    if (currentIndex < stepOrder.length - 1) {
      setMorningStep(stepOrder[currentIndex + 1])
    }
  }, [morningSession?.step, setMorningStep])

  const handleBack = useCallback(() => {
    const stepOrder: MorningSession["step"][] = ["sleep", "energy", "yesterday", "voice", "plan", "done"]
    const currentIndex = stepOrder.indexOf(morningSession.step)
    if (currentIndex > 0) {
      setMorningStep(stepOrder[currentIndex - 1])
    }
  }, [morningSession.step, setMorningStep])

  const handleGeneratePlan = async () => {
    setAILoading(true)
    setAIError(null)

    try {
      const pendingTasks = getTodayTasks()
        .filter((t) => t.status !== "done")
        .map((t) => `- ${t.title} (${t.priority})`)
        .join("\n") || "нет"

      const decisions = Object.entries(morningSession.yesterdayTaskDecisions)
        .map(([id, action]) => {
          const task = yesterdayTasks.find((t) => t.id === id)
          if (!task) return null
          const actionLabel = action === "move" ? "перенести" : action === "delete" ? "удалить" : "позже"
          return `${task.title} → ${actionLabel}`
        })
        .filter(Boolean)
        .join(", ") || "нет решений"

      const result = await generateMorningPlan(
        morningSession.sleepScore,
        morningSession.sleepTime,
        morningSession.wakeTime,
        morningSession.energyLevel,
        morningSession.motivationScore,
        voiceInput || morningSession.voiceNotes,
        morningSession.focusOfTheDay,
        getPatternsSummary(),
        pendingTasks,
        yesterdayData,
        decisions,
        getSemanticSummary(),
      )

      const userMsg: AIConversationMessage = {
        role: "user",
        content: `Сон: ${morningSession.sleepScore}/10, ${morningSession.sleepTime}–${morningSession.wakeTime}. Энергия: ${morningSession.energyLevel}. Фокус: ${morningSession.focusOfTheDay || "не указан"}. Заметки: ${voiceInput || morningSession.voiceNotes}`,
        timestamp: new Date().toISOString(),
      }
      const aiMsg: AIConversationMessage = {
        role: "assistant",
        content: `${result.greeting}\n\nПлан:\n${result.plan.map((t) => `- ${t.title}`).join("\n")}\n\n${result.commentary}`,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(today, userMsg)
      addConversationMessage(today, aiMsg)

      setVoiceNotes(voiceInput)
      setAIPlan(result.plan, result.greeting, result.commentary, result.encouragement)
      setMorningStep("plan")
    } catch (e: any) {
      setAIError(e.message || "Ошибка при генерации плана")
    } finally {
      setAILoading(false)
    }
  }

  const handleAcceptPlan = async () => {
    if (isCompleting.current) return
    isCompleting.current = true

    const decisions = morningSession.yesterdayTaskDecisions || {}
    const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd")
    Object.entries(decisions).forEach(([id, action]) => {
      if (action === "delete") {
        deleteTask(id)
      } else if (action === "move") {
        updateTaskDueDate(id, today)
      } else if (action === "later") {
        updateTaskDueDate(id, tomorrow)
      }
    })

    const aiPlan = morningSession.aiPlan || []
    const newTasks: Task[] = aiPlan.map((task: DayPlanTask, i: number) => ({
      id: uuidv4(),
      title: task.title,
      priority: task.priority,
      category: task.category,
      timeBlock: task.suggestedTime,
      status: "todo" as const,
      aiGenerated: true,
      aiNotes: task.aiNote,
      dueDate: today,
      createdAt: new Date().toISOString(),
      order: i,
    }))

    addTasks(newTasks)

    const plan = {
      date: today,
      taskIds: newTasks.map((t) => t.id),
      sleepScore: morningSession.sleepScore,
      sleepTime: morningSession.sleepTime,
      wakeTime: morningSession.wakeTime,
      energyLevel: morningSession.energyLevel,
      motivationScore: morningSession.motivationScore,
      voiceNotes: voiceInput,
      focusOfTheDay: morningSession.focusOfTheDay,
      aiSummary: morningSession.aiGreeting,
      aiCommentary: morningSession.aiCommentary,
      completed: false,
      originalPlan: aiPlan,
    }
    saveDayPlan(plan)

    const movedCategories = Object.entries(decisions)
      .filter(([, action]) => action === "move")
      .map(([id]) => yesterdayTasks.find((t) => t.id === id)?.category)
      .filter(Boolean)

    recordDayData(
      morningSession.sleepScore,
      morningSession.sleepTime,
      morningSession.wakeTime,
      morningSession.energyLevel,
      morningSession.motivationScore,
      newTasks.length,
      0,
      movedCategories as any,
    )

    const history = getConversationHistory(today)
    if (history.length > 0) {
      extractSemanticMemoryForSave()
    }

    const planText = (morningSession.aiPlan || [])
      .map(
        (t: DayPlanTask, i: number) =>
          `${i + 1}. ${timeBlockEmojis[t.suggestedTime]} ${t.title} — ${priorityLabels[t.priority]}`,
      )
      .join("\n")

    await sendMorningPlan(`${morningSession.aiGreeting}\n\n${planText}\n\n${morningSession.aiEncouragement}`)

    resetMorningSession()
    onComplete()
  }

  const extractSemanticMemoryForSave = () => {
    import("@/services/ai").then(({ extractSemanticMemory }) => {
      const history = getConversationHistory(today)
      const conversation = history.map((m) => `${m.role === "user" ? "Я" : "AI"}: ${m.content}`).join("\n\n")
      extractSemanticMemory(conversation, voiceInput, JSON.stringify(morningSession.aiPlan)).then((extracted) => {
        if (!isMounted.current) return
        const hasNew = (extracted.facts?.length || 0) + (extracted.goals?.length || 0) + (extracted.preferences?.length || 0) + (extracted.projects?.length || 0)
        if (hasNew > 0) {
          setSemanticMemory({
            facts: [...new Set([...(semanticMemory.facts || []), ...(extracted.facts || [])])],
            goals: [...new Set([...(semanticMemory.goals || []), ...(extracted.goals || [])])],
            preferences: [...new Set([...(semanticMemory.preferences || []), ...(extracted.preferences || [])])],
            projects: [...new Set([...(semanticMemory.projects || []), ...(extracted.projects || [])])],
            lastUpdated: new Date().toISOString(),
          })
        }
      }).catch(() => {})
    })
  }

  const handleAdjustPlan = async () => {
    if (!adjustInput.trim()) return
    setIsAdjusting(true)
    try {
      const newPlan = await adjustPlan(
        morningSession.aiPlan,
        adjustInput,
        morningSession.sleepScore,
        morningSession.motivationScore,
        getPatternsSummary(),
        getSemanticSummary(),
      )
      setAIPlan(newPlan, morningSession.aiGreeting, morningSession.aiCommentary, morningSession.aiEncouragement)

      const userMsg: AIConversationMessage = {
        role: "user",
        content: `Корректировка: ${adjustInput}`,
        timestamp: new Date().toISOString(),
      }
      const aiMsg: AIConversationMessage = {
        role: "assistant",
        content: `Обновлённый план:\n${newPlan.map((t) => `- ${t.title}`).join("\n")}`,
        timestamp: new Date().toISOString(),
      }
      addConversationMessage(today, userMsg)
      addConversationMessage(today, aiMsg)

      setAdjustInput("")
    } catch (e: any) {
      setAIError(e.message || "Ошибка при корректировке")
    } finally {
      setIsAdjusting(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false)
      return
    }

    speechTextRef.current = voiceInput

    const { stop } = startSpeechRecognition(
      (text, isFinal) => {
        if (isFinal) {
          speechTextRef.current += (speechTextRef.current ? " " : "") + text
          setVoiceInput(speechTextRef.current)
        }
      },
      () => {
        setIsListening(false)
      },
      () => {
        setIsListening(false)
      },
      "ru-RU",
    )

    setIsListening(true)

    setTimeout(() => {
      stop()
      setIsListening(false)
    }, 15000)
  }

  const renderTimePicker = (label: string, value: string, onChange: (time: string) => void) => {
    const [h, m] = (value || "00:00").split(":").map(Number)
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">{label}</p>
        <div className="flex justify-center gap-4">
          <div className="space-y-2">
            <button
              onClick={() => onChange(`${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`)}
              className="w-14 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-semibold">
              {String(h).padStart(2, "0")}
            </div>
            <button
              onClick={() => onChange(`${String((h - 1 + 24) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`)}
              className="w-14 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center text-2xl font-semibold">:</div>
          <div className="space-y-2">
            <button
              onClick={() => {
                const idx = minutes.indexOf(String(m).padStart(2, "0"))
                const nextM = minutes[(idx + 1) % minutes.length]
                onChange(`${String(h).padStart(2, "0")}:${nextM}`)
              }}
              className="w-14 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-semibold">
              {String(m).padStart(2, "0")}
            </div>
            <button
              onClick={() => {
                const idx = minutes.indexOf(String(m).padStart(2, "0"))
                const prevM = minutes[(idx - 1 + minutes.length) % minutes.length]
                onChange(`${String(h).padStart(2, "0")}:${prevM}`)
              }}
              className="w-14 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (morningSession.step) {
      case "sleep":
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Как спала?</h2>
              <p className="text-muted-foreground">Оцени качество и время сна</p>
            </div>

            <div>
              <p className="text-sm font-medium text-center mb-3">Качество сна</p>
              <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSleepScore(n)}
                    className={`h-14 rounded-2xl text-lg font-medium transition-all active:scale-95 ${
                      morningSession.sleepScore === n
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "bg-card border border-border hover:border-primary/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center gap-8">
              {renderTimePicker("Легла в", morningSession.sleepTime, setSleepTime)}
              {renderTimePicker("Встала в", morningSession.wakeTime, setWakeTime)}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={morningSession.sleepScore === 0} size="lg">
                Далее <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case "energy":
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Как энергия?</h2>
              <p className="text-muted-foreground">Физическое состояние прямо сейчас</p>
            </div>
            <div className="space-y-3 max-w-sm mx-auto">
              {energyOptions.map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => setEnergyLevel(opt.level)}
                  className={`w-full h-16 rounded-2xl text-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-3 ${
                    morningSession.energyLevel === opt.level
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleNext} size="lg">
                Далее <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case "yesterday":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Вчерашние задачи</h2>
              <p className="text-muted-foreground">Что делать с незавершёнными?</p>
            </div>

            {yesterdayPending.length > 0 ? (
              <div className="space-y-2">
                {yesterdayPending.map((task) => {
                  const decisions = morningSession.yesterdayTaskDecisions || {}
                  const decision = decisions[task.id]
                  return (
                    <Card key={task.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex-1">{task.title}</span>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => {
                              const newDecisions = { ...decisions, [task.id]: "move" as const }
                              setYesterdayTaskDecisions(newDecisions)
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              decision === "move" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Перенести
                          </button>
                          <button
                            onClick={() => {
                              const newDecisions = { ...decisions, [task.id]: "later" as const }
                              setYesterdayTaskDecisions(newDecisions)
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              decision === "later" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Позже
                          </button>
                          <button
                            onClick={() => {
                              const newDecisions = { ...decisions, [task.id]: "delete" as const }
                              setYesterdayTaskDecisions(newDecisions)
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              decision === "delete" ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Нет незавершённых задач</p>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleNext} size="lg">
                Далее <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case "voice":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Что на уме сегодня?</h2>
              <p className="text-muted-foreground">Напиши или надиктуй</p>
            </div>
            <Textarea
              placeholder="Хочу закончить проект, сходить на прогулку..."
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              className="min-h-[100px]"
            />

            <div className="space-y-2">
              <p className="text-sm font-medium text-center">Главный фокус дня</p>
              <Input
                placeholder="Самое важное сегодня..."
                value={morningSession.focusOfTheDay}
                onChange={(e) => setFocusOfTheDay(e.target.value)}
                className="h-12"
              />
            </div>

            {isSpeechSupported() && (
              <div className="flex justify-center">
                <Button
                  variant={isListening ? "destructive" : "soft"}
                  size="lg"
                  onClick={toggleListening}
                  className="rounded-full"
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" /> Слушаю...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" /> Надиктовать
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleGeneratePlan} size="lg">
                <Sparkles className="mr-2 h-4 w-4" /> Составить план
              </Button>
            </div>
          </div>
        )

      case "plan":
        if (morningSession.isLoading) {
          return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Составляю план...</p>
            </div>
          )
        }

        if (morningSession.error) {
          return (
            <div className="space-y-6 text-center">
              <p className="text-destructive">{morningSession.error}</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setAIError(null)}>
                  Попробовать снова
                </Button>
                <Button onClick={handleBack}>Назад</Button>
              </div>
            </div>
          )
        }

        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">{morningSession.aiGreeting || "Вот план на день"}</h2>
            </div>

            {morningSession.aiCommentary && (
              <Card className="p-4 bg-secondary/30 border-secondary/50">
                <p className="text-sm text-muted-foreground leading-relaxed italic">
                  {morningSession.aiCommentary}
                </p>
              </Card>
            )}

            <div className="space-y-3">
              {(morningSession.aiPlan || []).map((task: DayPlanTask, i: number) => (
                <Card key={i} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{timeBlockEmojis[task.suggestedTime]}</span>
                        <span className="font-medium">{task.title}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="soft" className="text-xs">
                          {timeBlockLabels[task.suggestedTime]}
                        </Badge>
                        <Badge
                          variant={
                            task.priority === "high"
                              ? "destructive"
                              : task.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {priorityLabels[task.priority]}
                        </Badge>
                      </div>
                      {task.aiNote && (
                        <p className="text-sm text-muted-foreground">{task.aiNote}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 h-12 rounded-xl border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Хочу что-то изменить..."
                  value={adjustInput}
                  onChange={(e) => setAdjustInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdjustPlan()}
                />
                <Button onClick={handleAdjustPlan} disabled={isAdjusting || !adjustInput.trim()} size="icon">
                  {isAdjusting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground italic">
              {morningSession.aiEncouragement}
            </p>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleAcceptPlan} size="lg">
                <Check className="mr-2 h-4 w-4" /> Всё ок!
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background safe-bottom overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => {
              resetMorningSession()
              onComplete()
            }}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex gap-1.5">
            {(["sleep", "energy", "yesterday", "voice", "plan"] as const).map((step, i) => {
              const stepOrder = ["sleep", "energy", "yesterday", "voice", "plan", "done"]
              const currentIdx = stepOrder.indexOf(morningSession.step)
              return (
                <div
                  key={step}
                  className={`h-1.5 w-6 rounded-full transition-all ${
                    i < currentIdx
                      ? "bg-primary"
                      : i === currentIdx
                        ? "bg-primary/60"
                        : "bg-muted"
                  }`}
                />
              )
            })}
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            key={morningSession.step}
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </div>

        <div className="p-4 safe-bottom" />
      </div>
    </div>
  )
}

export default MorningRoutine
