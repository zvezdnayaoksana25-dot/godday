export const MORNING_ROUTINE_PROMPT = (
  sleepScore: number,
  sleepTime: string,
  wakeTime: string,
  energyLevel: string,
  motivationScore: number,
  voiceNotes: string,
  focusOfTheDay: string,
  patternsSummary: string,
  pendingTasks: string,
  yesterdayData: string,
  yesterdayDecisions: string,
  semanticSummary: string,
) => `Ты — мягкий ассистент Flow. Составь реалистичный план на день.

Контекст:
- Сон: ${sleepScore}/10, ${sleepTime}–${wakeTime}
- Энергия: ${energyLevel === "low" ? "разбита" : energyLevel === "high" ? "полна энергии" : "в норме"}
- Мотивация: ${motivationScore}/10
- Фокус дня: "${focusOfTheDay || "не указан"}"
- Заметки: "${voiceNotes}"
- Паттерны: ${patternsSummary}
- Память: ${semanticSummary}
- Вчерашние решения: ${yesterdayDecisions || "нет"}
- Вчера: ${yesterdayData}

Правила:
1. Максимум 5-7 задач. При низкой энергии/мотивации — меньше.
2. Фокус дня — приоритет №1.
3. Распредели по времени: morning/afternoon/evening. Категории: work/personal/health/study/errand/other. Приоритеты: high/medium/low.
4. В commentary — 2-4 предложения: учти вчера, паттерны, текущее состояние, поддержи.

Ответь JSON:
{
  "greeting": "короткое тёплое приветствие",
  "plan": [
    {
      "title": "название",
      "priority": "high|medium|low",
      "category": "work|personal|health|study|errand|other",
      "suggestedTime": "morning|afternoon|evening",
      "aiNote": "почему это важно сейчас"
    }
  ],
  "commentary": "развёрнутый комментарий о дне",
  "encouragement": "одна мотивационная фраза"
}`

export const ADJUST_PLAN_PROMPT = (
  currentPlan: string,
  userFeedback: string,
  sleepScore: number,
  motivationScore: number,
  patternsSummary: string,
  semanticSummary: string,
) => `Ты — мягкий ассистент. Обнови план по запросу пользователя.

Контекст:
- Сон: ${sleepScore}/10, Мотивация: ${motivationScore}/10
- Паттерны: ${patternsSummary}
- Память: ${semanticSummary}

Текущий план:
${currentPlan}

Фидбек: "${userFeedback}"

Ответь JSON:
{
  "plan": [
    {
      "title": "название",
      "priority": "high|medium|low",
      "category": "work|personal|health|study|errand|other",
      "suggestedTime": "morning|afternoon|evening",
      "aiNote": "короткое объяснение"
    }
  ]
}`

export const ADJUST_DAY_PROMPT = (
  currentTime: string,
  originalPlan: string,
  completedTasks: string,
  pendingTasks: string,
  patternsSummary: string,
  userInput: string,
  conversationHistory: string,
  semanticSummary: string,
) => `Ты — мягкий ассистент. Скорректируй оставшуюся часть дня.

Контекст:
- Сейчас: ${currentTime}
- Утренний план: ${originalPlan}
- Выполнено: ${completedTasks}
- Осталось: ${pendingTasks}
- Паттерны: ${patternsSummary}
- Память: ${semanticSummary}
- Разговор: ${conversationHistory}
- Пользователь: "${userInput}"

Правила:
1. НЕ включай выполненные задачи в newTasks.
2. newTasks — только новые или изменённые оставшиеся задачи.
3. Распредели: morning/afternoon/evening. Категории: work/personal/health/study/errand/other. Приоритеты: high/medium/low.
4. В commentary — поддержи, объясни изменения.

Ответь JSON:
{
  "summary": "что изменилось",
  "commentary": "комментарий об изменениях",
  "newTasks": [
    {
      "title": "название",
      "priority": "high|medium|low",
      "category": "work|personal|health|study|errand|other",
      "suggestedTime": "morning|afternoon|evening",
      "aiNote": "объяснение"
    }
  ]
}`

export const EVENING_REPORT_PROMPT = (
  completedTasks: string,
  postponedTasks: string,
  patternsSummary: string,
) => `Ты — мягкий ассистент. Составь вечерний отчёт.

Выполнено: ${completedTasks}
Перенесено: ${postponedTasks}
Паттерны: ${patternsSummary}

Ответь JSON:
{
  "summary": "тёплый итог дня, 1-2 предложения",
  "completed": ["список выполненных"],
  "postponed": ["список перенесённых"],
  "commentary": "комментарий о дне",
  "insight": "один инсайт о паттернах",
  "tomorrowSuggestion": "рекомендация на завтра"
}`

