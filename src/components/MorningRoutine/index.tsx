import { useState, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { Mic, MicOff, Sparkles, Check, ArrowRight, ArrowLeft, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/store/useStore"
import { generateMorningPlan, adjustPlan } from "@/services/ai"
import { sendMorningPlan } from "@/services/telegram"
import { startSpeechRecognition, isSpeechSupported } from "@/services/speech"
import type { DayPlanTask, MorningSession, Task } from "@/types"
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

interface MorningRoutineProps {
  onComplete: () => void
}

const MorningRoutine = ({ onComplete }: MorningRoutineProps) => {
  const morningSession = useStore((s) => s.morningSession)
  const setMorningStep = useStore((s) => s.setMorningStep)
  const setSleepScore = useStore((s) => s.setSleepScore)
  const setMotivationScore = useStore((s) => s.setMotivationScore)
  const setVoiceNotes = useStore((s) => s.setVoiceNotes)
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

  const [voiceInput, setVoiceInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [adjustInput, setAdjustInput] = useState("")
  const [isAdjusting, setIsAdjusting] = useState(false)
  const isCompleting = useRef(false)

  const handleNext = useCallback(() => {
    const stepOrder: MorningSession["step"][] = ["sleep", "motivation", "voice", "plan", "done"]
    const currentIndex = stepOrder.indexOf(morningSession.step)
    if (currentIndex < stepOrder.length - 1) {
      setMorningStep(stepOrder[currentIndex + 1])
    }
  }, [morningSession.step, setMorningStep])

  const handleBack = useCallback(() => {
    const stepOrder: MorningSession["step"][] = ["sleep", "motivation", "voice", "plan", "done"]
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

      const result = await generateMorningPlan(
        morningSession.sleepScore,
        morningSession.motivationScore,
        voiceInput || morningSession.voiceNotes,
        getPatternsSummary(),
        pendingTasks,
      )

      setVoiceNotes(voiceInput)
      setAIPlan(result.plan, result.greeting, result.encouragement)
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

    const today = format(new Date(), "yyyy-MM-dd")

    const newTasks: Task[] = morningSession.aiPlan.map((task: DayPlanTask, i: number) => ({
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
      motivationScore: morningSession.motivationScore,
      voiceNotes: voiceInput,
      aiSummary: morningSession.aiGreeting,
      completed: false,
      originalPlan: morningSession.aiPlan,
    }
    saveDayPlan(plan)

    recordDayData(
      morningSession.sleepScore,
      morningSession.motivationScore,
      patterns.avgTasksPerDay,
      Math.round(patterns.avgTasksPerDay * patterns.avgCompletionRate),
      patterns.frequentlyPostponedCategories,
    )

    const planText = morningSession.aiPlan
      .map(
        (t: DayPlanTask, i: number) =>
          `${i + 1}. ${timeBlockEmojis[t.suggestedTime]} ${t.title} — ${priorityLabels[t.priority]}`,
      )
      .join("\n")

    await sendMorningPlan(`${morningSession.aiGreeting}\n\n${planText}\n\n${morningSession.aiEncouragement}`)

    resetMorningSession()
    onComplete()
  }

  const handleAdjustPlan = async () => {
    if (!adjustInput.trim()) return
    setIsAdjusting(true)
    try {
      const newPlan = await adjustPlan(morningSession.aiPlan, adjustInput)
      setAIPlan(newPlan, morningSession.aiGreeting, morningSession.aiEncouragement)
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

    let fullText = voiceInput

    const { stop } = startSpeechRecognition(
      (text, isFinal) => {
        if (isFinal) {
          fullText += (fullText ? " " : "") + text
          setVoiceInput(fullText)
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

  const renderStep = () => {
    switch (morningSession.step) {
      case "sleep":
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Как спала?</h2>
              <p className="text-muted-foreground">Оцени от 1 до 10</p>
            </div>
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
            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={morningSession.sleepScore === 0} size="lg">
                Далее <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )

      case "motivation":
        return (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Как настроение и мотивация?</h2>
              <p className="text-muted-foreground">Оцени от 1 до 10</p>
            </div>
            <div className="grid grid-cols-5 gap-3 max-w-sm mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setMotivationScore(n)}
                  className={`h-14 rounded-2xl text-lg font-medium transition-all active:scale-95 ${
                    morningSession.motivationScore === n
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "bg-card border border-border hover:border-primary/50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Назад
              </Button>
              <Button onClick={handleNext} disabled={morningSession.motivationScore === 0} size="lg">
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
              className="min-h-[150px]"
            />
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
              <h2 className="text-2xl font-semibold">{morningSession.aiGreeting || "Вот план на день ✨"}</h2>
            </div>

            <div className="space-y-3">
              {morningSession.aiPlan.map((task: DayPlanTask, i: number) => (
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
            {(["sleep", "motivation", "voice", "plan"] as const).map((step, i) => {
              const stepOrder = ["sleep", "motivation", "voice", "plan", "done"]
              const currentIdx = stepOrder.indexOf(morningSession.step)
              return (
                <div
                  key={step}
                  className={`h-1.5 w-8 rounded-full transition-all ${
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
