import { Deal } from '@/types/database'

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)]
}

const LOAN_TYPES = [
  'Merchant Cash Advance',
  'Term Loan',
  'Line of Credit (LOC)',
  'Factoring',
  'Equipment Financing',
  'SBA 7(a)',
  'SBA 504',
  'Commercial Real Estate (CRE)',
  'Personal Loan',
  'Business Credit Card',
  'Other',
]

const STATUSES = ['new', 'in_review', 'missing_docs', 'submitted', 'approved', 'funded', 'declined']

const COMPANIES = [
  'Blue Peak Holdings LLC',
  'Nova Dynamics Inc',
  'Summit Logistics Corp',
  'Atlas Systems Ltd',
  'Vertex Partners LLC',
  'Quantum Solutions Inc',
  'Bright Industries Corp',
  'Apex Enterprises LLC',
  'Prime Group Ltd',
  'GoKapital Solutions LLC',
]

const PEOPLE_FIRST = ['Alex', 'Jordan', 'Taylor', 'Chris', 'Morgan', 'Sam', 'Jamie', 'Riley', 'Avery', 'Casey']
const PEOPLE_LAST = ['Smith', 'Johnson', 'Lee', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson']

function personName(): string {
  return `${pick(PEOPLE_FIRST)} ${pick(PEOPLE_LAST)}`
}

function companyName(): string {
  return pick(COMPANIES)
}

function id(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function isDemoMode(): boolean {
  try {
    return localStorage.getItem('demo_mode') === 'true'
  } catch {
    return false
  }
}

export function generateDemoDeals(count: number = 50): Deal[] {
  const deals: Deal[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const daysAgo = randInt(0, 180)
    const created = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const amount = randInt(15000, 500000)
    const lt = pick(LOAN_TYPES)
    const st = pick(STATUSES)
    const comp = companyName()
    const client = personName()
    const emailLocal = client.toLowerCase().replace(/\s+/g, '.')
    const deal: Deal = {
      id: id(),
      created_at: created.toISOString(),
      updated_at: created.toISOString(),
      loan_type: lt,
      legal_company_name: comp,
      client_name: client,
      email: `${emailLocal}@demo.example.com`,
      phone: `(${randInt(200, 999)}) ${randInt(100, 999)}-${randInt(1000, 9999)}`,
      loan_amount: amount,
      city: 'Miami',
      state: 'FL',
      zip: String(randInt(33000, 33999)),
      use_of_funds: 'Working Capital',
      employment_type: 'Full-time',
      employer_name: comp,
      job_title: 'Owner',
      revenue_annual: randInt(100000, 2000000),
      referral: 'Website',
      source: 'demo',
      status: st,
      ai_summary: undefined,
      next_best_action: undefined,
      cognito_entry_id: undefined,
      gmail_message_id: undefined,
      notes_internal: undefined,
      assigned_to: 'Demo Assistant',
    }
    deals.push(deal)
  }
  return deals
}

export function ensureDemoDeals(): Deal[] {
  try {
    const raw = localStorage.getItem('demo_deals')
    if (raw) {
      const parsed = JSON.parse(raw) as Deal[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore parse errors
  }
  const created = generateDemoDeals(50)
  try {
    localStorage.setItem('demo_deals', JSON.stringify(created))
  } catch {
    // ignore storage errors
  }
  return created
}

export function getDemoDeals(): Deal[] {
  try {
    const raw = localStorage.getItem('demo_deals')
    if (!raw) return []
    const parsed = JSON.parse(raw) as Deal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function setDemoDeals(next: Deal[]) {
  try {
    localStorage.setItem('demo_deals', JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function updateDemoDeal(id: string, updates: Partial<Deal>): Deal | null {
  const all = getDemoDeals()
  const idx = all.findIndex(d => d.id === id)
  if (idx === -1) return null
  const updated = { ...all[idx], ...updates, updated_at: new Date().toISOString() }
  all[idx] = updated
  setDemoDeals(all)
  return updated
}