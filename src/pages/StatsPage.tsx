import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import TabBar from "@/components/layout/TabBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useStore } from "@/store/useStore"
import { useState } from "react"
import { BarChart3, TrendingUp, Calendar, Sparkles } from "lucide-react"

const StatsPage = () => {
  const navigate = useNavigate()
  const { tasks, patterns, dayPlans, getPatternsSummary } = useStore()
  const [showAIInsight, setShowAIInsight] = useState(false)

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === "done").length
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

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

  return (
    <>
      <motion.div
        className="min-h-screen bg-background pb-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-semibold mb-6">Статистика</h1>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Выполнено</span>
              </div>
              <p className="text-2xl font-semibold">{completionRate.toFixed(0)}%</p>
              <Progress value={completionRate} className="mt-2" />
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Всего задач</span>
              </div>
              <p className="text-2xl font-semibold">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">{completedTasks} выполнено</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Дней с планом</span>
              </div>
              <p className="text-2xl font-semibold">{totalDays}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Мотивация</span>
              </div>
              <p className="text-2xl font-semibold">{avgMotivation.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Сон: {avgSleep.toFixed(1)}</p>
            </Card>
          </div>

          {Object.keys(categoryStats).length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-sm font-medium mb-4">По категориям</h3>
              <div className="space-y-3">
                {Object.entries(categoryStats).map(([cat, stats]) => {
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

          {getPatternsSummary && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2">Паттерны</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {getPatternsSummary()}
              </p>
              {patterns.frequentlyPostponedCategories.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Часто переносится: {patterns.frequentlyPostponedCategories.join(", ")}
                </p>
              )}
            </Card>
          )}
        </div>

        <TabBar onAddTask={() => {}} />
      </motion.div>
    </>
  )
}

export default StatsPage
