# FlowDay — Техническая документация

---

## Архитектура

```
FlowDay/
├── src/
│   ├── App.tsx                    # Роутинг, тема, Toaster
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Tailwind + CSS переменные
│   │
│   ├── components/
│   │   ├── DayProgressCircle.tsx  # SVG круг прогресса дня
│   │   ├── DayView.tsx            # Отображение задач одного дня
│   │   ├── TaskCard.tsx           # Карточка задачи
│   │   ├── NewTaskDialog.tsx      # Диалог создания задачи
│   │   ├── DayAdjustDialog.tsx    # Диалог корректировки дня
│   │   ├── MorningRoutine/
│   │   │   └── index.tsx          # Утренний AI-диалог (4 шага)
│   │   ├── layout/
│   │   │   └── TabBar.tsx         # Нижняя навигация (5 вкладок + кнопка)
│   │   └── ui/                    # Shadcn UI компоненты
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── badge.tsx
│   │       ├── progress.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── select.tsx
│   │       ├── calendar.tsx
│   │       ├── popover.tsx
│   │       ├── scroll-area.tsx
│   │       ├── alert.tsx
│   │       └── sonner.tsx
│   │
│   ├── pages/
│   │   ├── TodayPage.tsx          # Главная — задачи сегодня
│   │   ├── CalendarPage.tsx       # Календарь + задачи выбранного дня
│   │   ├── StatsPage.tsx          # Статистика и паттерны
│   │   └── SettingsPage.tsx       # Настройки (API ключ, Telegram, тема)
│   │
│   ├── store/
│   │   ├── useStore.ts            # Zustand store (объединяет все slices)
│   │   ├── taskStore.ts           # Задачи: CRUD, batch add
│   │   ├── dayStore.ts            # Планы на дни
│   │   ├── patternStore.ts        # Паттерны поведения
│   │   ├── settingsStore.ts       # Настройки пользователя
│   │   └── aiStore.ts             # Состояние AI-диалогов
│   │
│   ├── services/
│   │   ├── groq.ts                # Groq SDK клиент
│   │   ├── ai.ts                  # AI функции (plan, adjust, report)
│   │   ├── telegram.ts            # Telegram Bot API
│   │   └── speech.ts              # Web Speech API (распознавание)
│   │
│   ├── utils/
│   │   └── prompts.ts             # System prompts для AI
│   │
│   ├── lib/
│   │   ├── storage.ts             # IndexedDB обёртка (idb)
│   │   └── utils.ts               # cn() — class merge utility
│   │
│   └── types/
│       └── index.ts               # TypeScript интерфейсы
│
├── public/
│   └── favicon.svg                # SVG иконка приложения
│
├── .github/workflows/
│   └── deploy.yml                 # GitHub Actions для деплоя
│
├── vite.config.ts                 # Vite + PWA плагин
├── package.json
├── tsconfig.json
└── index.html                     # HTML shell + iOS PWA meta tags
```

---

## Стек технологий

| Компонент | Технология | Версия | Назначение |
|---|---|---|---|
| Фреймворк | React | 19.0 | UI |
| Язык | TypeScript | 5.9 | Типизация |
| Билд | Vite | 8.0 | Сборка, dev server |
| State | Zustand | 5.0 | Управление состоянием |
| Хранение | idb | 8.0 | IndexedDB persistence |
| Стили | Tailwind CSS | 4.2 | Утилитарные стили |
| UI | Shadcn/ui + Radix | — | Компоненты |
| Анимации | Framer Motion | 12.27 | Page transitions, micro-animations |
| Роутинг | React Router | 7.1 | Hash-based routing |
| Даты | date-fns | 3.6 | Форматирование, навигация |
| Иконки | lucide-react | 0.462 | SVG иконки |
| AI SDK | groq-sdk | 0.25 | Groq API клиент |
| PWA | vite-plugin-pwa | 1.0 | Manifest + Service Worker |
| Drag & Drop | @dnd-kit | 6.3 | (зарезервировано) |
| Уведомления | sonner | 1.7 | Toast уведомления |
| Валидация | zod | 3.25 | (зарезервировано) |
| Утилиты | uuid | 13.0 | Генерация ID |

