import { Toaster } from "@/components/ui/sonner"
import { HashRouter, Route, Routes } from "react-router-dom"
import { useEffect } from "react"
import { useStore } from "./store/useStore"
import TodayPage from "./pages/TodayPage"
import CalendarPage from "./pages/CalendarPage"
import SettingsPage from "./pages/SettingsPage"
import StatsPage from "./pages/StatsPage"

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
    <>
      <Toaster richColors position="top-center" />
      <HashRouter>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </HashRouter>
    </>
  )
}

export default App
