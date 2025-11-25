import { showSuccess, showError } from '@/utils/toast'

// Mock implementation for now
export class EmailSyncService {
  private syncInterval: NodeJS.Timeout | null = null

  async syncEmails() {
    try {
      console.log('Syncing emails from deals@gokapital.com...')
      showSuccess('Email sync completed')
    } catch (error) {
      console.error('Email sync failed:', error)
      showError('Failed to sync emails')
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