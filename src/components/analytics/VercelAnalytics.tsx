import React, { useEffect } from 'react'

export default function VercelAnalytics() {
  useEffect(() => {
    const enabled = (import.meta.env.VITE_VERCEL_ANALYTICS_ENABLE ?? import.meta.env.VERCEL_ANALYTICS_ENABLE) === 'true'
    if (!enabled) return
    const script = document.createElement('script')
    script.src = 'https://cdn.vercel-insights.com/v1/script.js'
    script.defer = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])
  return null
}