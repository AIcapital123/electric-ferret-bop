export type EnhancedParsed = {
  legal_company_name: string | null
  client_name: string | null
  client_email: string | null
  client_phone: string | null
  loan_amount_sought: number
  loan_type: string
  status: string
  source: string
}

type RawEntry = Record<string, any>

const FIELD_ALIASES = {
  company: [
    'BusinessName','CompanyName','LegalBusinessName','Company','Business','OrganizationName','EntityName','Name','ClientName','BusinessLegalName','DBAName','TradeName','CorporateName','LLCName','PartnershipName'
  ],
  email: ['Email','EmailAddress','ContactEmail','BusinessEmail','PrimaryEmail','OwnerEmail','ApplicantEmail','MainEmail','WorkEmail'],
  phone: ['Phone','PhoneNumber','ContactPhone','BusinessPhone','PrimaryPhone','Mobile','CellPhone','Telephone','WorkPhone','OfficePhone','MainPhone'],
  loanAmount: ['LoanAmount','FundingAmount','AmountRequested','RequestedAmount','AmountNeeded','LoanRequest','CapitalNeeded','FinancingAmount','Amount','FundingNeeded','LoanSize','CreditAmount','AdvanceAmount'],
  firstName: ['FirstName','First','FName','OwnerFirstName','ApplicantFirstName','ContactFirstName','PrimaryFirstName'],
  lastName: ['LastName','Last','LName','OwnerLastName','ApplicantLastName','ContactLastName','PrimaryLastName','Surname'],
  purpose: ['Purpose','LoanPurpose','FundingPurpose'],
  businessType: ['BusinessType','EntityType','BusinessStructure','LegalStructure','CompanyType','OrganizationType'],
  industry: ['Industry','BusinessIndustry','Sector','BusinessSector','IndustryType','BusinessCategory','NAICS','SIC'],
}

function getFirst(entry: RawEntry, keys: string[]): any {
  for (const k of keys) {
    const v =
      entry?.Fields?.[k] ??
      entry?.Data?.[k] ??
      entry?.FormData?.[k] ??
      entry?.[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return v
  }
  return null
}

function parseCurrency(val: any): number {
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const numStr = val.replace(/[^0-9.]/g, '')
    const parsed = parseFloat(numStr)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

function cleanCompanyName(name: string | null): string | null {
  if (!name) return null
  return name.replace(/^[:\-\s]+/, '').replace(/[:\-\s]+$/, '').replace(/\s+/g, ' ').trim()
}

function cleanEmail(email: string | null): string | null {
  if (!email) return null
  const match = email.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? match[1] : email
}

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null
  return phone.replace(/[^\d\-\(\)\s\+\.]/g, '').trim()
}

function determineLoanType(entry: RawEntry, purpose: string | null): string {
  const text = [purpose, entry?.FormName, entry?.FormTitle].filter(Boolean).join(' ').toLowerCase()
  const map: Record<string, string[]> = {
    'Equipment Financing': ['equipment','machinery','vehicle','truck','construction'],
    'Working Capital': ['working capital','inventory','payroll','operating'],
    'Real Estate': ['real estate','property','building','commercial property'],
    'SBA Loan': ['sba','small business administration'],
    'Merchant Cash Advance': ['mca','merchant','cash advance','daily sales'],
    'Line of Credit': ['line of credit','loc','revolving credit'],
    'Business Loan': ['business loan','term loan','general business'],
  }
  for (const [lt, kws] of Object.entries(map)) {
    if (kws.some(k => text.includes(k))) return lt
  }
  // Amount heuristic
  const amt = parseCurrency(getFirst(entry, FIELD_ALIASES.loanAmount))
  if (amt > 500000) return 'Real Estate'
  if (amt < 100000) return 'Working Capital'
  return 'Business Loan'
}

export function parseCognitoSubmissionEnhanced(entry: RawEntry): EnhancedParsed {
  const company = cleanCompanyName(getFirst(entry, FIELD_ALIASES.company))
  const email = cleanEmail(getFirst(entry, FIELD_ALIASES.email))
  const phone = cleanPhone(getFirst(entry, FIELD_ALIASES.phone))
  const first = getFirst(entry, FIELD_ALIASES.firstName)
  const last = getFirst(entry, FIELD_ALIASES.lastName)
  const client = (first && last) ? `${String(first).trim()} ${String(last).trim()}` :
                 (first ? String(first).trim() : null)

  const purpose = getFirst(entry, FIELD_ALIASES.purpose)
  const loanAmount = parseCurrency(getFirst(entry, FIELD_ALIASES.loanAmount))
  const loanType = determineLoanType(entry, purpose)
  const status = 'New'

  return {
    legal_company_name: company,
    client_name: client,
    client_email: email,
    client_phone: phone,
    loan_amount_sought: loanAmount,
    loan_type: loanType,
    status,
    source: 'CognitoForms',
  }
}