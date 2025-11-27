import React, { useEffect } from 'react'

declare global {
  interface Window {
    Sentry?: any
  }
}

export default function SentryInit() {
  useEffect(() => {
    const dsn = (import.meta.env.VITE_SENTRY_DSN ?? import.meta.env.SENTRY_DSN) as string | undefined
    if (!dsn) return

    const script = document.createElement('script')
    script.src = 'https://browser.sentry-cdn.com/7.57.0/bundle.min.js'
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (window.Sentry) {
        window.Sentry.init({ dsn, integrations: [] })
      }
    }
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])
  return null
}