import { showSuccess, showError } from '@/utils/toast'
import { parseCognitoFormsEmail, isCognitoFormsEmail } from '@/lib/email-parser'

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
      // Simulate fetching emails from deals@gokapital.com
      const inbox: IncomingEmail[] = [
        {
          from: 'notifications@cognitoforms.com',
          subject: 'Personal Loan Application - John Doe',
          body: `Legal Company Name: Doe Enterprises LLC
Client Name: John Doe
Email: john.doe@email.com
Phone: (555) 123-4567
Loan Amount Sought: $50,000
City: Miami
State: FL
Zip: 33101
Purpose: Business expansion
Employment Type: Self-employed
Employer Name: Doe Enterprises LLC
Job Title: Owner
Salary: $120,000
Referral: Google Search
Date Submitted: 2024-01-15`,
        },
      ]

      let newApps = 0

      for (const email of inbox) {
        if (isCognitoFormsEmail(email.from, email.subject)) {
          const parsed = parseCognitoFormsEmail(email.body, email.subject)
          newApps += 1
          // Notify the app with a DOM event; UI can show a popup toast
          window.dispatchEvent(
            new CustomEvent('new-application', {
              detail: {
                parsed,
                receivedAt: new Date().toISOString(),
              },
            })
          )
        }
      }

      if (newApps > 0) {
        showSuccess(`${newApps} new application${newApps > 1 ? 's' : ''} received`)
      } else {
        showSuccess('Email sync completed')
      }
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