import { useState } from "react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from "date-fns"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Check, X, Loader2, Moon, Sun, Download, Upload, Trash2, CalendarDays, CalendarRange, Calendar, Brain, Plus, Trash, BarChart3 } from "lucide-react"
import TabBar from "@/components/layout/TabBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/store/useStore"
import { testGroqKey } from "@/services/ai"
import { testTelegramConnection } from "@/services/telegram"
import { exportData, importData, clearAllData } from "@/lib/storage"
import { resetGroqClient } from "@/services/groq"
import { generateDailySummary, generateWeeklySummary, generateMonthlySummary } from "@/services/ai"
import { toast } from "sonner"

const SettingsPage = () => {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const tasks = useStore((s) => s.tasks)
  const dayPlans = useStore((s) => s.dayPlans)
  const getPatternsSummary = useStore((s) => s.getPatternsSummary)
  const saveDailySummary = useStore((s) => s.saveDailySummary)
  const saveWeeklySummary = useStore((s) => s.saveWeeklySummary)
  const saveMonthlySummary = useStore((s) => s.saveMonthlySummary)
  const getWeekKey = useStore((s) => s.getWeekKey)
  const getMonthKey = useStore((s) => s.getMonthKey)
  const getDiaryEntriesForPeriod = useStore((s) => s.getDiaryEntriesForPeriod)

  const [showApiKey, setShowApiKey] = useState(false)
  const [showBotToken, setShowBotToken] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyValid, setKeyValid] = useState<boolean | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramOk, setTelegramOk] = useState<boolean | null>(null)
  const [summarizing, setSummarizing] = useState<string | null>(null)
  const [memoryTab, setMemoryTab] = useState<"facts" | "goals" | "preferences" | "projects">("facts")
  const [newMemoryItem, setNewMemoryItem] = useState("")
  const semanticMemory = useStore((s) => s.semanticMemory)
  const addSemanticFact = useStore((s) => s.addSemanticFact)
  const removeSemanticFact = useStore((s) => s.removeSemanticFact)
  const addSemanticGoal = useStore((s) => s.addSemanticGoal)
  const removeSemanticGoal = useStore((s) => s.removeSemanticGoal)
  const addSemanticPreference = useStore((s) => s.addSemanticPreference)
  const removeSemanticPreference = useStore((s) => s.removeSemanticPreference)
  const addSemanticProject = useStore((s) => s.addSemanticProject)
  const removeSemanticProject = useStore((s) => s.removeSemanticProject)

  const handleAddMemory = () => {
    if (!newMemoryItem.trim()) return
    switch (memoryTab) {
      case "facts": addSemanticFact(newMemoryItem.trim()); break
      case "goals": addSemanticGoal(newMemoryItem.trim()); break
      case "preferences": addSemanticPreference(newMemoryItem.trim()); break
      case "projects": addSemanticProject(newMemoryItem.trim()); break
    }
    setNewMemoryItem("")
  }

  const handleRemoveMemory = (index: number) => {
    switch (memoryTab) {
      case "facts": removeSemanticFact(index); break
      case "goals": removeSemanticGoal(index); break
      case "preferences": removeSemanticPreference(index); break
      case "projects": removeSemanticProject(index); break
    }
  }

  const memoryItems = semanticMemory[memoryTab] || []
  const memoryLabels: Record<string, string> = {
    facts: "Факты",
    goals: "Цели",
    preferences: "Предпочтения",
    projects: "Проекты",
  }

  const handleTestKey = async () => {
    if (!settings.groqApiKey) return
    setTestingKey(true)
    setKeyValid(null)
    const valid = await testGroqKey(settings.groqApiKey)
    setKeyValid(valid)
    setTestingKey(false)
    if (valid) {
      resetGroqClient()
    }
  }

  const handleTestTelegram = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) return
    setTestingTelegram(true)
    setTelegramOk(null)
    const ok = await testTelegramConnection()
    setTelegramOk(ok)
    setTestingTelegram(false)
  }

  const handleExport = async () => {
    const data = await exportData()
    if (data) {
      const blob = new Blob([data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `flowday-backup-${format(new Date(), "yyyy-MM-dd")}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      await importData(text)
    }
    input.click()
  }

  const handleClear = async () => {
    if (window.confirm("Удалить все данные? Это действие нельзя отменить.")) {
      await clearAllData()
    }
  }

  const handleDailySummary = async () => {
    if (!settings.groqApiKey) {
      toast.error("Нужен Groq API ключ")
      return
    }
    setSummarizing("daily")
    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const dayPlan = dayPlans[today]
      const dayTasks = tasks.filter((t) => t.dueDate === today)
      const completed = dayTasks.filter((t) => t.status === "done")
      const pending = dayTasks.filter((t) => t.status !== "done")
      const manual = dayTasks.filter((t) => !t.aiGenerated)

      const summary = await generateDailySummary(
        today,
        dayTasks.length,
        completed.length,
        dayPlan?.sleepScore || 0,
        dayPlan?.sleepTime || "23:00",
        dayPlan?.wakeTime || "07:00",
        dayPlan?.energyLevel || "medium",
        dayPlan?.motivationScore || 0,
        dayPlan?.voiceNotes || "",
        completed.map((t) => t.title).join(", "),
        pending.map((t) => t.title).join(", "),
        manual.map((t) => t.title).join(", "),
        getPatternsSummary(),
        getDiaryEntriesForPeriod(today),
      )

      saveDailySummary(today, summary)
      toast.success("Саммаризация дня сохранена")
    } catch (e: any) {
      toast.error(e.message || "Ошибка")
    } finally {
      setSummarizing(null)
    }
  }

  const handleWeeklySummary = async () => {
    if (!settings.groqApiKey) {
      toast.error("Нужен Groq API ключ")
      return
    }
    setSummarizing("weekly")
    try {
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

      let dailyData = ""
      let diaryEntries = ""
      for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd")
        const plan = dayPlans[dateStr]
        const dayTasks = tasks.filter((t) => t.dueDate === dateStr)
        const completed = dayTasks.filter((t) => t.status === "done").length
        dailyData += `${format(day, "dd.MM")}: задач ${dayTasks.length}, выполнено ${completed}${plan ? `, сон ${plan.sleepScore}/10, мотивация ${plan.motivationScore}/10` : ""}\n`
        const entries = getDiaryEntriesForPeriod(dateStr)
        if (entries !== "нет записей в дневнике") {
          diaryEntries += `${dateStr}: ${entries}\n\n`
        }
      }

      const summary = await generateWeeklySummary(
        format(weekStart, "dd.MM.yyyy"),
        format(weekEnd, "dd.MM.yyyy"),
        dailyData,
        getPatternsSummary(),
        diaryEntries,
      )

      const weekKey = getWeekKey(now)
      saveWeeklySummary(weekKey, summary)
      toast.success("Саммаризация недели сохранена")
    } catch (e: any) {
      toast.error(e.message || "Ошибка")
    } finally {
      setSummarizing(null)
    }
  }

  const handleMonthlySummary = async () => {
    if (!settings.groqApiKey) {
      toast.error("Нужен Groq API ключ")
      return
    }
    setSummarizing("monthly")
    try {
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      const weeks = [
        { start: monthStart, end: endOfWeek(monthStart, { weekStartsOn: 1 }) },
      ]
      let current = startOfWeek(monthStart, { weekStartsOn: 1 })
      while (current < monthEnd) {
        current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
        if (current <= monthEnd) {
          weeks.push({ start: current, end: endOfWeek(current, { weekStartsOn: 1 }) > monthEnd ? monthEnd : endOfWeek(current, { weekStartsOn: 1 }) })
        }
      }

      let weeklyData = ""
      for (const w of weeks) {
        const days = eachDayOfInterval({ start: w.start, end: w.end })
        let totalTasks = 0
        let totalCompleted = 0
        for (const day of days) {
          const dateStr = format(day, "yyyy-MM-dd")
          const dayTasks = tasks.filter((t) => t.dueDate === dateStr)
          totalTasks += dayTasks.length
          totalCompleted += dayTasks.filter((t) => t.status === "done").length
        }
        weeklyData += `Неделя ${format(w.start, "dd.MM")}–${format(w.end, "dd.MM")}: задач ${totalTasks}, выполнено ${totalCompleted}\n`
      }

      const summary = await generateMonthlySummary(
        format(now, "MMMM yyyy"),
        weeklyData,
        getPatternsSummary(),
      )

      const monthKey = getMonthKey(now)
      saveMonthlySummary(monthKey, summary)
      toast.success("Саммаризация месяца сохранена")
    } catch (e: any) {
      toast.error(e.message || "Ошибка")
    } finally {
      setSummarizing(null)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-semibold mb-6">Настройки</h1>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Профиль</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    placeholder="Как тебя называть?"
                    value={settings.name}
                    onChange={(e) => updateSettings({ name: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/stats")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Статистика</p>
                  <p className="text-xs text-muted-foreground">AI-анализ, тренды и рекомендации</p>
                </div>
                <span className="text-muted-foreground text-sm">→</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI (Groq)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="gsk_..."
                      value={settings.groqApiKey}
                      onChange={(e) => {
                        updateSettings({ groqApiKey: e.target.value })
                        setKeyValid(null)
                      }}
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTestKey}
                    disabled={testingKey || !settings.groqApiKey}
                    size="sm"
                    variant="soft"
                  >
                    {testingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : keyValid === true ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : keyValid === false ? (
                      <X className="h-4 w-4 mr-1 text-destructive" />
                    ) : null}
                    Проверить ключ
                  </Button>
                  {keyValid === true && <span className="text-xs text-green-500">Ключ работает</span>}
                  {keyValid === false && <span className="text-xs text-destructive">Ключ не работает</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Получи ключ на{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    console.groq.com
                  </a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Telegram бот</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <div className="relative">
                    <Input
                      type={showBotToken ? "text" : "password"}
                      placeholder="123456:ABC-DEF..."
                      value={settings.telegramBotToken}
                      onChange={(e) => {
                        updateSettings({ telegramBotToken: e.target.value })
                        setTelegramOk(null)
                      }}
                    />
                    <button
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input
                    placeholder="123456789"
                    value={settings.telegramChatId}
                    onChange={(e) => {
                      updateSettings({ telegramChatId: e.target.value })
                      setTelegramOk(null)
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTestTelegram}
                    disabled={testingTelegram || !settings.telegramBotToken || !settings.telegramChatId}
                    size="sm"
                    variant="soft"
                  >
                    {testingTelegram ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : telegramOk === true ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : telegramOk === false ? (
                      <X className="h-4 w-4 mr-1 text-destructive" />
                    ) : null}
                    Тест отправки
                  </Button>
                  {telegramOk === true && <span className="text-xs text-green-500">Бот работает</span>}
                  {telegramOk === false && <span className="text-xs text-destructive">Ошибка</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Необязательно. Бот будет получать утренний план и вечерний отчёт.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Саммаризация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleDailySummary}
                  disabled={summarizing !== null}
                  className="w-full justify-start"
                >
                  {summarizing === "daily" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarDays className="h-4 w-4 mr-2" />
                  )}
                  Саммаризировать день
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWeeklySummary}
                  disabled={summarizing !== null}
                  className="w-full justify-start"
                >
                  {summarizing === "weekly" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CalendarRange className="h-4 w-4 mr-2" />
                  )}
                  Саммаризировать неделю
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMonthlySummary}
                  disabled={summarizing !== null}
                  className="w-full justify-start"
                >
                  {summarizing === "monthly" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calendar className="h-4 w-4 mr-2" />
                  )}
                  Саммаризировать месяц
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Память AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  То, что AI знает о тебе. Эти данные используются при составлении плана и корректировке дня.
                </p>
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {(["facts", "goals", "preferences", "projects"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMemoryTab(tab)}
                      className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                        memoryTab === tab ? "bg-card shadow-sm font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {memoryLabels[tab]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={`Добавить ${memoryLabels[memoryTab].toLowerCase()}...`}
                    value={newMemoryItem}
                    onChange={(e) => setNewMemoryItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMemory()}
                    className="h-10 text-sm"
                  />
                  <Button onClick={handleAddMemory} size="icon" variant="soft" className="h-10 w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {memoryItems.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {memoryItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-sm text-foreground">{item}</span>
                        <button
                          onClick={() => handleRemoveMemory(i)}
                          className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Тема</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant={settings.theme === "light" ? "default" : "outline"}
                    onClick={() => updateSettings({ theme: "light" })}
                    className="flex-1"
                  >
                    <Sun className="h-4 w-4 mr-2" /> Светлая
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "default" : "outline"}
                    onClick={() => updateSettings({ theme: "dark" })}
                    className="flex-1"
                  >
                    <Moon className="h-4 w-4 mr-2" /> Тёмная
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Данные</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" onClick={handleExport} className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" /> Экспорт JSON
                </Button>
                <Button variant="outline" onClick={handleImport} className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" /> Импорт JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Очистить всё
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <TabBar onAddTask={() => {}} />
      </div>
    </>
  )
}

export default SettingsPage