---

## Типы данных

### Task
```typescript
interface Task {
  id: string              // uuid v4
  title: string           // название задачи
  description?: string    // описание (зарезервировано)
  status: TaskStatus      // "todo" | "in-progress" | "done"
  priority: Priority      // "high" | "medium" | "low"
  category: Category      // "work" | "personal" | "health" | "study" | "errand" | "other"
  timeBlock?: TimeBlock   // "morning" | "afternoon" | "evening"
  dueDate?: string        // "YYYY-MM-DD" (локальная дата, не UTC)
  createdAt: string       // ISO timestamp
  completedAt?: string    // ISO timestamp выполнения
  aiGenerated: boolean    // создана AI или вручную
  aiNotes?: string        // заметка от AI
  order: number           // порядок в списке
}
```

### DayPlan
```typescript
interface DayPlan {
  date: string            // "YYYY-MM-DD"
  taskIds: string[]       // ID задач этого дня
  sleepScore: number      // 1-10
  motivationScore: number // 1-10
  voiceNotes: string      // надиктованный текст
  aiSummary: string       // приветствие от AI
  completed: boolean      // день завершён
  originalPlan: DayPlanTask[]  // исходный AI план (для корректировки)
}
```

### DayPlanTask
```typescript
interface DayPlanTask {
  title: string
  priority: Priority
  category: Category
  suggestedTime: TimeBlock  // morning | afternoon | evening
  aiNote: string            // объяснение от AI
}
```

### Patterns
```typescript
interface Patterns {
  avgStartTime: number                    // среднее время начала (час)
  avgTasksPerDay: number                  // среднее кол-во задач
  avgCompletionRate: number               // средний % выполнения (0-1)
  frequentlyPostponedCategories: Category[]  // часто переносимые категории
  motivationHistory: { date: string; score: number }[]  // последние 30 дней
  sleepHistory: { date: string; score: number }[]       // последние 30 дней
  lastUpdated: string                     // ISO timestamp
}
```

### Settings
```typescript
interface Settings {
  name: string              // имя пользователя
  groqApiKey: string        // Groq API ключ
  telegramBotToken: string  // Telegram Bot Token
  telegramChatId: string    // Telegram Chat ID
  theme: "light" | "dark"   // тема
  language: string          // "ru"
}
```

### MorningSession
```typescript
interface MorningSession {
  step: "sleep" | "motivation" | "voice" | "plan" | "done"
  sleepScore: number
  motivationScore: number
  voiceNotes: string
  aiPlan: DayPlanTask[]
  aiGreeting: string
  aiEncouragement: string
  isLoading: boolean
  error: string | null
}
```

---

## Zustand Store

### Структура
Единый store с 5 slices, объединёнными через spread оператор:

```typescript
export const useStore = create<StoreState>()(
  persist(
    (set, get, api) => ({
      ...createTaskStore(set, get, api),
      ...createDayStore(set, get, api),
      ...createPatternStore(set, get, api),
      ...createSettingsStore(set, get, api),
      ...createAIStore(set, get, api),
    }),
    {
      name: "flowday-data",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
)
```

### Persistence
- **Механизм**: Zustand `persist` middleware + `createJSONStorage`
- **Хранилище**: IndexedDB через библиотеку `idb`
- **Ключ**: `flowday-state` в объектном хранилище `kv`
- **База данных**: `flowday-db`
- **Сериализация**: JSON.stringify/parse
- **Загрузка**: при создании store автоматически загружается из IndexedDB
- **Сохранение**: при каждом изменении state

