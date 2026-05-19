import Groq from "groq-sdk"
import { getGroqClient, MODEL } from "@/services/groq"
import {
  MORNING_ROUTINE_PROMPT,
  ADJUST_PLAN_PROMPT,
  EVENING_REPORT_PROMPT,
  PARSE_VOICE_PROMPT,
  ADJUST_DAY_PROMPT,
  DAILY_SUMMARY_PROMPT,
  WEEKLY_SUMMARY_PROMPT,
  MONTHLY_SUMMARY_PROMPT,
  AI_STATS_PROMPT,
} from "@/utils/prompts"
import type { DayPlanTask, EveningReport, DaySummary, PeriodSummary } from "@/types"

const MAX_RETRIES = 2

async function callAI(prompt: string, maxRetries = MAX_RETRIES): Promise<string> {
  const client = getGroqClient()
  if (!client) throw new Error("Groq API key не установлен")

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: "Ты отвечаешь ТОЛЬКО в JSON формате. Никакого markdown, никаких обёрток. Чистый JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error("Пустой ответ от AI")

      return content
    } catch (e) {
      if (i === maxRetries - 1) throw e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }

  throw new Error("Не удалось получить ответ от AI")
}

function extractJSON(text: string): string {
  const cleaned = text.trim()
  if (cleaned.startsWith("{")) return cleaned

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) return jsonMatch[0]

  return cleaned
}

function validateJSON<T>(text: string): T | null {
  try {
    const json = extractJSON(text)
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export async function generateMorningPlan(
  sleepScore: number,
  motivationScore: number,
  voiceNotes: string,
  patternsSummary: string,
  pendingTasks: string,
  yesterdayData: string,
): Promise<{
  greeting: string
  plan: DayPlanTask[]
  commentary: string
  encouragement: string
}> {
  const prompt = MORNING_ROUTINE_PROMPT(sleepScore, motivationScore, voiceNotes, patternsSummary, pendingTasks, yesterdayData)
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ greeting: string; plan: DayPlanTask[]; commentary: string; encouragement: string }>(raw)
  if (!parsed || !parsed.plan || !Array.isArray(parsed.plan)) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed
}

export async function adjustPlan(
  currentPlan: DayPlanTask[],
  userFeedback: string,
): Promise<DayPlanTask[]> {
  const prompt = ADJUST_PLAN_PROMPT(JSON.stringify(currentPlan), userFeedback)
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ plan: DayPlanTask[] }>(raw)
  if (!parsed || !parsed.plan || !Array.isArray(parsed.plan)) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed.plan
}

export async function generateEveningReport(
  completedTasks: string,
  postponedTasks: string,
  patternsSummary: string,
): Promise<EveningReport> {
  const prompt = EVENING_REPORT_PROMPT(completedTasks, postponedTasks, patternsSummary)
  const raw = await callAI(prompt)

  const parsed = validateJSON<EveningReport>(raw)
  if (!parsed || !parsed.summary) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed
}

export async function parseVoiceInput(voiceText: string): Promise<
  {
    title: string
    priority: "high" | "medium" | "low"
    category: "work" | "personal" | "health" | "study" | "errand" | "other"
  }[]
> {
  const prompt = PARSE_VOICE_PROMPT(voiceText)
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ tasks: { title: string; priority: string; category: string }[] }>(raw)
  if (!parsed || !parsed.tasks || !Array.isArray(parsed.tasks)) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed.tasks.map((t) => ({
    title: t.title,
    priority: (t.priority as "high" | "medium" | "low") || "medium",
    category: (t.category as "work" | "personal" | "health" | "study" | "errand" | "other") || "other",
  }))
}

