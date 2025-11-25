import { ParsedEmail } from "@/types/email";

export function parseCognitoFormsEmail(emailBody: string, subject: string): ParsedEmail {
  // Extract loan type from subject
  const loanTypeMatch = subject.match(/(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i)
  const loan_type = loanTypeMatch ? loanTypeMatch[1] : 'Unknown'

  // Parse form fields from email body
  const fields: Record<string, string> = {}
  
  // Split by common delimiters and extract key-value pairs
  const lines = emailBody.split(/\n|\r\n/)
  
  lines.forEach(line => {
    // Match patterns like "Field Name: Value" or "Field Name – Value"
    const match = line.match(/^([^:–]+)[:–]\s*(.+)$/)
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_')
      const value = match[2].trim()
      fields[key] = value
    }
  })

  // Normalize amount
  const amountStr = fields.loan_amount_sought || fields.amount || fields['loan_amount'] || '0'
  const loan_amount_sought = parseFloat(amountStr.replace(/[$,\s]/g, '')) || 0

  // Normalize date
  const dateStr = fields.date_submitted || fields.submitted_date || new Date().toISOString()
  const date_submitted = new Date(dateStr).toISOString().split('T')[0]

  return {
    date_submitted,
    loan_type,
    legal_company_name: fields.legal_company_name || fields.company_name || 'N/A',
    client_name: fields.client_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim() || 'Unknown',
    client_email: fields.client_email || fields.email,
    client_phone: fields.client_phone || fields.phone,
    loan_amount_sought,
    city: fields.city,
    state: fields.state,
    zip: fields.zip,
    purpose: fields.purpose || fields.loan_purpose,
    employment_type: fields.employment_type,
    employer_name: fields.employer_name,
    job_title: fields.job_title,
    salary: fields.salary ? parseFloat(fields.salary.replace(/[$,\s]/g, '')) : undefined,
    referral: fields.referral || fields.referral_name
  }
}

export function isCognitoFormsEmail(from: string, subject: string): boolean {
  const isFromCognito = from.includes('cognitoforms.com') || from.includes('notifications@cognitoforms.com')
  const hasLoanType = /(Personal Loan|Business Loan|Equipment Leasing|Hard Money|Commercial Real Estate)/i.test(subject)
  const hasApplication = /application/i.test(subject)
  
  return isFromCognito && hasLoanType && hasApplication
}