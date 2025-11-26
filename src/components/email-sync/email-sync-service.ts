import { showSuccess, showError } from '@/utils/toast'
import { supabase, SUPABASE_ANON_KEY } from '@/lib/supabase'

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
      const { data, error } = await supabase.functions.invoke('https://ehzwwaoivcfaxnzobyat.supabase.co/functions/v1/gmail-sync', {
        body: {},
        headers: {
          // Function checks for presence of Authorization; using anon key here to satisfy it.
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })

      if (error) {
        throw new Error(error.message || 'Edge Function error')
      }

      const json = data as { parsed: any[]; inserted: number }

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