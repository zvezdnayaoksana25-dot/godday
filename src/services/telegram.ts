import { useStore } from "@/store/useStore"

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const { telegramBotToken, telegramChatId } = useStore.getState().settings

  if (!telegramBotToken || !telegramChatId) {
    return false
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: text,
        parse_mode: "HTML",
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

export async function sendMorningPlan(plan: string): Promise<void> {
  const hasConfig = !!(
    useStore.getState().settings.telegramBotToken &&
    useStore.getState().settings.telegramChatId
  )
  if (!hasConfig) return

  await sendTelegramMessage(`🌸 <b>План на день</b>\n\n${plan}`)
}

export async function sendEveningReport(report: string): Promise<void> {
  const hasConfig = !!(
    useStore.getState().settings.telegramBotToken &&
    useStore.getState().settings.telegramChatId
  )
  if (!hasConfig) return

  await sendTelegramMessage(`🌙 <b>Вечерний отчёт</b>\n\n${report}`)
}

export async function testTelegramConnection(): Promise<boolean> {
  return sendTelegramMessage("✨ FlowDay подключён! Всё работает.")
}