export async function adjustDayPlan(
  currentTime: string,
  originalPlan: DayPlanTask[],
  completedTasks: string,
  pendingTasks: string,
  patternsSummary: string,
  userInput: string,
  conversationHistory: string,
): Promise<{
  summary: string
  commentary: string
  newTasks: DayPlanTask[]
}> {
  const prompt = ADJUST_DAY_PROMPT(
    currentTime,
    JSON.stringify(originalPlan),
    completedTasks,
    pendingTasks,
    patternsSummary,
    userInput,
    conversationHistory,
  )
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ summary: string; commentary: string; newTasks: DayPlanTask[] }>(raw)
  if (!parsed || !parsed.newTasks || !Array.isArray(parsed.newTasks)) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed
}

export async function generateDailySummary(
  date: string,
  tasksPlanned: number,
  tasksCompleted: number,
  sleepScore: number,
  motivationScore: number,
  voiceNotes: string,
  completedTaskNames: string,
  postponedTaskNames: string,
  manuallyAddedTasks: string,
  patternsSummary: string,
): Promise<DaySummary> {
  const prompt = DAILY_SUMMARY_PROMPT(
    date,
    tasksPlanned,
    tasksCompleted,
    sleepScore,
    motivationScore,
    voiceNotes,
    completedTaskNames,
    postponedTaskNames,
    manuallyAddedTasks,
    patternsSummary,
  )
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ summary: string; mood: string }>(raw)
  if (!parsed || !parsed.summary) {
    throw new Error("AI вернул некорректный формат")
  }

  return {
    date,
    summary: parsed.summary,
    tasksPlanned,
    tasksCompleted,
    mood: parsed.mood,
  }
}

export async function generateWeeklySummary(
  weekStart: string,
  weekEnd: string,
  dailyData: string,
  patternsSummary: string,
): Promise<PeriodSummary> {
  const prompt = WEEKLY_SUMMARY_PROMPT(weekStart, weekEnd, dailyData, patternsSummary)
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ summary: string; insights: string[]; patterns: string }>(raw)
  if (!parsed || !parsed.summary) {
    throw new Error("AI вернул некорректный формат")
  }

  return {
    period: `${weekStart} — ${weekEnd}`,
    summary: parsed.summary,
    insights: parsed.insights || [],
    patterns: parsed.patterns || "",
  }
}

export async function generateMonthlySummary(
  month: string,
  weeklyData: string,
  patternsSummary: string,
): Promise<PeriodSummary> {
  const prompt = MONTHLY_SUMMARY_PROMPT(month, weeklyData, patternsSummary)
  const raw = await callAI(prompt)

  const parsed = validateJSON<{ summary: string; insights: string[]; patterns: string }>(raw)
  if (!parsed || !parsed.summary) {
    throw new Error("AI вернул некорректный формат")
  }

  return {
    period: month,
    summary: parsed.summary,
    insights: parsed.insights || [],
    patterns: parsed.patterns || "",
  }
}

export async function generateAIStats(
  totalTasks: number,
  completedTasks: number,
  totalDays: number,
  completionRate: number,
  avgMotivation: number,
  avgSleep: number,
  categoryStats: string,
  patternsSummary: string,
  recentDailySummaries: string,
): Promise<{
  completionRate: number
  streakDays: number
  avgTasksPerDay: number
  bestDay: string
  bestCategory: string
  insight: string
  patterns: string
  weeklyTrend: string
  recommendations: string[]
}> {
  const prompt = AI_STATS_PROMPT(
    totalTasks,
    completedTasks,
    totalDays,
    completionRate,
    avgMotivation,
    avgSleep,
    categoryStats,
    patternsSummary,
    recentDailySummaries,
  )
  const raw = await callAI(prompt)

  const parsed = validateJSON<{
    completionRate: number
    streakDays: number
    avgTasksPerDay: number
    bestDay: string
    bestCategory: string
    insight: string
    patterns: string
    weeklyTrend: string
    recommendations: string[]
  }>(raw)
  if (!parsed || !parsed.insight) {
    throw new Error("AI вернул некорректный формат")
  }

  return parsed
}

export async function testGroqKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: "Say 'ok' in one word" }],
      max_tokens: 10,
    })

    return !!response.choices[0]?.message?.content
  } catch {
    return false
  }
}
