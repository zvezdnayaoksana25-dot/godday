import { useState, useEffect, useRef } from "react"
import { format, subDays } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { BookOpen, ChevronDown, Trash2, Loader2 } from "lucide-react"
import TabBar from "@/components/layout/TabBar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/store/useStore"
import { sendDiaryEntryToBackup } from "@/services/telegram"
import { extractSemanticMemory } from "@/services/ai"
import { v4 as uuidv4 } from "uuid"
import type { DiaryEntry } from "@/types"

const moodEmojis = ["😔", "😕", "😐", "🙂", "😊"]
const moodLabels = ["Плохо", "Так себе", "Нормально", "Хорошо", "Отлично"]

const DiaryPage = () => {
  const diaryEntries = useStore((s) => s.diaryEntries)
  const saveDiaryEntry = useStore((s) => s.saveDiaryEntry)
  const getEntriesByDate = useStore((s) => s.getEntriesByDate)
  const deleteDiaryEntry = useStore((s) => s.deleteDiaryEntry)
  const restoreFromBackup = useStore((s) => s.restoreFromBackup)
  const semanticMemory = useStore((s) => s.semanticMemory)
  const setSemanticMemory = useStore((s) => s.setSemanticMemory)
  const dayPlans = useStore((s) => s.dayPlans)
  const settings = useStore((s) => s.settings)

  const [content, setContent] = useState("")
  const [mood, setMood] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [savedCount, setSavedCount] = useState(0)
  const [voiceInput, setVoiceInput] = useState("")
  const isMounted = useRef(true)

  useEffect(() => {
    restoreFromBackup()
    return () => { isMounted.current = false }
  }, [])

  const today = format(new Date(), "yyyy-MM-dd")
  const todayEntries = getEntriesByDate(today)

  const handleSave = async () => {
    if (!content.trim()) return
    setIsSaving(true)

    const entry: DiaryEntry = {
      id: uuidv4(),
      date: today,
      content: content.trim(),
      mood: mood || undefined,
      createdAt: new Date().toISOString(),
    }

    saveDiaryEntry(entry)

    sendDiaryEntryToBackup(entry).catch(() => {})

    const existingEntries = diaryEntries
      .filter((e) => e.date === today && e.id !== entry.id)
      .map((e) => e.content)
      .join(". ")
    const existingMemory = semanticMemory
      ? `Известные факты: ${(semanticMemory.facts || []).join("; ")}. Цели: ${(semanticMemory.goals || []).join("; ")}.`
      : ""
    const dayPlan = dayPlans?.[today]
    const context = `${existingMemory}\nЗаписи сегодня: ${existingEntries || "нет"}\nНовая запись: ${content.trim()}`

    extractSemanticMemory(context, voiceInput || "", dayPlan ? JSON.stringify(dayPlan.originalPlan || []) : "нет").then((extracted) => {
      if (!isMounted.current) return
      const hasNew = (extracted.facts?.length || 0) + (extracted.goals?.length || 0) + (extracted.preferences?.length || 0) + (extracted.projects?.length || 0)
      if (hasNew > 0) {
        setSemanticMemory({
          facts: [...new Set([...(semanticMemory.facts || []), ...(extracted.facts || [])])].slice(-50),
          goals: [...new Set([...(semanticMemory.goals || []), ...(extracted.goals || [])])].slice(-50),
          preferences: [...new Set([...(semanticMemory.preferences || []), ...(extracted.preferences || [])])].slice(-50),
          projects: [...new Set([...(semanticMemory.projects || []), ...(extracted.projects || [])])].slice(-50),
          lastUpdated: new Date().toISOString(),
        })
      }
    }).catch(() => {})

    setContent("")
    setMood(null)
    setSavedCount((c) => c + 1)
    setIsSaving(false)
  }

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const pastDates = Array.from(new Set(diaryEntries.map((e) => e.date)))
    .filter((d) => d !== today)
    .sort()
    .reverse()
    .slice(0, 14)

  const formatDisplayDate = (date: string) => {
    const d = new Date(date + "T00:00:00")
    const todayStr = format(new Date(), "yyyy-MM-dd")
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd")
    if (date === todayStr) return "Сегодня"
    if (date === yesterdayStr) return "Вчера"
    return format(d, "d MMMM")
  }

  const formatTime = (iso: string) => {
    return format(new Date(iso), "HH:mm")
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-12 pb-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold">Дневник</h1>
          </div>

          <Card className="p-4 mb-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Настроение</p>
                <div className="flex gap-2">
                  {moodEmojis.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setMood(mood === i + 1 ? null : i + 1)}
                      className={`h-12 w-12 rounded-2xl text-2xl flex items-center justify-center transition-all active:scale-95 ${
                        mood === i + 1
                          ? "bg-primary/20 ring-2 ring-primary scale-110"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                      title={moodLabels[i]}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Как прошёл день? О чём думаешь?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px]"
              />

              <Button
                onClick={handleSave}
                disabled={!content.trim() || isSaving}
                className="w-full"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Сохраняю...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" /> Сохранить запись
                  </>
                )}
              </Button>

              <AnimatePresence>
                {savedCount > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-center text-green-500"
                  >
                    ✓ Запись сохранена
                  </motion.p>
                )}
              </AnimatePresence>

              {settings.telegramBotToken && settings.telegramChatId && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Бэкап отправлен в Telegram
                </p>
              )}
            </div>
          </Card>

          {todayEntries.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Записи сегодня</h3>
              <div className="space-y-2">
                {todayEntries
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((entry) => (
                    <DiaryEntryCard key={entry.id} entry={entry} onDelete={deleteDiaryEntry} />
                  ))}
              </div>
            </div>
          )}

          {pastDates.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Прошлые записи</h3>
              <div className="space-y-2">
                {pastDates.map((date) => {
                  const entries = getEntriesByDate(date)
                  const isExpanded = expandedDates.has(date)
                  const avgMood = entries.reduce((sum, e) => sum + (e.mood || 3), 0) / entries.length

                  return (
                    <div key={date}>
                      <button
                        onClick={() => toggleDate(date)}
                        className="w-full flex items-center justify-between p-3 bg-card rounded-2xl hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{formatDisplayDate(date)}</span>
                          {entries.length > 1 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {entries.length}
                            </Badge>
                          )}
                          <span className="text-sm">{moodEmojis[Math.round(avgMood) - 1] || ""}</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 mt-2 pl-2">
                              {entries
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map((entry) => (
                                  <DiaryEntryCard key={entry.id} entry={entry} onDelete={deleteDiaryEntry} showTime />
                                ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {diaryEntries.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Пока нет записей</p>
              <p className="text-muted-foreground text-xs mt-1">Напиши первую запись выше</p>
            </div>
          )}
        </div>

        <TabBar onAddTask={() => {}} />
      </div>
    </>
  )
}

const DiaryEntryCard = ({ entry, onDelete, showTime }: { entry: DiaryEntry; onDelete: (id: string) => void; showTime?: boolean }) => {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <>
      <Card className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {entry.mood && (
              <span className="text-lg">{moodEmojis[entry.mood - 1]}</span>
            )}
            {showTime && (
              <span className="text-[10px] text-muted-foreground ml-2">
                {format(new Date(entry.createdAt), "HH:mm")}
              </span>
            )}
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
              {entry.content}
            </p>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0 ml-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-6"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 w-full max-w-xs shadow-xl"
            >
              <p className="text-sm font-medium mb-1 text-center">Удалить запись?</p>
              <p className="text-xs text-muted-foreground mb-4 text-center line-clamp-2">
                {entry.content}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-10 rounded-xl bg-muted text-sm font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    onDelete(entry.id)
                    setShowConfirm(false)
                  }}
                  className="flex-1 h-10 rounded-xl bg-destructive text-white text-sm font-medium"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DiaryPage
