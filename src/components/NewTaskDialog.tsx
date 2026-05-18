import { useState } from "react"
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
import type { Priority, Category, TimeBlock } from "@/types"

interface NewTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, priority: Priority, category: Category, timeBlock?: TimeBlock) => void
}

const NewTaskDialog = ({ open, onOpenChange, onSubmit }: NewTaskDialogProps) => {
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [category, setCategory] = useState<Category>("personal")
  const [timeBlock, setTimeBlock] = useState<TimeBlock>("morning")

  const handleSubmit = () => {
    if (!title.trim()) return
    onSubmit(title.trim(), priority, category, timeBlock)
    setTitle("")
    setPriority("medium")
    setCategory("personal")
    setTimeBlock("morning")
    onOpenChange(false)
  }

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

          <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!title.trim()}>
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewTaskDialog
