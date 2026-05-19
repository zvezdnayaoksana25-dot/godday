import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import type { Task, Priority, Category, TimeBlock } from "@/types"

const categoryEmojis: Record<Category, string> = {
  work: "💼",
  personal: "🏠",
  health: "🌿",
  study: "📚",
  errand: "🛒",
  other: "📝",
}

const categoryLabels: Record<Category, string> = {
  work: "Работа",
  personal: "Личное",
  health: "Здоровье",
  study: "Учёба",
  errand: "Дела",
  other: "Другое",
}

interface EditTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onSubmit: (id: string, title: string, priority: Priority, category: Category, timeBlock?: TimeBlock, dueDate?: string) => void
}

const EditTaskDialog = ({ open, onOpenChange, task, onSubmit }: EditTaskDialogProps) => {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [category, setCategory] = useState<Category>("other")
  const [timeBlock, setTimeBlock] = useState<TimeBlock | undefined>(undefined)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setPriority(task.priority)
      setCategory(task.category)
      setTimeBlock(task.timeBlock)
      setSelectedDate(task.dueDate ? new Date(task.dueDate + "T00:00:00") : undefined)
    }
  }, [task])

  const handleSubmit = () => {
    if (!task || !title.trim()) return
    const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : task.dueDate
    onSubmit(task.id, title.trim(), priority, category, timeBlock, dateStr)
    onOpenChange(false)
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать задачу</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              className="h-12"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          <div className="space-y-2">
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">🔴 Важно</SelectItem>
                <SelectItem value="medium">🟡 Средне</SelectItem>
                <SelectItem value="low">🟢 Можно позже</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryEmojis) as Category[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryEmojis[cat]} {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Время суток</Label>
            <Select value={timeBlock || "none"} onValueChange={(v) => setTimeBlock(v === "none" ? undefined : v as TimeBlock)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Не указано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не указано</SelectItem>
                <SelectItem value="morning">🌅 Утро</SelectItem>
                <SelectItem value="afternoon">☀️ День</SelectItem>
                <SelectItem value="evening">🌙 Вечер</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-12 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: ru }) : "Выбрать дату"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ru}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!title.trim()}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EditTaskDialog
