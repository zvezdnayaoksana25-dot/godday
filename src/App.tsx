import { Toaster } from "@/components/ui/sonner"
import { HashRouter, Route, Routes } from "react-router-dom"
import { useEffect, Component, type ReactNode } from "react"
import { useStore } from "./store/useStore"
import TodayPage from "./pages/TodayPage"
import CalendarPage from "./pages/CalendarPage"
import SettingsPage from "./pages/SettingsPage"
import StatsPage from "./pages/StatsPage"
import DiaryPage from "./pages/DiaryPage"

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold mb-3">Что-то пошло не так</h1>
            <p className="text-sm text-muted-foreground mb-4 font-mono break-all">{this.state.error?.message}</p>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="h-10 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium"
            >
              Сбросить данные и перезагрузить
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const App = () => {
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  return (
    <ErrorBoundary>
      <Toaster richColors position="top-center" />
      <HashRouter>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/diary" element={<DiaryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
