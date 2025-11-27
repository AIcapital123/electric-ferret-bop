import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://ehzwwaoivcfaxnzobyat.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoend3YW9pdmNmYXhuem9ieWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ1NTksImV4cCI6MjA2OTU4MDU1OX0.ystRCL07ocUeJUmIPJX2Xb2jp418TYiXMMT5uv-rFZE'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? FALLBACK_URL
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? FALLBACK_ANON

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase env variables not set. Using fallback project values. ' +
    'For production, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)