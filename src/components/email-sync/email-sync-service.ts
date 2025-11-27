import { showSuccess, showError } from '@/utils/toast'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/error-log'

type IncomingEmail = {
  from: string
  subject: string
  body: string
}

// Mock implementation for now
export class EmailSyncService {
  private syncInterval: NodeJS.Timeout | null = null
  private config: { test: boolean; query?: string; maxResults?: number; startDate?: string; endDate?: string } = (() => {
    try {
      const raw = localStorage.getItem('email_sync_config')
      return raw ? JSON.parse(raw) : { test: false }
    } catch {
      return { test: false }
    }
  })()

  setConfig(next: Partial<{ test: boolean; query?: string; maxResults?: number; startDate?: string; endDate?: string }>) {
    this.config = { ...this.config, ...next }
    localStorage.setItem('email_sync_config', JSON.stringify(this.config))
  }

  getConfig() {
    return this.config
  }

  async syncEmails() {
    try {
      const body: Record<string, any> = {
        test: !!this.config.test,
      }
      if (this.config.query) body.q = this.config.query
      if (this.config.maxResults) body.maxResults = this.config.maxResults
      if (this.config.startDate) body.startDate = this.config.startDate
      if (this.config.endDate) body.endDate = this.config.endDate

      // Get the current user's access token for Authorization
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (sessionError || !accessToken) {
        logError({
          source: 'client',
          code: 'no_session',
          message: 'No authenticated session found for Gmail sync',
          details: { sessionError }
        })
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase.functions.invoke('sync-gmail', {
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (error) {
        logError({
          source: 'edge_function',
          code: 'invoke_error',
          message: error.message || 'Edge Function invocation failed',
          details: { body, error }
        })
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
    } catch (error: any) {
      console.error('Email sync failed:', error)
      logError({
        source: 'client',
        code: 'sync_failed',
        message: error?.message || 'Failed to sync emails',
        details: { stack: error?.stack }
      })
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