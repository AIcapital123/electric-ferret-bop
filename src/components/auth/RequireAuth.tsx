import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type Props = {
  children: React.ReactNode
}

export default function RequireAuth({ children }: Props) {
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let mounted = true

    // DEMO MODE: bypass auth entirely
    if (localStorage.getItem('demo_mode') === 'true') {
      setChecking(false)
      return
    }

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session) {
        navigate('/login', { replace: true, state: { from: location.pathname } })
      } else {
        setChecking(false)
      }
    }

    check()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login', { replace: true, state: { from: location.pathname } })
      } else {
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [navigate, location.pathname])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-b-2 rounded-full" />
      </div>
    )
  }

  return <>{children}</>
}