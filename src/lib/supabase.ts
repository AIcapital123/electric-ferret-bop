import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ehzwwaoivcfaxnzobyat.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoend3YW9pdmNmYXhuem9ieWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ1NTksImV4cCI6MjA2OTU4MDU1OX0.ystRCL07ocUeJUmIPJX2Xb2jp418TYiXMMT5uv-rFZE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)