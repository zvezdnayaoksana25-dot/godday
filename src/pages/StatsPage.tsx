import { useState, useEffect } from "react"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import TabBar from "@/components/layout/TabBar"
import { useStore } from "@/store/useStore"
import { generateAIStats } from "@/services/ai"
import { BarChart3, TrendingUp, Calendar, Sparkles, Target, Award, Zap, Lightbulb, Loader2, RefreshCw, ArrowLeft } from "lucide-react"

const categoryEmojis: Record<string, string> = {
  work: "💼",
  personal: "🏠",
  health: "🌿",
  study: "📚",
  errand: "🛒",
  other: "📝",
}

const categoryLabels: Record<string, string> = {
  work: "Работа",
  personal: "Личное",
  health: "Здоровье",
  study: "Учёба",
  errand: "Дела",
  other: "Другое",
}

const StatsPage = () => {
  const navigate = useNavigate()
  const tasks = useStore((s) => s.tasks)
  const patterns = useStore((s) => s.patterns)
  const dayPlans = useStore((s) => s.dayPlans)
  const getPatternsSummary = useStore((s) => s.getPatternsSummary)
  const settings = useStore((s) => s.settings)
  const dailySummaries = useStore((s) => s.dailySummaries)
  const aiStats = useStore((s) => s.aiStats)
  const saveAIStats = useStore((s) => s.saveAIStats)
  const getDiaryEntriesForPeriod = useStore((s) => s.getDiaryEntriesForPeriod)

  const [isLoading, setIsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "done").length
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0
  const totalDays = Object.keys(dayPlans).length

  const avgMotivation =
    patterns.motivationHistory.length > 0
      ? patterns.motivationHistory.reduce((sum, m) => sum + m.score, 0) / patterns.motivationHistory.length
      : 0
  const avgSleep =
    patterns.sleepHistory.length > 0
      ? patterns.sleepHistory.reduce((sum, s) => sum + s.score, 0) / patterns.sleepHistory.length
      : 0

  const categoryStats: Record<string, { total: number; completed: number }> = {}
  tasks.forEach((t) => {
    if (!categoryStats[t.category]) categoryStats[t.category] = { total: 0, completed: 0 }
    categoryStats[t.category].total++
    if (t.status === "done") categoryStats[t.category].completed++
  })

  const categoryStatsStr = Object.entries(categoryStats)
    .map(([cat, stats]) => `${categoryLabels[cat]}: ${stats.completed}/${stats.total}`)
    .join(", ") || "нет данных"

  const recentSummariesStr = Object.entries(dailySummaries)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5)
    .map(([date, s]) => `${date}: ${s.summary}`)
    .join(". ") || "нет"

  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  })

  const last7DaysData = last7Days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd")
    const dayTasks = tasks.filter((t) => t.dueDate === dateStr)
    const completed = dayTasks.filter((t) => t.status === "done").length
    return {
      date: format(day, "dd"),
      dayName: format(day, "EEE"),
      total: dayTasks.length,
      completed,
      rate: dayTasks.length > 0 ? (completed / dayTasks.length) * 100 : 0,
    }
  })

  const maxTasks = Math.max(...last7DaysData.map((d) => d.total), 1)

  const handleGenerateStats = async () => {
    if (!settings.groqApiKey) return
    setIsLoading(true)
    setStatsError(null)
    try {
      const diaryEntriesStr = Object.entries(dailySummaries)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 7)
        .map(([date]) => getDiaryEntriesForPeriod(date))
        .filter((e) => e !== "нет записей в дневнике")
        .join(". ") || "нет"

      const result = await generateAIStats(
        totalTasks,
        completedTasks,
        totalDays,
        completionRate,
        avgMotivation,
        avgSleep,
        categoryStatsStr,
        getPatternsSummary(),
        recentSummariesStr,
        diaryEntriesStr,
      )
      saveAIStats(JSON.stringify(result))
    } catch (e: any) {
      setStatsError(e.message || "Ошибка")
    } finally {
      setIsLoading(false)
    }
  }

  let parsedStats: {
    completionRate: number
    streakDays: number
    avgTasksPerDay: number
    bestDay: string
    bestCategory: string
    insight: string
    patterns: string
    weeklyTrend: string
    recommendations: string[]
  } | null = null

  if (aiStats) {
    try {
      parsedStats = JSON.parse(aiStats)
    } catch {
      parsedStats = null
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate("/settings")}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-semibold flex-1">Статистика</h1>
            {settings.groqApiKey && (
              <button
                onClick={handleGenerateStats}
                disabled={isLoading}
                className="h-9 px-4 rounded-full bg-primary/10 text-primary flex items-center gap-2 text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {aiStats ? "Обновить" : "AI-анализ"}
              </button>
            )}
          </div>

          {parsedStats && (
            <Card className="p-4 mb-6 bg-gradient-to-br from-primary/5 to-secondary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-medium mb-1">Инсайт</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {parsedStats.insight}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {statsError && (
            <Card className="p-4 mb-6 border-destructive/30">
              <p className="text-sm text-destructive">{statsError}</p>
              <button
                onClick={handleGenerateStats}
                className="text-sm text-primary mt-2 hover:underline"
              >
                Попробовать снова
              </button>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Выполнено</span>
              </div>
              <p className="text-2xl font-semibold">
                {parsedStats ? `${parsedStats.completionRate}%` : `${(completionRate * 100).toFixed(0)}%`}
              </p>
              <Progress value={parsedStats ? parsedStats.completionRate : completionRate * 100} className="mt-2" />
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Серия дней</span>
              </div>
              <p className="text-2xl font-semibold">
                {parsedStats ? parsedStats.streakDays : totalDays}
              </p>
              <p className="text-xs text-muted-foreground">дней с планом</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Задач/день</span>
              </div>
              <p className="text-2xl font-semibold">
                {parsedStats ? parsedStats.avgTasksPerDay : (totalDays > 0 ? (totalTasks / totalDays).toFixed(1) : "—")}
              </p>
              <p className="text-xs text-muted-foreground">в среднем</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Лучший день</span>
              </div>
              <p className="text-2xl font-semibold">
                {parsedStats ? parsedStats.bestDay : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {parsedStats ? `Топ: ${parsedStats.bestCategory}` : `${avgMotivation.toFixed(1)}/10 мотивация`}
              </p>
            </Card>
          </div>

          {parsedStats && (
            <>
              <Card className="p-4 mb-6">
                <h3 className="text-sm font-medium mb-3">Тренд недели</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {parsedStats.weeklyTrend}
                </p>
              </Card>

              <Card className="p-4 mb-6">
                <h3 className="text-sm font-medium mb-3">Паттерны</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {parsedStats.patterns}
                </p>
              </Card>

              {parsedStats.recommendations.length > 0 && (
                <Card className="p-4 mb-6">
                  <h3 className="text-sm font-medium mb-3">Рекомендации</h3>
                  <div className="space-y-2">
                    {parsedStats.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-primary text-sm mt-0.5">•</span>
                        <p className="text-sm text-muted-foreground">{rec}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          <Card className="p-4 mb-6">
            <h3 className="text-sm font-medium mb-4">Последние 7 дней</h3>
            <div className="flex items-end gap-2 h-32">
              {last7DaysData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: `${(d.total / maxTasks) * 80}%`, minHeight: d.total > 0 ? "4px" : "0" }}>
                    {d.completed > 0 && (
                      <div
                        className="w-full rounded-sm bg-primary"
                        style={{ height: `${(d.completed / Math.max(d.total, 1)) * 100}%` }}
                      />
                    )}
                    {d.total - d.completed > 0 && (
                      <div
                        className="w-full rounded-sm bg-primary/30"
                        style={{ height: `${((d.total - d.completed) / Math.max(d.total, 1)) * 100}%` }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.date}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                <span>Выполнено</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm bg-primary/30" />
                <span>Осталось</span>
              </div>
            </div>
          </Card>

          {Object.keys(categoryStats).length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-sm font-medium mb-4">По категориям</h3>
              <div className="space-y-3">
                {Object.entries(categoryStats)
                  .sort((a, b) => {
                    const rateA = a[1].total > 0 ? a[1].completed / a[1].total : 0
                    const rateB = b[1].total > 0 ? b[1].completed / b[1].total : 0
                    return rateB - rateA
                  })
                  .map(([cat, stats]) => {
                    const rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {categoryEmojis[cat]} {categoryLabels[cat]}
                          </span>
                          <span className="text-muted-foreground">
                            {stats.completed}/{stats.total}
                          </span>
                        </div>
                        <Progress value={rate} className="h-1.5" />
                      </div>
                    )
                  })}
              </div>
            </Card>
          )}

          {patterns.motivationHistory.length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-sm font-medium mb-3">Мотивация и сон (последние записи)</h3>
              <div className="space-y-2">
                {patterns.motivationHistory.slice(-7).map((m, i) => {
                  const sleep = patterns.sleepHistory[i]
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{m.date}</span>
                      <div className="flex gap-4">
                        <span className="text-xs">
                          <Sparkles className="h-3 w-3 inline mr-1" />
                          {m.score}/10
                        </span>
                        {sleep && (
                          <span className="text-xs">
                            🌙 {sleep.score}/10
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {Object.keys(dailySummaries).length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-sm font-medium mb-3">Саммаризации дней</h3>
              <div className="space-y-3">
                {Object.entries(dailySummaries)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 5)
                  .map(([date, summary]) => (
                    <div key={date} className="space-y-1">
                      <Badge variant="secondary" className="text-xs">{date}</Badge>
                      <p className="text-sm text-muted-foreground leading-relaxed">{summary.summary}</p>
                      <p className="text-xs text-muted-foreground italic">Настроение: {summary.mood}</p>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {!aiStats && settings.groqApiKey && (
            <Card className="p-6 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="text-sm font-medium mb-1">AI-анализ статистики</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Нажми кнопку сверху, чтобы AI проанализировал твои данные и дал инсайты
              </p>
              <button
                onClick={handleGenerateStats}
                disabled={isLoading}
                className="h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Анализирую...
                  </span>
                ) : (
                  "Получить анализ"
                )}
              </button>
            </Card>
          )}
        </div>

        <TabBar onAddTask={() => {}} />
      </div>
    </>
  )
}

export default StatsPage
