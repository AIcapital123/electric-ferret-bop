import { ParsedEmail } from '@/types/email'

function normalizeCurrency(value?: string): number {
  if (!value) return 0
  const cleaned = value.replace(/[^\d.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function normalizeDate(value?: string): string {
  const nowIso = new Date().toISOString().split('T')[0]
  if (!value) return nowIso

  // Try direct Date parse
  const d1 = new Date(value)
  if (!isNaN(d1.getTime())) return d1.toISOString().split('T')[0]

  // Try MM/DD/YYYY
  const mdy = value.match(/^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*$/)
  if (mdy) {
    const mm = parseInt(mdy[1], 10) - 1
    const dd = parseInt(mdy[2], 10)
    const yyyy = parseInt(mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3], 10)
    const d = new Date(yyyy, mm, dd)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // Try "Jan 15, 2024" or "January 15, 2024"
  const monthNames = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ]
  const mon = monthNames.findIndex(m => value.toLowerCase().includes(m))
  if (mon >= 0) {
    const dayMatch = value.match(/(\d{1,2})(?:st|nd|rd|th)?/)
    const yearMatch = value.match(/(\d{4})/)
    const dd = dayMatch ? parseInt(dayMatch[1], 10) : 1
    const yyyy = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear()
    const d = new Date(yyyy, mon, dd)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  return nowIso
}

function getFirst(fields: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = fields[k]
    if (v) return v
  }
  return undefined
}

export function parseCognitoFormsEmail(emailBody: string, subject: string): ParsedEmail {
  const loanTypeMatch = subject.match(/(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i)
  const loan_type = loanTypeMatch ? loanTypeMatch[1] : 'Unknown'

  const fields: Record<string, string> = {}

  // Split lines, handle various delimiters: colon, en/em dash, " - "
  const lines = emailBody.split(/\r?\n/)
  for (const line of lines) {
    const m1 = line.match(/^([^:–—]+)\s*[:–—]\s*(.+)$/) // colon, en-dash, em-dash
    const m2 = line.match(/^([^-]+?)\s+-\s+(.+)$/)       // " - " delimiter
    const match = m1 || m2
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_')
      const value = match[2].trim()
      fields[key] = value
    }
  }

  // Alias sets (normalized keys)
  const legalCompanyKeys = ['legal_company_name','company_name','business_name','legal_business_name','company','business']
  const clientNameKeys = ['client_name','name','full_name','applicant_name','contact_name']
  const emailKeys = ['client_email','email','email_address']
  const phoneKeys = ['client_phone','phone','telephone','mobile','phone_number']
  const amountKeys = ['loan_amount_sought','loan_amount','amount_requested','requested_amount','total_loan_amount','loan_amount']
  const cityKeys = ['city','town']
  const stateKeys = ['state','province']
  const zipKeys = ['zip','postal_code','zip_code']
  const purposeKeys = ['purpose','loan_purpose','purpose_of_loan','use_of_funds']
  const employmentTypeKeys = ['employment_type','employment_status']
  const employerKeys = ['employer_name','employer','company','business']
  const jobTitleKeys = ['job_title','position','title']
  const salaryKeys = ['salary','income','annual_income','monthly_income']
  const referralKeys = ['referral','referral_name','source','how_did_you_hear_about_us']
  const dateKeys = ['date_submitted','submitted_date','submission_date','date']

  // Normalize amount and date
  const amountStr = getFirst(fields, amountKeys)
  const loan_amount_sought = normalizeCurrency(amountStr)

  const dateStr = getFirst(fields, dateKeys) || new Date().toISOString()
  const date_submitted = normalizeDate(dateStr)

  // Fallback client_name from subject if missing (e.g., "Application - John Doe")
  const subjectNameMatch = subject.match(/application\s*[-:]\s*(.+)$/i)
  const subjectName = subjectNameMatch ? subjectNameMatch[1].trim() : undefined

  return {
    date_submitted,
    loan_type,
    legal_company_name: getFirst(fields, legalCompanyKeys) || 'N/A',
    client_name: getFirst(fields, clientNameKeys) || subjectName || 'Unknown',
    client_email: getFirst(fields, emailKeys),
    client_phone: getFirst(fields, phoneKeys),
    loan_amount_sought,
    city: getFirst(fields, cityKeys),
    state: getFirst(fields, stateKeys),
    zip: getFirst(fields, zipKeys),
    purpose: getFirst(fields, purposeKeys),
    employment_type: getFirst(fields, employmentTypeKeys),
    employer_name: getFirst(fields, employerKeys),
    job_title: getFirst(fields, jobTitleKeys),
    salary: normalizeCurrency(getFirst(fields, salaryKeys)),
    referral: getFirst(fields, referralKeys),
  }
}

export function isCognitoFormsEmail(from: string, subject: string): boolean {
  const isFromCognito = from.includes('cognitoforms.com') || from.includes('notifications@cognitoforms.com')
  const hasLoanType = /(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i.test(subject)
  // Accept if from Cognito and subject contains a known loan type (no need for 'application')
  return isFromCognito && hasLoanType
}