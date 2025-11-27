import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import "./globals.css"
import VercelAnalytics from "./components/analytics/VercelAnalytics"
import SentryInit from "./components/analytics/SentryInit"

const root = document.getElementById("root")!
createRoot(root).render(
  <>
    <SentryInit />
    <VercelAnalytics />
    <App />
  </>
)