import { useNavigate, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { Home, BarChart3, Settings, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const TabBar = ({ onAddTask }: { onAddTask: () => void }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { path: "/", icon: Home, label: "Сегодня" },
    { path: "/stats", icon: BarChart3, label: "Статистика" },
    { path: "/settings", icon: Settings, label: "Настройки" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom">
      <div className="glass border-t border-border/50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full px-4 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            )
          })}
          <button
            onClick={onAddTask}
            className="flex flex-col items-center justify-center gap-0.5 h-full px-4 text-primary"
          >
            <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow active:scale-95 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default TabBar
