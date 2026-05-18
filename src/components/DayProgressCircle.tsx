import { motion } from "framer-motion"

interface DayProgressCircleProps {
  completed: number
  total: number
  date?: string
}

const DayProgressCircle = ({ completed, total, date }: DayProgressCircleProps) => {
  const percentage = total > 0 ? (completed / total) * 100 : 0
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const dayNames = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
  const monthNames = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ]

  const today = date ? new Date(date) : new Date()
  const dayName = dayNames[today.getDay()]
  const dayNum = today.getDate()
  const monthName = monthNames[today.getMonth()]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--lavender))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold">{completed}/{total}</span>
          <span className="text-xs text-muted-foreground">задач</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm font-medium">{dayName}</p>
        <p className="text-xs text-muted-foreground">{dayNum} {monthName}</p>
      </div>
    </div>
  )
}

export default DayProgressCircle
