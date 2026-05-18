import { useState } from "react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Check, X, Loader2, Moon, Sun, Download, Upload, Trash2 } from "lucide-react"
import TabBar from "@/components/layout/TabBar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/store/useStore"
import { testGroqKey } from "@/services/ai"
import { testTelegramConnection } from "@/services/telegram"
import { exportData, importData, clearAllData } from "@/lib/storage"
import { resetGroqClient } from "@/services/groq"

const SettingsPage = () => {
  const navigate = useNavigate()
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)

  const [showApiKey, setShowApiKey] = useState(false)
  const [showBotToken, setShowBotToken] = useState(false)
  const [testingKey, setTestingKey] = useState(false)
  const [keyValid, setKeyValid] = useState<boolean | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [telegramOk, setTelegramOk] = useState<boolean | null>(null)

  const handleTestKey = async () => {
    if (!settings.groqApiKey) return
    setTestingKey(true)
    setKeyValid(null)
    const valid = await testGroqKey(settings.groqApiKey)
    setKeyValid(valid)
    setTestingKey(false)
    if (valid) {
      resetGroqClient()
    }
  }

  const handleTestTelegram = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) return
    setTestingTelegram(true)
    setTelegramOk(null)
    const ok = await testTelegramConnection()
    setTelegramOk(ok)
    setTestingTelegram(false)
  }

  const handleExport = async () => {
    const data = await exportData()
    if (data) {
      const blob = new Blob([data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `flowday-backup-${format(new Date(), "yyyy-MM-dd")}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      await importData(text)
    }
    input.click()
  }

  const handleClear = async () => {
    if (window.confirm("Удалить все данные? Это действие нельзя отменить.")) {
      await clearAllData()
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background pb-24">
        <div className="px-5 pt-12 pb-6">
          <h1 className="text-2xl font-semibold mb-6">Настройки</h1>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Профиль</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Имя</Label>
                  <Input
                    placeholder="Как тебя называть?"
                    value={settings.name}
                    onChange={(e) => updateSettings({ name: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI (Groq)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        placeholder="gsk_..."
                        value={settings.groqApiKey}
                        onChange={(e) => {
                          updateSettings({ groqApiKey: e.target.value })
                          setKeyValid(null)
                        }}
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTestKey}
                    disabled={testingKey || !settings.groqApiKey}
                    size="sm"
                    variant="soft"
                  >
                    {testingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : keyValid === true ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : keyValid === false ? (
                      <X className="h-4 w-4 mr-1 text-destructive" />
                    ) : null}
                    Проверить ключ
                  </Button>
                  {keyValid === true && <span className="text-xs text-green-500">Ключ работает</span>}
                  {keyValid === false && <span className="text-xs text-destructive">Ключ не работает</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Получи ключ на{" "}
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    console.groq.com
                  </a>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Telegram бот</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Bot Token</Label>
                  <div className="relative">
                    <Input
                      type={showBotToken ? "text" : "password"}
                      placeholder="123456:ABC-DEF..."
                      value={settings.telegramBotToken}
                      onChange={(e) => {
                        updateSettings({ telegramBotToken: e.target.value })
                        setTelegramOk(null)
                      }}
                    />
                    <button
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showBotToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Chat ID</Label>
                  <Input
                    placeholder="123456789"
                    value={settings.telegramChatId}
                    onChange={(e) => {
                      updateSettings({ telegramChatId: e.target.value })
                      setTelegramOk(null)
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleTestTelegram}
                    disabled={testingTelegram || !settings.telegramBotToken || !settings.telegramChatId}
                    size="sm"
                    variant="soft"
                  >
                    {testingTelegram ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : telegramOk === true ? (
                      <Check className="h-4 w-4 mr-1 text-green-500" />
                    ) : telegramOk === false ? (
                      <X className="h-4 w-4 mr-1 text-destructive" />
                    ) : null}
                    Тест отправки
                  </Button>
                  {telegramOk === true && <span className="text-xs text-green-500">Бот работает</span>}
                  {telegramOk === false && <span className="text-xs text-destructive">Ошибка</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Необязательно. Бот будет получать утренний план и вечерний отчёт.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Тема</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    variant={settings.theme === "light" ? "default" : "outline"}
                    onClick={() => updateSettings({ theme: "light" })}
                    className="flex-1"
                  >
                    <Sun className="h-4 w-4 mr-2" /> Светлая
                  </Button>
                  <Button
                    variant={settings.theme === "dark" ? "default" : "outline"}
                    onClick={() => updateSettings({ theme: "dark" })}
                    className="flex-1"
                  >
                    <Moon className="h-4 w-4 mr-2" /> Тёмная
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Данные</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" onClick={handleExport} className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" /> Экспорт JSON
                </Button>
                <Button variant="outline" onClick={handleImport} className="w-full justify-start">
                  <Upload className="h-4 w-4 mr-2" /> Импорт JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="w-full justify-start text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Очистить всё
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <TabBar onAddTask={() => {}} />
      </div>
    </>
  )
}

export default SettingsPage