### taskStore
| Метод | Параметры | Возвращает | Описание |
|---|---|---|---|
| `addTask` | title, priority?, category?, timeBlock?, aiGenerated?, aiNotes?, dueDate? | Task | Добавляет одну задачу |
| `addTasks` | newTasks: Task[] | void | Batch добавление (для AI плана) |
| `updateTask` | id, updates: Partial<Task> | void | Обновляет поля задачи |
| `deleteTask` | id | void | Удаляет задачу |
| `moveTask` | id, status | void | Меняет статус |
| `completeTask` | id | void | Отмечает выполненной |
| `uncompleteTask` | id | void | Снимает выполнение |
| `getTasksByStatus` | status | Task[] | Фильтр по статусу |
| `getTasksByDate` | date | Task[] | Фильтр по дате |
| `getTodayTasks` | — | Task[] | Задачи на сегодня |

### dayStore
| Метод | Параметры | Возвращает | Описание |
|---|---|---|---|
| `saveDayPlan` | plan: DayPlan | void | Сохраняет план на день |
| `getDayPlan` | date | DayPlan \| undefined | Получает план |
| `getTodayPlan` | — | DayPlan \| undefined | План на сегодня |
| `markDayComplete` | date | void | Отмечает день завершённым |
| `hasMorningRoutine` | date | boolean | Был ли morning routine |

### patternStore
| Метод | Параметры | Возвращает | Описание |
|---|---|---|---|
| `recordDayData` | sleepScore, motivationScore, tasksTotal, tasksCompleted, postponedCategories | void | Записывает данные дня |
| `getPatternsSummary` | — | string | Текстовое резюме паттернов для AI |

### settingsStore
| Метод | Параметры | Возвращает | Описание |
|---|---|---|---|
| `updateSettings` | updates: Partial<Settings> | void | Обновляет настройки |
| `getDisplayName` | — | string | Имя или "друг" |

### aiStore
| Метод | Параметры | Возвращает | Описание |
|---|---|---|---|
| `setMorningStep` | step | void | Шаг morning routine |
| `setSleepScore` | score | void | Оценка сна |
| `setMotivationScore` | score | void | Оценка мотивации |
| `setVoiceNotes` | notes | void | Голосовые заметки |
| `setAIPlan` | plan, greeting, encouragement | void | AI план |
| `setAILoading` | loading | void | Состояние загрузки |
| `setAIError` | error | void | Ошибка |
| `resetMorningSession` | — | void | Сброс сессии |

---

## AI сервисы

### Groq клиент (`services/groq.ts`)
```typescript
let client: Groq | null = null

function getGroqClient(): Groq | null {
  const apiKey = useStore.getState().settings.groqApiKey
  if (!apiKey) return null
  if (!client) {
    client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
  }
  return client
}
```

- **Модель**: `llama-3.3-70b-versatile`
- **dangerouslyAllowBrowser: true** — необходимо для клиентского использования
- **Безопасность**: ключ хранится только в localStorage пользователя

### AI функции (`services/ai.ts`)

| Функция | Параметры | Возвращает | Описание |
|---|---|---|---|
| `generateMorningPlan` | sleepScore, motivationScore, voiceNotes, patternsSummary, pendingTasks | { greeting, plan, encouragement } | Утренний план |
| `adjustPlan` | currentPlan, userFeedback | DayPlanTask[] | Корректировка плана в morning routine |
| `adjustDayPlan` | currentTime, originalPlan, completedTasks, pendingTasks, patternsSummary, userInput | { summary, newTasks } | Корректировка дня |
| `generateEveningReport` | completedTasks, postponedTasks, patternsSummary | EveningReport | Вечерний отчёт |
| `parseVoiceInput` | voiceText | Task[] | Парсинг голосового ввода |
| `testGroqKey` | apiKey | boolean | Проверка ключа |

### Retry логика
```typescript
async function callAI(prompt: string, maxRetries = 2): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await client.chat.completions.create({...})
      return response.choices[0]?.message?.content
    } catch (e) {
      if (i === maxRetries - 1) throw e
      await new Promise((r) => setTimeout(r, 1000 * (i + 1))) // exponential backoff
    }
  }
}
```

### JSON валидация
```typescript
function extractJSON(text: string): string {
  const cleaned = text.trim()
  if (cleaned.startsWith("{")) return cleaned
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  return jsonMatch ? jsonMatch[0] : cleaned
}

function validateJSON<T>(text: string): T | null {
  try {
    return JSON.parse(extractJSON(text)) as T
  } catch {
    return null
  }
}
```

### System prompts (`utils/prompts.ts`)

**MORNING_ROUTINE_PROMPT** — генерирует план на день с учётом:
- Сна и мотивации
- Голосовых заметок
- Паттернов поведения
- Незавершённых задач

**ADJUST_DAY_PROMPT** — корректирует оставшуюся часть дня:
- Текущее время
- Исходный утренний план
- Выполненные задачи (не меняются)
- Оставшиеся задачи (могут быть изменены)
- Паттерны
- Ввод пользователя

---

## Компоненты

### MorningRoutine (`components/MorningRoutine/index.tsx`)
- **Тип**: Полноэкранный оверлей (fixed, z-50)
- **Шаги**: sleep → motivation → voice → plan → done
- **Без AnimatePresence** — простой conditional render для iOS совместимости
- **Без backdrop-blur** — предотвращает блокировку тапов на iOS
- **Селекторы** — каждый `useStore((s) => s.field)` вместо `useStore()` для минимизации ре-рендеров
- **useRef** — `isCompleting` предотвращает двойное нажатие "Всё ок"
- **Batch add** — `addTasks()` вместо цикла `addTask()` для производительности

### DayProgressCircle (`components/DayProgressCircle.tsx`)
- SVG круг с `stroke-dasharray` / `stroke-dashoffset`
- Градиент от primary до lavender
- Анимация через framer-motion `strokeDashoffset`
- Радиус 70, обводка 8

### DayView (`components/DayView.tsx`)
- Группировка задач по timeBlock (morning/afternoon/evening)
- Сортировка внутри группы по приоритету
- Отображение "без времени" отдельно
- Пустое состояние с кнопкой добавления

### TaskCard (`components/TaskCard.tsx`)
- Border-left цвет зависит от приоритета
- Анимация появления с задержкой по индексу
- Кнопка выполнения (круг с check)
- Бейджи: категория + время + AI
- Кнопка удаления

### TabBar (`components/layout/TabBar.tsx`)
- 5 вкладок: Сегодня | Календарь | ➕ | Статистика | Настройки
- Центральная кнопка ➕ — выпуклая, с glow
- Анимированный индикатор активной вкладки (framer-motion layoutId)
- Фиксированный снизу, glassmorphism фон

### NewTaskDialog (`components/NewTaskDialog.tsx`)
- Поля: название, приоритет, категория, время, дата
- Выбор даты через Popover + Calendar
- `defaultDate` проп для предустановки даты (из календаря)

### DayAdjustDialog (`components/DayAdjustDialog.tsx`)
- Показывает выполненные ✅ и оставшиеся ⏳ задачи
- Текстовое поле для описания изменений
- AI возвращает новый план для оставшихся задач
- При применении: удаляет старые pending, добавляет новые

---

## Дизайн-система

### Цветовая палитра (CSS переменные)

**Светлая тема:**
```
--background: hsl(340 100% 97%)     /* розовый фон */
--foreground: hsl(340 15% 20%)      /* тёмный текст */
--card: hsl(0 0% 100%)              /* белые карточки */
--primary: hsl(340 70% 72%)         /* розовый акцент */
--secondary: hsl(270 40% 92%)       /* лавандовый */
--muted: hsl(340 10% 94%)           /* приглушённый */
--accent: hsl(340 60% 94%)          /* розовый акцент */
--border: hsl(340 15% 90%)          /* границы */
--ring: hsl(340 70% 72%)            /* фокус */
--destructive: hsl(0 70% 60%)       /* красный */
--radius: 0.75rem                   /* скругление */
```

