import Groq from "groq-sdk"
import { useStore } from "@/store/useStore"

let client: Groq | null = null

export function getGroqClient(): Groq | null {
  const apiKey = useStore.getState().settings.groqApiKey
  if (!apiKey) return null

  if (!client) {
    client = new Groq({
      apiKey,
      dangerouslyAllowBrowser: true,
    })
  }

  return client
}

export function resetGroqClient() {
  client = null
}

export const MODEL = "llama-3.3-70b-versatile"
