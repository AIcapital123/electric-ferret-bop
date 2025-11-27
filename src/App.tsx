import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import RequireAuth from "@/components/auth/RequireAuth"
import { LanguageProvider } from "@/components/language/language-provider"
import AssistantWidget from "@/components/chat/AssistantWidget"
import LoadingScreen from "@/components/LoadingScreen"
import React, { Suspense, lazy } from "react"

const queryClient = new QueryClient()

const Index = lazy(() => import("./pages/Index"))
const DealDetailPage = lazy(() => import("./pages/DealDetailPage"))
const NotFound = lazy(() => import("./pages/NotFound"))
const DealsPage = lazy(() => import("./pages/Deals"))
const AnalyticsPage = lazy(() => import("./pages/Analytics"))
const SettingsPage = lazy(() => import("./pages/Settings"))
const Login = lazy(() => import("./pages/Login"))
const HelpPage = lazy(() => import("./pages/Help"))
const TasksPage = lazy(() => import("./pages/Tasks"))

const WithAssistant = ({ children }: { children: React.ReactNode }) => (
  <>
    {children}
    <AssistantWidget />
  </>
)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<RequireAuth><WithAssistant><Index /></WithAssistant></RequireAuth>} />
              <Route path="/deals" element={<RequireAuth><WithAssistant><DealsPage /></WithAssistant></RequireAuth>} />
              <Route path="/analytics" element={<RequireAuth><WithAssistant><AnalyticsPage /></WithAssistant></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><WithAssistant><SettingsPage /></WithAssistant></RequireAuth>} />
              <Route path="/deals/:id" element={<RequireAuth><WithAssistant><DealDetailPage /></WithAssistant></RequireAuth>} />
              <Route path="/tasks" element={<RequireAuth><WithAssistant><TasksPage /></WithAssistant></RequireAuth>} />
              <Route path="/help" element={<RequireAuth><WithAssistant><HelpPage /></WithAssistant></RequireAuth>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
)

export default App