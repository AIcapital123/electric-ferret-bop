import { showSuccess, showError } from '@/utils/toast'

type IncomingEmail = {
  from: string
  subject: string
  body: string
}

// Mock implementation for now
export class EmailSyncService {
  private syncInterval: NodeJS.Timeout | null = null

  async syncEmails() {
    try {
      // Call the Edge Function (test mode produces sample input)
      const res = await fetch(
        "https://ehzwwaoivcfaxnzobyat.supabase.co/functions/v1/gmail-sync",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoend3YW9pdmNmYXhuem9ieWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ1NTksImV4cCI6MjA2OTU4MDU1OX0.ystRCL07ocUeJUmIPJX2Xb2jp418TYiXMMT5uv-rFZE",
            Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoend3YW9pdmNmYXhuem9ieWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDQ1NTksImV4cCI6MjA2OTU4MDU1OX0.ystRCL07ocUeJUmIPJX2Xb2jp418TYiXMMT5uv-rFZE",
          },
          body: JSON.stringify({ test: true }),
        }
      )

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new Error(errText || `Edge Function error: ${res.status}`)
      }

      const json = await res.json() as { parsed: any[]; inserted: number }

      let newApps = 0
      for (const p of json.parsed || []) {
        newApps += 1
        window.dispatchEvent(
          new CustomEvent('new-application', {
            detail: {
              parsed: p,
              receivedAt: new Date().toISOString(),
            },
          })
        )
      }

      if (newApps > 0) {
        showSuccess(`${newApps} new application${newApps > 1 ? 's' : ''} received`)
      } else {
        showSuccess('Email sync completed')
      }
    } catch (error) {
      console.error('Email sync failed:', error)
      showError('Failed to sync emails')
      throw error
    }
  }

  startAutoSync(intervalMinutes: number = 15) {
    this.syncEmails()
    this.syncInterval = setInterval(() => {
      this.syncEmails()
    }, intervalMinutes * 60 * 1000)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

export const emailSyncService = new EmailSyncService()