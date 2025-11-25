import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Deal, Note, Email, DealFilters } from '@/types/database'

// Mock data for development
const mockDeals: Deal[] = [
  {
    id: '1',
    date_submitted: '2024-01-15',
    loan_type: 'Personal Loan',
    legal_company_name: 'Doe Enterprises LLC',
    client_name: 'John Doe',
    client_email: 'john.doe@email.com',
    client_phone: '(555) 123-4567',
    loan_amount_sought: 50000,
    city: 'Miami',
    state: 'FL',
    zip: '33101',
    purpose: 'Business expansion',
    employment_type: 'Self-employed',
    employer_name: 'Doe Enterprises LLC',
    job_title: 'Owner',
    salary: 120000,
    referral: 'Google Search',
    source: 'CognitoForms',
    status: 'new',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ai_summary: 'Client seeking $50K personal loan for business expansion',
    next_best_action: 'Contact client to verify income documentation'
  }
]

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async () => mockDeals
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async () => mockDeals[0]
  })
}

export function useDealNotes(dealId: string) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async () => []
  })
}

export function useDealEmails(dealId: string) {
  return useQuery({
    queryKey: ['deal-emails', dealId],
    queryFn: async () => []
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      return { ...mockDeals[0], ...updates }
    }
  })
}

export function useAddNote() {
  return useMutation({
    mutationFn: async ({ dealId, author, body }: { dealId: string; author: string; body: string }) => {
      return { id: '1', deal_id: dealId, author, body, created_at: new Date().toISOString() }
    }
  })
}

export function useCreateDeal() {
  return useMutation({
    mutationFn: async (deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>) => {
      return { ...deal, id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  })
}