**Тёмная тема:**
```
--background: hsl(280 30% 8%)       /* глубокий сливовый */
--foreground: hsl(340 15% 90%)      /* светлый текст */
--card: hsl(280 25% 12%)            /* тёмные карточки */
--primary: hsl(340 60% 65%)         /* розовый */
--secondary: hsl(270 30% 18%)       /* тёмная лаванда */
```

### Кастомные утилиты
```css
.glass          /* bg-card/80 backdrop-blur-xl border-border/50 */
.shadow-soft    /* 0 2px 16px rgba(0,0,0,0.06) */
.shadow-glow    /* 0 0 20px rgba(232,160,191,0.3) */
.safe-bottom    /* padding-bottom: env(safe-area-inset-bottom) */
```

### Анимации
```css
fade-in         /* opacity 0→1, 0.3s */
fade-in-up      /* opacity 0→1 + translateY 16px→0, 0.4s */
slide-up        /* translateY 100%→0, 0.3s */
slide-down      /* translateY -100%→0, 0.3s */
scale-in        /* opacity 0→1 + scale 0.95→1, 0.3s */
bounce-soft     /* scale 0.9→1.05→1, 0.5s */
```

### Компоненты UI
- **Button**: `rounded-full`, pill-формы, `active:scale-95`
- **Card**: `rounded-2xl`, `shadow-soft`
- **Input**: `rounded-xl`, `h-12`, `transition-all`
- **Dialog**: `rounded-2xl`, backdrop `bg-black/30 backdrop-blur-sm`
- **Badge**: `rounded-full`, `bg-primary/15 text-primary`
- **Progress**: `rounded-full`, градиент `from-primary to-lavender`

---

## PWA

### Manifest (`vite-plugin-pwa`)
```json
{
  "name": "FlowDay — AI Task Manager",
  "short_name": "FlowDay",
  "theme_color": "#FFF0F5",
  "background_color": "#FFF0F5",
  "display": "standalone",
  "orientation": "portrait"
}
```

### iOS meta tags (`index.html`)
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="FlowDay">
<link rel="apple-touch-icon" href="/favicon.svg">
<meta name="theme-color" content="#FFF0F5">
```

### Service Worker
- **Режим**: `generateSW` (автоматическая генерация workbox)
- **Стратегия**: cache-first для статики
- **Обновление**: `autoUpdate` — новый SW активируется автоматически

---

## Деплой

### GitHub Actions (`.github/workflows/deploy.yml`)
1. Trigger: push на `main` или manual dispatch
2. Node.js 20, `npm ci`, `npm run build`
3. Upload `./dist` как pages artifact
4. Deploy через `actions/deploy-pages@v4`

### Vite base path
```typescript
base: "/godday/"  // совпадает с именем репозитория
```

---

## Безопасность

- **Groq API ключ**: хранится в localStorage, не передаётся третьим лицам
- **Telegram Bot Token**: хранится в localStorage, используется только для отправки сообщений
- **dangerouslyAllowBrowser**: необходимо для клиентского Groq SDK, безопасно т.к. приложение персональное
- **Нет серверной части**: все данные локально, нет бэкенда для взлома

---

## Известные ограничения

1. **Web Speech API** — не работает в Safari iOS (только Chrome Desktop)
2. **Push-уведомления** — не реализованы (только Telegram бот)
3. **iOS PWA** — нет home screen widget, нет push через PWA
4. **IndexedDB** — данные привязаны к браузеру, нет синхронизации между устройствами
5. **Groq free tier** — есть лимиты запросов (RPM, TPM)
