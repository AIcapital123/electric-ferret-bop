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

      logError({
        source: 'client',
        code: 'gmail_sync_start',
        message: 'Starting legacy Gmail sync',
        details: { body }
      })

      // Try to get the current user's access token for Authorization.
      // If not available (no auth in app), proceed without Authorization header.
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (sessionError || !accessToken) {
        console.warn('No authenticated session found; invoking sync-gmail without Authorization header.')
      }

      const invokeOptions: any = { body }
      if (accessToken) {
        invokeOptions.headers = { Authorization: `Bearer ${accessToken}` }
      }

      const { data, error } = await supabase.functions.invoke('sync-gmail', invokeOptions)

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

      logError({
        source: 'client',
        code: 'gmail_sync_success',
        message: 'Legacy Gmail sync completed',
        details: { parsed_count: (json.parsed || []).length, inserted: json.inserted }
      })

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