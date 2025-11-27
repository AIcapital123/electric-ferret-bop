export interface Deal {
  id: string
  created_at: string
  updated_at: string
  loan_type: string
  legal_company_name: string
  client_name: string
  email?: string
  phone?: string
  loan_amount: number
  city?: string
  state?: string
  zip?: string
  use_of_funds?: string
  employment_type?: string
  employer_name?: string
  job_title?: string
  revenue_annual?: number
  referral?: string
  source: string
  status: string
  ai_summary?: string
  next_best_action?: string
  cognito_entry_id?: string
  gmail_message_id?: string
  notes_internal?: string
  assigned_to?: string
}

export interface Note {
  id: string
  deal_id: string
  author: string
  body: string
  created_at: string
}

export interface Email {
  id: string
  deal_id: string
  message_id: string
  subject: string
  from_address: string
  to_addresses: string
  sent_at: string
  raw_body: string
}

export interface DealFilters {
  dateRange?: { start: string; end: string }
  loanType?: string
  minAmount?: number
  maxAmount?: number
  status?: string
  search?: string
}

export interface ParsedEmail {
  date_submitted: string
  loan_type: string
  legal_company_name: string
  client_name: string
  client_email?: string
  client_phone?: string
  loan_amount_sought: number
  city?: string
  state?: string
  zip?: string
  purpose?: string
  employment_type?: string
  employer_name?: string
  job_title?: string
  salary?: number
  referral?: string
}