export const PARSE_VOICE_PROMPT = (voiceText: string) => `Распарь текст и выдели задачи.

Текст: "${voiceText}"

Ответь JSON:
{
  "tasks": [
    {
      "title": "название",
      "priority": "high|medium|low",
      "category": "work|personal|health|study|errand|other"
    }
  ]
}`

export const DAILY_SUMMARY_PROMPT = (
  date: string,
  tasksPlanned: number,
  tasksCompleted: number,
  sleepScore: number,
  sleepTime: string,
  wakeTime: string,
  energyLevel: string,
  motivationScore: number,
  voiceNotes: string,
  completedTaskNames: string,
  postponedTaskNames: string,
  manuallyAddedTasks: string,
  patternsSummary: string,
  diaryEntries: string,
) => `Ты — мягкий ассистент. Сделай саммаризацию дня.

Дата: ${date}
Задачи: ${tasksCompleted}/${tasksPlanned}
Сон: ${sleepScore}/10, ${sleepTime}–${wakeTime}
Энергия: ${energyLevel === "low" ? "разбита" : energyLevel === "high" ? "полна энергии" : "в норме"}
Мотивация: ${motivationScore}/10
Заметки: "${voiceNotes}"
Выполнено: ${completedTaskNames || "нет"}
Перенесено: ${postponedTaskNames || "нет"}
Добавлено вручную: ${manuallyAddedTasks || "нет"}
Паттерны: ${patternsSummary}
Дневник: ${diaryEntries || "нет"}

Ответь JSON:
{
  "summary": "описание дня, 2-3 предложения",
  "mood": "настроение дня одним словом"
}`

export const WEEKLY_SUMMARY_PROMPT = (
  weekStart: string,
  weekEnd: string,
  dailyData: string,
  patternsSummary: string,
  diaryEntries: string,
) => `Ты — мягкий ассистент. Сделай саммаризацию недели.

Неделя: ${weekStart} — ${weekEnd}
Данные:
${dailyData}
Паттерны: ${patternsSummary}
Дневник: ${diaryEntries || "нет"}

Ответь JSON:
{
  "summary": "описание недели, 3-4 предложения",
  "insights": ["инсайт 1", "инсайт 2", "инсайт 3"],
  "patterns": "паттерны за неделю"
}`

export const MONTHLY_SUMMARY_PROMPT = (
  month: string,
  weeklyData: string,
  patternsSummary: string,
  diaryEntries: string,
) => `Ты — мягкий ассистент. Сделай саммаризацию месяца.

Месяц: ${month}
Данные:
${weeklyData}
Паттерны: ${patternsSummary}
Дневник: ${diaryEntries || "нет"}

Ответь JSON:
{
  "summary": "описание месяца, 4-5 предложений",
  "insights": ["инсайт 1", "инсайт 2", "инсайт 3", "инсайт 4"],
  "patterns": "паттерны за месяц"
}`

export const AI_STATS_PROMPT = (
  totalTasks: number,
  completedTasks: number,
  totalDays: number,
  completionRate: number,
  avgMotivation: number,
  avgSleep: number,
  categoryStats: string,
  patternsSummary: string,
  recentDailySummaries: string,
  diaryEntries: string,
) => `Ты — аналитик продуктивности. Проанализируй данные.

Данные:
- Задач: ${totalTasks}, выполнено: ${completedTasks}
- Процент: ${(completionRate * 100).toFixed(0)}%
- Дней с планом: ${totalDays}
- Мотивация: ${avgMotivation}/10, Сон: ${avgSleep}/10
- Категории: ${categoryStats}
- Паттерны: ${patternsSummary}
- Саммаризации: ${recentDailySummaries || "нет"}
- Дневник: ${diaryEntries || "нет"}

Ответь JSON:
{
  "completionRate": 75,
  "streakDays": 7,
  "avgTasksPerDay": 5.2,
  "bestDay": "понедельник",
  "bestCategory": "work",
  "insight": "главный инсайт, 1-2 предложения",
  "patterns": "описание паттернов, 2-3 предложения",
  "weeklyTrend": "тенденция недели с комментарием",
  "recommendations": ["рекомендация 1", "рекомендация 2", "рекомендация 3"]
}`

export const SEMANTIC_MEMORY_PROMPT = (
  conversationHistory: string,
  voiceNotes: string,
  dayPlans: string,
) => `Извлеки долгосрочные факты из данных пользователя.

Разговоры:
${conversationHistory}

Заметки:
${voiceNotes}

Планы:
${dayPlans}

Извлеки только НОВУЮ информацию:
- facts: привычки, распорядок, стиль работы
- goals: долгосрочные цели
- preferences: предпочтения в планировании и отдыхе
- projects: проекты длительнее одного дня

Ответь JSON:
{
  "facts": ["факт 1", "факт 2"],
  "goals": ["цель 1"],
  "preferences": ["предпочтение 1"],
  "projects": ["проект 1"]
}`
