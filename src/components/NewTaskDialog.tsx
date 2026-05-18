import { useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Priority, Category, TimeBlock } from "@/types"

interface NewTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock, dueDate?: string) => void
  defaultDate?: string
}

const NewTaskDialog = ({ open, onOpenChange, onSubmit, defaultDate }: NewTaskDialogProps) => {
  const today = new Date()
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [category, setCategory] = useState<Category>("personal")
  const [timeBlock, setTimeBlock] = useState<TimeBlock>("morning")
  const [selectedDate, setSelectedDate] = useState<Date>(
    defaultDate ? new Date(defaultDate + "T00:00:00") : today
  )

  const handleSubmit = () => {
    if (!title.trim()) return
    const dueDate = format(selectedDate, "yyyy-MM-dd")
    onSubmit(title.trim(), priority, category, timeBlock, dueDate)
    setTitle("")
    setPriority("medium")
    setCategory("personal")
    setTimeBlock("morning")
    setSelectedDate(today)
    onOpenChange(false)
  }

  const isToday = selectedDate.toDateString() === today.toDateString()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              placeholder="Что нужно сделать?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Приоритет</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Категория</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="work">💼 Работа</SelectItem>
                <SelectItem value="personal">🏠 Личное</SelectItem>
                <SelectItem value="health">🌿 Здоровье</SelectItem>
                <SelectItem value="study">📚 Учёба</SelectItem>
                <SelectItem value="errand">🛒 Дела</SelectItem>
                <SelectItem value="other">📝 Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Время</Label>
            <Select value={timeBlock} onValueChange={(v) => setTimeBlock(v as TimeBlock)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                <Button variant="outline" className="w-full justify-start text-left font-normal h-12">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {isToday
                    ? "Сегодня"
                    : format(selectedDate, "d MMMM yyyy", { locale: ru })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!title.trim()}>
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewTaskDialog
