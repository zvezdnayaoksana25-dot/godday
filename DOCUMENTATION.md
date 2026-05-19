# FlowDay — Полная документация кодовой базы

## Оглавление
1. [Обзор проекта](#1-обзор-проекта)
2. [Архитектура](#2-архитектура)
3. [Типы данных](#3-типы-данных)
4. [Хранилище состояния (Zustand)](#4-хранилище-состояния-zustand)
5. [Сервисы](#5-сервисы)
6. [AI-промты](#6-ai-промты)
7. [Компоненты](#7-компоненты)
8. [Маршрутизация](#8-маршрутизация)
9. [PWA и конфигурация](#9-pwa-и-конфигурация)
10. [Дизайн-система](#10-дизайн-система)
11. [Потоки данных](#11-потоки-данных)
12. [Миграции и совместимость](#12-миграции-и-совместимость)

---

## 1. Обзор проекта

**FlowDay** — умный таск-менеджер с AI, работающий полностью в браузере. Без серверов, без регистрации.

**Ключевые особенности:**
- Утренняя рутина с AI: пользователь оценивает сон, энергию, принимает решения по вчерашним задачам, пишет заметки — AI составляет план на день
- Корректировка дня: в любой момент можно попросить AI перестроить оставшуюся часть дня
- Дневник: бесконечные записи с трекингом настроения, бэкап в Telegram
- Семантическая память: AI извлекает долгосрочные факты, цели, предпочтения и проекты из разговоров и дневника
- Саммаризация: автоматическая и ручная генерация итогов дня, недели, месяца
- Статистика: AI-анализ продуктивности с инсайтами, трендами, рекомендациями
- Паттерны: отслеживание мотивации, сна, энергии, часто переносимых категорий
- Telegram-бот: утренний план, вечерний отчёт, бэкап дневника
- PWA: установка на домашний экран, offline-кэш, IndexedDB

**Стек:** React 19, TypeScript 5.9, Vite 8, Zustand 5, Tailwind CSS 4, Framer Motion 12, Groq API (llama-3.3-70b), IndexedDB.

**Деплой:** GitHub Pages по адресу `https://zvezdnayaoksana25-dot.github.io/godday/`

---

## 2. Архитектура

### Структура приложения

```
FlowDay (PWA)
├── Zustand Store (единое хранилище, 8 слайсов)
│   ├── TaskStore       — CRUD задач
│   ├── DayStore        — планы на дни
│   ├── PatternStore    — паттерны поведения
│   ├── SettingsStore   — настройки пользователя
│   ├── AIStore         — состояние утренней рутины
│   ├── SummaryStore    — саммаризации и AI-статистика
│   ├── MemoryStore     — история разговоров + семантическая память
│   └── DiaryStore      — записи дневника
│
├── Сервисы
│   ├── ai.ts           — все вызовы Groq API
│   ├── groq.ts         — клиент Groq SDK (singleton)
│   ├── telegram.ts     — Telegram Bot API
│   └── speech.ts       — Web Speech API
│
├── Компоненты
│   ├── Pages           — 5 страниц (Today, Calendar, Diary, Stats, Settings)
│   ├── Features        — MorningRoutine, DayAdjustDialog, TaskCard, DayView, DayProgressCircle, NewTaskDialog
│   ├── Layout          — TabBar (нижняя навигация)
│   └── UI              — shadcn/ui компоненты (Button, Card, Dialog, Input, Textarea, Badge, Select, Popover, Calendar, Label, Progress, ScrollArea, Alert, Sonner, Tabs)
│
├── Утилиты
│   ├── prompts.ts      — все AI-промты
│   ├── storage.ts      — IndexedDB обёртка + экспорт/импорт
│   └── utils.ts        — cn() для Tailwind
│
└── Конфигурация
    ├── vite.config.ts  — Vite + PWA plugin
    ├── tsconfig.json   — TypeScript
    └── index.html      — HTML shell + iOS PWA meta
```

### Хранение данных

Все данные хранятся в **IndexedDB** через Zustand middleware `persist`:
- База: `flowday-db`
- Object store: `kv`
- Ключ: `flowday-state`
- Значение: JSON-сериализованное состояние всего store

Дневник имеет **двойное хранение**: Zustand (IndexedDB) + `localStorage` (`flowday-diary-backup`). Это позволяет восстановить записи при потере IndexedDB.

Флаги саммаризации хранятся в `localStorage` (`flowday-summary-YYYY-MM-DD`, `flowday-week-summary-...`) для предотвращения повторной генерации.

---

## 3. Типы данных

### Базовые типы

```typescript
type Priority = "high" | "medium" | "low"
type TaskStatus = "todo" | "in-progress" | "done"
type TimeBlock = "morning" | "afternoon" | "evening"
type Category = "work" | "personal" | "health" | "study" | "errand" | "other"
type EnergyLevel = "low" | "medium" | "high"
```

### Task — основная сущность задачи

Каждая задача имеет уникальный ID (uuid v4), статус, приоритет, категорию, привязку ко времени суток и дате. Поле `aiGenerated` отличает задачи, созданные AI, от добавленных вручную. `order` используется для сортировки.

### DayPlan — план на день

Создаётся AI при утренней рутине. Содержит метаданные (сон, энергия, мотивация, фокус), список ID задач, оригинальный план от AI (`originalPlan`), AI-комментарий и приветствие.

### DayPlanTask — задача от AI (до создания)

Промежуточный формат: AI возвращает массив таких объектов, которые затем превращаются в полноценные `Task` при принятии плана.

### MorningSession — состояние утренней рутины

Wizard с 6 шагами: `sleep → energy → yesterday → voice → plan → done`. Хранит все введённые пользователем данные и результат AI.

### Patterns — паттерны поведения

Средние значения (EWMA: 70% старое + 30% новое) и истории за 30 дней. `frequentlyPostponedCategories` — категории, которые пользователь переносит ≥ 2 раз.

### SemanticMemory — долгосрочная память AI

4 категории: факты о пользователе, долгосрочные цели, предпочтения, текущие проекты. Извлекается AI из разговоров и дневника. Дедупликация через `Set`.

### DiaryEntry — записи дневника

Бесконечное количество записей в день. Опциональное настроение (1-5). Каждая записи имеет `createdAt` для сортировки.

---

## 4. Хранилище состояния (Zustand)

### Главный store (src/store/useStore.ts)

Единый Zustand store, собранный из 8 слайсов через spread-оператор. Каждый слайс — функция, принимающая `(set, get, api)` и возвращающая свой кусок состояния.

**Персистентность:** Zustand `persist` middleware с кастомным storage-адаптером для IndexedDB. Версия схемы: 2. Миграция с версии < 2 инициализирует все недостающие поля (`tasks`, `dayPlans`, `patterns.*`, `semanticMemory.*`, `diaryEntries` и т.д.).

### TaskStore (src/store/taskStore.ts)

**Состояние:** `tasks: Task[]`

**Методы:**
- `addTask` — создаёт одну задачу с uuid v4, статусом "todo", датой сегодня (или переданной). `order` = текущая длина массива задач.
- `addTasks` — пакетное добавление (используется при принятии AI-плана).
- `updateTask` — обновляет поля задачи, добавляет `updatedAt`.
- `deleteTask` — фильтрует массив по ID.
- `moveTask` — меняет статус, ставит `completedAt` при "done".
- `completeTask` / `uncompleteTask` — быстрые переключатели статуса.
- `reorderTasks` — полная замена массива (для drag-and-drop).
- `getTasksByStatus` / `getTasksByDate` / `getTodayTasks` — селекторы.

Все методы используют `set()` для обновления состояния. Селекторы используют `get().tasks`.

### DayStore (src/store/dayStore.ts)

**Состояние:** `dayPlans: Record<string, DayPlan>` — карта date → план.

**Методы:**
- `saveDayPlan` — сохраняет план, ключ = `plan.date`.
- `getDayPlan` / `getTodayPlan` — получение по дате.
- `markDayComplete` — ставит `completed: true`.
- `hasMorningRoutine` — проверка существования плана.

### PatternStore (src/store/patternStore.ts)

**Состояние:** `patterns: Patterns`

**Дефолтные значения:** avgStartTime=9, avgTasksPerDay=5, avgCompletionRate=0.6, avgSleepDuration=8, пустые истории.

**Методы:**
- `recordDayData` — записывает данные дня:
  - Вычисляет длительность сна (учитывает переход через полночь).
  - Добавляет записи в истории мотивации, сна, энергии (обрезка до 30).
  - Обновляет средние через EWMA: `old * 0.7 + new * 0.3`.
  - Определяет часто переносимые категории (≥ 2 повторения).
  - Пересчитывает avgTasksPerDay на основе всех дат с задачами.
- `recalcPatternsFromTasks` — пересчитывает avgTasksPerDay и avgCompletionRate из всех задач в хранилище.
- `getPatternsSummary` — возвращает текстовую сводку на русском для AI-промтов. Включает среднюю мотивацию, сон, энергию, процент выполнения, часто переносимые категории.

**Вспомогательная функция:** `calcSleepDuration(sleepTime, wakeTime)` — если время пробуждения ≤ времени засыпания, добавляет 24 часа (переход через полночь).

### SettingsStore (src/store/settingsStore.ts)

**Состояние:** `settings: Settings`

**Дефолт:** пустые строки, тема "light", язык "ru".

**Методы:**
- `updateSettings` — мердж обновлений.
- `getDisplayName` — имя или "друг".

### AIStore (src/store/aiStore.ts)

**Состояние:** `morningSession: MorningSession`

**Дефолт:** step="sleep", sleepScore=5, sleepTime="23:00", wakeTime="07:00", energyLevel="medium", motivationScore=5, пустые строки, isLoading=false, error=null.

**Методы:** 13 сеттеров, по одному на каждое поле, плюс `resetMorningSession` для полного сброса.

### SummaryStore (src/store/summaryStore.ts)

**Состояние:** `dailySummaries`, `weeklySummaries`, `monthlySummaries` (Record<string, ...>), `aiStats: string | null`, `aiStatsGeneratedAt: string | null`.

**Методы:**
- `saveDailySummary` / `saveWeeklySummary` / `saveMonthlySummary` — сохранение по ключу.
- `saveAIStats` — сохранение JSON-строки с таймстампом.
- `getWeekKey` — возвращает дату понедельника (неделя с понедельника).
- `getMonthKey` — возвращает "YYYY-MM".
- `getLastSummarizedDay/Week/Month` — последний ключ из соответствующего Record.
- `getDayTasksData` — вычисляет total/completed/plan для даты.

### MemoryStore (src/store/memoryStore.ts)

**Состояние:** `conversationHistory: Record<string, AIConversationMessage[]>`, `semanticMemory: SemanticMemory`.

**Методы:**
- `addConversationMessage` — добавляет сообщение в массив по дате.
- `getConversationHistory` — возвращает массив сообщений за дату.
- `formatConversationHistory` — форматирует в строку "Роль: содержание" для промтов.
- `clearConversationHistory` — удаляет все сообщения за дату.
- `setSemanticMemory` — полная замена.
- `addSemanticFact/Goal/Preference/Project` — добавление в соответствующий массив.
- `removeSemanticFact/Goal/Preference/Project` — удаление по индексу.
- `getSemanticSummary` — форматирует всю память в строку для промтов.

### DiaryStore (src/store/diaryStore.ts)

**Состояние:** `diaryEntries: DiaryEntry[]`

**Двойное хранение:** при каждом `saveDiaryEntry` данные сохраняются и в Zustand (IndexedDB), и в `localStorage` (`flowday-diary-backup`). При `deleteDiaryEntry` — обновляется и то, и другое.

**Методы:**
- `saveDiaryEntry` — добавляет запись, сохраняет бэкап.
- `getEntriesByDate` — фильтр по дате.
- `getEntriesByDateRange` — фильтр по диапазону.
- `deleteDiaryEntry` — удаление + обновление бэкапа.
- `restoreFromBackup` — загрузка из localStorage в state.
- `getDiaryEntriesForPeriod` — форматирование записей за период в строку для AI-промтов. Возвращает "нет записей в дневнике" если пусто.

---

## 5. Сервисы

### Groq Service (src/services/groq.ts)

**Модель:** `llama-3.3-70b-versatile`

**Singleton-клиент:** `getGroqClient()` создаёт Groq-клиент лениво из API-ключа в store. Кэшируется в модульной переменной `client`. `resetGroqClient()` очищает кэш (вызывается после смены ключа).

`dangerouslyAllowBrowser: true` — обязательно для клиентского использования.

### AI Service (src/services/ai.ts)

**Базовая функция `callAI(prompt, maxRetries=2)`:**
1. Получает Groq-клиент.
2. Отправляет запрос с system-сообщением: "Ты отвечаешь ТОЛЬКО в JSON формате. Никакого markdown, никаких обёрток. Чистый JSON."
3. Параметры: temperature=0.7, max_tokens=2000, response_format={type: "json_object"}.
4. При ошибке — повтор с экспоненциальной задержкой (1с, 2с).
5. Специфичные ошибки: 429 (rate limit), 401 (invalid key), 503 (server unavailable).

**Вспомогательные функции:**
- `extractJSON(text)` — извлекает JSON из текста. Если текст начинается с `{` — возвращает как есть. Иначе ищет первое совпадение `/{[\s\S]*}/`.
- `validateJSON<T>(text)` — парсит JSON через `extractJSON`, возвращает типизированный объект или `null`.

**Экспортируемые функции:**

| Функция | Что делает |
|---|---|
| `generateMorningPlan` | Создаёт план на день из 12 параметров. Валидирует наличие `plan` массива. |
| `adjustPlan` | Корректирует план по фидбеку. Валидирует `plan` массив. |
| `generateEveningReport` | Вечерний отчёт. Валидирует наличие `summary`. |
| `parseVoiceInput` | Парсит голосовой ввод в задачи. Кастит priority/category с дефолтами. |
| `adjustDayPlan` | Корректировка дня. Валидирует `newTasks` массив. |
| `generateDailySummary` | Саммаризация дня. Возвращает DaySummary с mood. |
| `generateWeeklySummary` | Саммаризация недели. Добавляет `period` к результату. |
| `generateMonthlySummary` | Саммаризация месяца. 4 параметра включая diaryEntries. |
| `generateAIStats` | AI-анализ статистики. Валидирует наличие `insight`. |
| `extractSemanticMemory` | Извлечение семантической памяти. Возвращает Partial, пустые массивы по дефолту. |
| `testGroqKey` | Тест API-ключа минимальным запросом. |

### Telegram Service (src/services/telegram.ts)

Все функции читают настройки напрямую через `useStore.getState().settings` (не через хуки, так как вызываются из сервисов).

- `sendTelegramMessage(text)` — POST на `api.telegram.org/bot{token}/sendMessage` с `parse_mode: "HTML"`.
- `sendMorningPlan(plan)` — оборачивает план в формат с эмодзи 🌸.
- `sendEveningReport(report)` — оборачивает в 🌙.
- `sendDiaryEntryToBackup(entry)` — отправляет записи дневника с датой, эмодзи настроения.

### Speech Service (src/services/speech.ts)

Обёртка над Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`).

- `isSpeechSupported()` — проверка наличия API.
- `startSpeechRecognition(onResult, onError, onEnd, lang="ru-RU")` — запускает непрерывное распознавание с interim-результатами. Возвращает `{ stop(), abort() }`.

---

## 6. AI-промты

Все промты на русском языке. Каждый промт — функция, принимающая параметры и возвращающая строку.

### MORNING_ROUTINE_PROMPT
Самый сложный промт. Принимает 12 параметров. Правила: максимум 5-7 задач, учитывать состояние, фокус дня = приоритет №1, распределить по времени. В commentary — 2-4 предложения с учётом вчерашнего дня, паттернов, состояния.

### ADJUST_PLAN_PROMPT
Короткий промт. Текущий план + фидбек + контекст. Обновляет план.

### ADJUST_DAY_PROMPT
Корректировка оставшейся части дня. Ключевое правило: НЕ включать выполненные задачи в newTasks.

### EVENING_REPORT_PROMPT
Вечерний отчёт. summary, completed[], postponed[], commentary, insight, tomorrowSuggestion.

### PARSE_VOICE_PROMPT
Минимальный промт. Парсит текст в задачи.

### DAILY_SUMMARY_PROMPT
Саммаризация дня. Учитывает сон, энергию, мотивацию, задачи, паттерны, дневник. Вывод: summary + mood.

### WEEKLY_SUMMARY_PROMPT
Саммаризация недели. Данные по дням + паттерны + дневник. Вывод: summary + insights[] + patterns.

### MONTHLY_SUMMARY_PROMPT
Саммаризация месяца. Данные по неделям + паттерны + дневник. Вывод: summary + insights[] + patterns.

### AI_STATS_PROMPT
Аналитика продуктивности. Числовые плейсхолдеры в JSON-шаблоне (75, 7, 5.2) чтобы AI возвращал числа, а не строки.

### SEMANTIC_MEMORY_PROMPT
Извлечение долгосрочных фактов. Правило: извлекать только НОВУЮ информацию, не дублировать.

**Общий паттерн:** Все промты заканчиваются `Ответь JSON:` с JSON-шаблоном. System prompt в `callAI` дублирует требование JSON, но это усиливает надёжность.

---

## 7. Компоненты

### Pages

#### TodayPage (src/pages/TodayPage.tsx)

**Главная страница приложения.**

**Состояние:** 3 булевых флага — `showMorningRoutine`, `showNewTask`, `showAdjustDay`.

**Вычисляемые значения:** `today` (YYYY-MM-DD), `todayTasks` (фильтр по дате), `completedToday`, `totalToday`, `hasApiKey`.

**Эффекты:**
1. **Автопоказ утренней рутины:** Если есть API-ключ, рутина ещё не пройдена сегодня, и модалка не показана — `setShowMorningRoutine(true)`.
2. **Пересчёт паттернов:** При каждом изменении задач вызывается `recalcPatternsFromTasks()`.
3. **Авто-саммаризация:** При монтировании (если есть API-ключ):
   - Проверяет, саммаризирован ли вчера (`getLastSummarizedDay()`). Если нет и вчера был план с задачами — генерирует daily summary.
   - Если сегодня понедельник и неделя не саммаризирована — генерирует weekly summary.
   - Оба вызова асинхронные, ошибки игнорируются (`.catch(() => {})`).
   - localStorage-флаги предотвращают повторные вызовы.

**Рендер:**
- `getTimeGreeting(name)` — приветствие по времени суток (утро/день/вечер/ночь) с эмодзи.
- `DayProgressCircle` — круговой прогресс выполненных задач.
- Кнопка "Скорректировать день" (если есть задачи и API-ключ).
- `DayView` — список задач, сгруппированных по времени суток.
- `TabBar` — нижняя навигация.

#### CalendarPage (src/pages/CalendarPage.tsx)

**Календарь с задачами.**

**Состояние:** `currentMonth` (Date), `selectedDate` (Date), `showNewTask` (boolean).

**Логика:**
- Рендерит сетку месяца с понедельника.
- Ведущие/замыкающие дни из соседних месяцев (приглушённые).
- Точки-индикаторы на днях с задачами.
- Подсветка выбранной даты и сегодня.
- `handleAddTask` — добавляет задачу с `selectedDate`.

**Рендер:** Заголовок с навигацией (← месяц →), сетка дней, DayView для выбранной даты, NewTaskDialog с `defaultDate`, TabBar.

#### DiaryPage (src/pages/DiaryPage.tsx)

**Дневник с трекингом настроения.**

**Состояние:** `content` (string), `mood` (1-5 | null), `isSaving` (boolean), `expandedDates` (Set<string>), `savedCount` (number).

**Эффект:** `restoreFromBackup()` при монтировании — загружает записи из localStorage.

**Логика:**
- `handleSave` — создаёт DiaryEntry (uuid, дата, контент, настроение, createdAt), сохраняет в store, отправляет в Telegram (если настроен), извлекает семантическую память через AI (`extractSemanticMemory`).
- Группировка записей по дате.
- Последние 14 прошедших дат показаны как раскрывающиеся группы.
- Удаление с подтверждением (модалка).
- Анимации через framer-motion (появление записей, раскрытие групп).

**Рендер:** Заголовок с эмодзи 📓, карточка ввода (настроение 5 эмодзи + textarea + кнопка сохранения), записи сегодня, раскрывающиеся группы прошлых дат, TabBar.

#### StatsPage (src/pages/StatsPage.tsx)

**Статистика и AI-анализ.**

**Состояние:** `isLoading`, `statsError`.

**Вычисляемые значения:**
- `totalTasks`, `completedTasks`, `completionRate` — из всех задач.
- `totalDays` — количество дней с планами.
- `avgMotivation`, `avgSleep` — из историй паттернов.
- `categoryStats` — total/completed по категориям.
- `last7DaysData` — массив из 7 объектов (date, dayName, total, completed, rate) для графика.
- `maxTasks` — максимум задач за 7 дней (для масштабирования графика).

**`handleGenerateStats`:**
1. Собирает diary entries за последние 7 дней.
2. Вызывает `generateAIStats` с 10 параметрами.
3. Сохраняет JSON-результат в store через `saveAIStats`.

**Рендер:**
- Кнопка "AI-анализ" / "Обновить" (если уже есть анализ).
- Insight-карточка (градиентный фон).
- Сетка 2x2: выполнение, серия дней, задач/день, лучший день.
- Тренд недели, паттерны, рекомендации (если есть AI-анализ).
- Столбчатый график за 7 дней (выполнено vs осталось).
- Прогресс-бары по категориям.
- История мотивации и сна (последние 7 записей).
- Саммаризации дней (последние 5).
- CTA-карточка (если нет AI-анализа).
- TabBar.

#### SettingsPage (src/pages/SettingsPage.tsx)

**Настройки приложения.**

**Состояние:** `showApiKey`, `showBotToken`, `testingKey`, `keyValid`, `testingTelegram`, `telegramOk`, `summarizing`, `memoryTab`, `newMemoryItem`.

**Карточки:**
1. **Профиль** — поле ввода имени.
2. **Статистика** — навигационная карточка (клик → `/stats`).
3. **AI (Groq)** — поле API-ключа (скрыт/показан), кнопка проверки, ссылка на console.groq.com.
4. **Telegram бот** — Bot Token, Chat ID, кнопка теста.
5. **Саммаризация** — 3 кнопки: день, неделя, месяц. Каждая собирает данные, вызывает AI, сохраняет результат.
6. **Память AI** — табы (факты/цели/предпочтения/проекты), добавление/удаление записей.
7. **Тема** — переключатель светлая/тёмная.
8. **Данные** — экспорт JSON, импорт JSON, очистка всего.

**Логика:**
- `handleTestKey` — вызывает `testGroqKey`, при успехе сбрасывает клиент.
- `handleTestTelegram` — вызывает `testTelegramConnection`.
- `handleExport` — скачивает JSON-файл.
- `handleImport` — file picker → `importData` → reload.
- `handleClear` — подтверждение → `clearAllData` → reload.
- Саммаризации: собирают данные из store, вызывают AI, показывают toast.

### Feature Components

#### MorningRoutine (src/components/MorningRoutine/index.tsx)

**Полноэкранная модалка (z-50) — wizard утренней рутины.**

**Пропсы:** `onComplete: () => void` — вызывается при завершении.

**Локальное состояние:**
- `voiceInput` — текст заметок.
- `isListening` — флаг распознавания речи.
- `adjustInput` — текст корректировки плана.
- `isAdjusting` — флаг AI-запроса корректировки.
- `expandedYesterday` — раскрытие вчерашних задач.
- `isCompleting` (useRef) — предотвращение двойного нажатия "Принять план".

**Шаги (stepOrder):** `sleep → energy → yesterday → voice → plan → done`

**Шаг 1 — Sleep:**
- 10 кнопок (1-10) для качества сна.
- Два кастомных time picker (часы + минуты) для времени засыпания и пробуждения.
- Часы: 0-23 (циклические через `% 24`).
- Минуты: ["00", "15", "30", "45"] (циклические через `% length`).
- Кнопка "Далее" активна при sleepScore > 0.

**Шаг 2 — Energy:**
- 3 кнопки: 🔋 Разбита, ⚡ Нормально, 🚀 Полна энергии.
- Навигация: Назад / Далее.

**Шаг 3 — Yesterday:**
- Список незавершённых задач вчера.
- На каждую задачу 3 кнопки: "Перенести", "Позже", "Удалить".
- Выбранное решение подсвечивается.
- Если нет незавершённых — текст "Нет незавершённых задач".

**Шаг 4 — Voice:**
- Textarea для заметок.
- Input для фокуса дня.
- Кнопка "Надиктовать" (Web Speech API, 15с таймаут).
- Кнопка "Составить план" → `handleGeneratePlan`.

**Шаг 5 — Plan:**
- Приветствие AI (заголовок).
- AI-комментарий (карточка с курсивом).
- Карточки задач (эмодзи времени, название, бейджи времени/приоритета, AI-заметка).
- Инлайн-поле корректировки плана + кнопка →.
- Мотивационная фраза (курсив).
- Кнопка "Всё ок!" → `handleAcceptPlan`.

**Ключевые функции:**

`handleGeneratePlan`:
1. Собирает pending задачи сегодня.
2. Форматирует решения по вчерашним задачам.
3. Вызывает `generateMorningPlan` с 12 параметрами.
4. Сохраняет user/AI сообщения в conversationHistory.
5. Сохраняет voiceNotes, AI-план.
6. Переходит на шаг "plan".

`handleAcceptPlan`:
1. Guard: `isCompleting.current` предотвращает двойной вызов.
2. Удаляет задачи, помеченные "delete".
3. Создаёт Task-объекты из AI-плана (aiGenerated=true, order=i).
4. Добавляет задачи в store.
5. Сохраняет DayPlan (date, taskIds, sleepScore, sleepTime, wakeTime, energyLevel, motivationScore, voiceNotes, focusOfTheDay, aiSummary, aiCommentary, completed=false, originalPlan).
6. Вызывает `recordDayData` с параметрами дня.
7. Извлекает семантическую память (`extractSemanticMemoryForSave`).
8. Отправляет план в Telegram.
9. Сбрасывает сессию, закрывает модалку.

`handleAdjustPlan`:
1. Вызывает `adjustPlan` с текущим планом и фидбеком.
2. Обновляет AI-план.
3. Сохраняет conversation messages.
4. Очищает input.

`toggleListening`:
1. Запускает Web Speech Recognition.
2. Аккумулирует текст в `voiceInput`.
3. Авто-стоп через 15 секунд.

`extractSemanticMemoryForSave`:
1. Динамический импорт `@/services/ai` (code splitting).
2. Форматирует conversation history.
3. Вызывает `extractSemanticMemory`.
4. Если есть новые данные — мерджит с существующей памятью через `Set` (дедупликация).

**UI:** Полноэкранный оверлей, step-индикатор (5 точек), анимации переходов через framer-motion (opacity + y).

#### DayProgressCircle (src/components/DayProgressCircle.tsx)

**SVG-круг с анимацией прогресса.**

**Пропсы:** `completed`, `total`, `date?`.

**Реализация:**
- Радиус: 70, длина окружности: 2 * π * 70 ≈ 439.8.
- `stroke-dasharray` = circumference, `stroke-dashoffset` = circumference * (1 - progress).
- Framer-motion анимация `initial: { strokeDashoffset: circumference }` → `animate: { strokeDashoffset: circumference * (1 - progress) }`.
- Градиент: primary → lavender.
- В центре: completed/total, день недели (русский), дата (русский месяц).

#### DayView (src/components/DayView.tsx)

**Список задач, сгруппированных по времени суток.**

**Пропсы:** `tasks[]`, `onComplete`, `onDelete`, `onAddTask`, `emptyMessage?`.

**Логика:**
- Группировка: morning → afternoon → evening → "Без времени".
- Сортировка внутри групп по приоритету (high → medium → low).
- Заголовок группы: эмодзи + название + счётчик выполненных.
- Каждая задача — `TaskCard`.
- Кнопка "+" внизу (если `onAddTask` передан).

#### TaskCard (src/components/TaskCard.tsx)

**Карточка задачи.**

**Пропсы:** `task: Task`, `onComplete`, `onDelete`, `index?`.

**Визуал:**
- Левая граница по приоритету (high=красный, medium=жёлтый, low=зелёный).
- Framer-motion entrance-анимация с задержкой по индексу.
- Кнопка complete (круг с галочкой).
- Эмодзи категории + эмодзи времени суток.
- Бейдж "AI" для AI-сгенерированных задач.
- Раскрывающаяся AI-заметка (клик).
- Модалка подтверждения удаления (framer-motion).

#### NewTaskDialog (src/components/NewTaskDialog.tsx)

**Диалог создания задачи.**

**Пропсы:** `open`, `onOpenChange`, `onSubmit`, `defaultDate?`.

**Состояние:** `title`, `priority`, `category`, `timeBlock`, `selectedDate`.

**Поля:** Название, приоритет (select), категория (select с эмодзи), время суток (select), дата (Popover + Calendar).

**Submit:** вызывает `onSubmit(title, priority, category, timeBlock, selectedDate)`.

#### DayAdjustDialog (src/components/DayAdjustDialog.tsx)

**Диалог корректировки дня.**

**Пропсы:** `open`, `onOpenChange`.

**Состояние:** `userInput`, `isLoading`, `error`, `result`.

**Логика:**
1. Показывает выполненные и оставшиеся задачи сегодня.
2. Пользователь описывает изменения.
3. `handleAdjust` — вызывает `adjustDayPlan` с текущим временем, оригинальным планом, completed/pending, паттернами, историей разговора, семантической памятью.
4. Сохраняет conversation messages.
5. Показывает результат (summary, commentary, newTasks).
6. `handleApply` — удаляет старые pending-задачи, создаёт новые Task-объекты (uuid v4), обновляет DayPlan.

### Layout

#### TabBar (src/components/layout/TabBar.tsx)

**Нижняя навигация.**

**Пропсы:** `onAddTask: () => void`.

**Табы:** Сегодня (/), Календарь (/calendar), Дневник (/diary), Настройки (/settings).

**Центр:** Кнопка "+" (круглая, primary, glow-тень).

**Фичи:**
- Активный индикатор — framer-motion `layoutId` с spring-анимацией.
- Glassmorphism фон.
- Safe-area padding снизу.

---

## 8. Маршрутизация

**Тип:** HashRouter (react-router-dom v7).

| Route | Component | Описание |
|---|---|---|
| `/` | TodayPage | Главная — задачи сегодня, утренняя рутина, прогресс |
| `/calendar` | CalendarPage | Календарь с точками задач |
| `/diary` | DiaryPage | Дневник с настроением |
| `/stats` | StatsPage | Статистика + AI-анализ |
| `/settings` | SettingsPage | Настройки, API-ключи, память, данные |

**Почему HashRouter:** Деплой на GitHub Pages не поддерживает history API fallback. HashRouter работает без серверной конфигурации.

---

## 9. PWA и конфигурация

### Vite Config (vite.config.ts)

- **Base path:** `/godday/` — для GitHub Pages.
- **Server:** host `::` (IPv4+IPv6), port `8080`.
- **Plugins:** `@vitejs/plugin-react()`, `tailwindcss()`, `VitePWA()`.
- **Alias:** `@` → `./src`.

### VitePWA

- **registerType:** `autoUpdate` — новый service worker активируется автоматически.
- **includeAssets:** `["favicon.svg"]`.
- **Manifest:** name "FlowDay — AI Task Manager", short_name "FlowDay", theme_color "#FFF0F5", display "standalone", orientation "portrait", SVG icon.
- **Workbox:** кэширует `**/*.{js,css,html,ico,png,svg,woff2}`.

### iOS Meta Tags (index.html)

- `apple-mobile-web-app-capable: yes` — полноэкранный режим.
- `apple-mobile-web-app-status-bar-style: black-translucent` — прозрачный статус-бар.
- `apple-mobile-web-app-title: FlowDay`.
- `apple-touch-icon: /favicon.svg`.
- `theme-color: #FFF0F5`.
- Viewport: `user-scalable=no`, `viewport-fit=cover` (для notch).

### GitHub Actions (.github/workflows/deploy.yml)

- **Trigger:** push на `main` или manual dispatch.
- **Steps:** checkout → setup Node 20 → npm ci → npm run build → deploy-pages.

---

## 10. Дизайн-система

### Цветовая палитра (Light)

| Токен | Значение | Описание |
|---|---|---|
| background | hsl(340 100% 97%) | Мягкий розовый |
| foreground | hsl(340 15% 20%) | Тёмный текст |
| card | hsl(0 0% 100%) | Белый |
| primary | hsl(340 70% 72%) | Розовый |
| secondary | hsl(270 40% 92%) | Лавандовый |
| muted | hsl(340 10% 94%) | Светло-серый |
| accent | hsl(340 60% 94%) | Розовый акцент |
| destructive | hsl(0 70% 60%) | Красный |
| border | hsl(340 15% 90%) | Светлая граница |

### Цветовая палитра (Dark)

| Токен | Значение | Описание |
|---|---|---|
| background | hsl(280 30% 8%) | Глубокий сливовый |
| foreground | hsl(340 15% 90%) | Светлый текст |
| card | hsl(280 25% 12%) | Тёмная карточка |
| primary | hsl(340 60% 65%) | Яркий розовый |
| secondary | hsl(270 30% 18%) | Тёмная лаванда |

### Приоритеты

- priority-high: hsl(0 70% 60%) — красный
- priority-medium: hsl(38 85% 55%) — жёлтый
- priority-low: hsl(150 50% 45%) — зелёный

### Кастомные утилиты

- `.glass` — `bg-card/80 backdrop-blur-xl border-border/50`.
- `.shadow-soft` — `0 2px 16px rgba(0,0,0,0.06)`.
- `.shadow-glow` — `0 0 20px rgba(232,160,191,0.3)`.
- `.safe-bottom` — `padding-bottom: env(safe-area-inset-bottom)`.

### Анимации

- fade-in (0.3s), fade-in-up (0.4s), slide-up (0.3s), slide-down (0.3s), scale-in (0.3s), bounce-soft (0.5s).

### Шрифт

`-apple-system, BlinkMacSystemFont, "Segoe UI", "SF Pro Display"` — нативные системные шрифты.

### Базовые стили

- `overscroll-behavior: none` — предотвращает rubber-band на iOS.
- `-webkit-font-smoothing: antialiased` — сглаживание шрифтов.
- Все кнопки: `rounded-full`, `active:scale-95` — тактильный отклик.

---

## 11. Потоки данных

### Утренняя рутина

1. **TodayPage** при монтировании проверяет: есть ли API-ключ? пройдена ли рутина сегодня? Если нет — показывает `MorningRoutine`.
2. Пользователь проходит шаги:
   - **Sleep:** оценивает качество сна (1-10), выбирает время засыпания и пробуждения.
   - **Energy:** выбирает уровень энергии (low/medium/high).
   - **Yesterday:** для каждой незавершённой вчерашней задачи выбирает: перенести / позже / удалить.
   - **Voice:** пишет заметки, задаёт фокус дня, может надиктовать голосом.
   - **Generate:** нажимает "Составить план" → вызов Groq API с полным контекстом.
   - **Plan:** видит AI-план, может скорректировать инлайн.
   - **Accept:** нажимает "Всё ок!" → задачи создаются, план сохраняется, паттерны записываются, память извлекается, план отправляется в Telegram.
3. Модалка закрывается, пользователь видит задачи на TodayPage.

### Корректировка дня

1. На TodayPage кнопка "Скорректировать день" → `DayAdjustDialog`.
2. Диалог показывает выполненные и оставшиеся задачи.
3. Пользователь описывает изменения → AI перестраивает оставшуюся часть дня.
4. Пользователь применяет → старые pending удаляются, новые создаются.

### Дневник → Семантическая память

1. Пользователь пишет записи в дневнике с настроением.
2. При сохранении: записи → store → Telegram-бэкап → AI извлекает семантическую память.
3. Новые факты/цели/предпочтения/проекты мерджатся с существующей памятью (дедупликация через Set).

### Авто-саммаризация (TodayPage)

1. При монтировании (если есть API-ключ):
   - Проверяет, саммаризирован ли вчера. Если нет и вчера был план → генерирует daily summary.
   - Если сегодня понедельник и неделя не саммаризирована → генерирует weekly summary.
2. Флаги в localStorage предотвращают повторные вызовы.
3. Ошибки игнорируются (тихий фейл).

### Ручная саммаризация (SettingsPage)

1. Пользователь нажимает кнопку (день/неделя/месяц).
2. Собираются все релевантные данные: задачи, планы, паттерны, записи дневника.
3. Вызывается соответствующая AI-функция.
4. Результат сохраняется в store, показывается toast.

### Генерация статистики (StatsPage)

1. Пользователь нажимает "AI-анализ".
2. Вычисляются все метрики из store.
3. Вызывается `generateAIStats` с полным контекстом.
4. JSON-результат сохраняется в store.
5. Страница рендерит: инсайт, карточки статистики, тренды, паттерны, рекомендации, график, категории, историю.

### Запись паттернов

1. При принятии утреннего плана → `recordDayData`.
2. Обновляет EWMA-средние (70% старое + 30% новое).
3. Добавляет записи в 30-дневные истории.
4. Определяет часто переносимые категории.
5. Дополнительно: `recalcPatternsFromTasks` вызывается при каждом изменении задач.

---

## 12. Миграции и совместимость

### Zustand Persist Migration (версия 2)

При загрузке из IndexedDB, если версия < 2, миграция инициализирует все недостающие поля:

**Массивы:**
- `tasks` → `[]`
- `dayPlans` → `{}`
- `conversationHistory` → `{}`
- `dailySummaries` → `{}`
- `weeklySummaries` → `{}`
- `monthlySummaries` → `{}`
- `diaryEntries` → `[]`

**Patterns:**
- `energyHistory` → `[]`
- `avgSleepDuration` → `8`
- `motivationHistory` → `[]`
- `sleepHistory` → `[]`
- `frequentlyPostponedCategories` → `[]`

**SemanticMemory:**
- `facts` → `[]`
- `goals` → `[]`
- `preferences` → `[]`
- `projects` → `[]`

### Защитные проверки

Во всех сторах добавлены `|| []` и `??` проверки для полей, которые могут отсутствовать в старых данных:
- `patternStore.ts` — все history-поля, avgCompletionRate, avgTasksPerDay.
- `memoryStore.ts` — все semanticMemory-массивы.
- `diaryStore.ts` — diaryEntries.
- `taskStore.ts` — tasks.
- `dayStore.ts` — dayPlans.
- `summaryStore.ts` — все summary-объекты.
- `settingsStore.ts` — settings.
- `MorningRoutine` — aiPlan, yesterdayTaskDecisions.
- `StatsPage` — все parsedStats-поля.

### Date Format Consistency

Все компоненты используют `format(new Date(), "yyyy-MM-dd")` из date-fns. Единственное исключение было в DayAdjustDialog (`toLocaleDateString("en-CA")`) — исправлено на `format()`.

### AI JSON Response

Все AI-вызовы используют `callAI()` с `response_format: { type: "json_object" }`. System prompt дублирует требование JSON. Функция `extractJSON` извлекает JSON из ответа (даже если AI добавил markdown-обёртку). `validateJSON` парсит и валидирует.
