import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Deal, DealFilters, Note } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { isDemoMode, getDemoDeals, ensureDemoDeals, updateDemoDeal } from '@/lib/demo-data'

export function useDeals(filters: DealFilters = {}, page: number = 1) {
  return useQuery({
    queryKey: ['deals', filters, page],
    queryFn: async (): Promise<{ deals: Deal[]; total: number; page: number; pageSize: number }> => {
      // DEMO MODE: locally generated data
      if (isDemoMode()) {
        const pageSize = 25
        ensureDemoDeals()
        let all = getDemoDeals()

        // Apply filters
        if (filters.loanType) {
          all = all.filter(d => d.loan_type === filters.loanType)
        }
        if (filters.status) {
          all = all.filter(d => d.status === filters.status)
        }
        if (filters.dateRange?.start) {
          const start = new Date(filters.dateRange.start)
          all = all.filter(d => new Date(d.created_at) >= start)
        }
        if (filters.dateRange?.end) {
          const end = new Date(filters.dateRange.end)
          all = all.filter(d => new Date(d.created_at) <= end)
        }
        if (filters.search && String(filters.search).trim() !== '') {
          const s = String(filters.search).trim().toLowerCase()
          all = all.filter(d => {
            const hay = [
              d.client_name ?? '',
              d.legal_company_name ?? '',
              d.loan_type ?? '',
              d.status ?? '',
              d.email ?? '',
              d.phone ?? ''
            ].join(' ').toLowerCase()
            return hay.includes(s)
          })
        }

        const total = all.length
        const startIdx = Math.max(0, (page - 1) * pageSize)
        const endIdx = Math.min(total, startIdx + pageSize)
        const deals = all.slice(startIdx, endIdx)

        return { deals, total, page, pageSize }
      }

      // Original backend behavior
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters, page, pageSize: 25 },
      })
      if (error) {
        throw new Error(error.message || 'Failed to load deals')
      }
      const result = data as { deals: Deal[]; total: number; page: number; pageSize: number }
      return result
    },
    refetchOnWindowFocus: false,
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async (): Promise<Deal | null> => {
      // DEMO MODE: find locally
      if (isDemoMode()) {
        ensureDemoDeals()
        const all = getDemoDeals()
        return all.find(d => d.id === id) ?? null
      }

      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters: {}, page: 1, pageSize: 100 }
      })
      if (error) throw new Error(error.message || 'Failed to load deal')
      const result = data as { deals: Deal[] }
      const deals = result.deals || []
      return deals.find((d) => d.id === id) || null
    },
    refetchOnWindowFocus: false,
  })
}

export function useDealNotes(dealId: string) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async (): Promise<Note[]> => {
      // DEMO MODE: no notes persisted
      if (isDemoMode()) return []
      const { data, error } = await supabase.functions.invoke('list-deal-notes', {
        body: { dealId },
      })
      if (error) {
        throw new Error(error.message || 'Failed to load notes')
      }
      const result = data as { notes: Note[] }
      return result.notes || []
    },
    refetchOnWindowFocus: false,
  })
}

export function useDealEmails(_dealId: string) {
  return useQuery({
    queryKey: ['deal-emails', _dealId],
    queryFn: async (): Promise<any[]> => [],
    refetchOnWindowFocus: false,
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      // DEMO MODE: apply local update
      if (isDemoMode()) {
        const updated = updateDemoDeal(id, updates)
        if (!updated) throw new Error('Deal not found')
        return updated
      }

      if (!updates.status) {
        return { id, ...updates } as Deal
      }
      const { data, error } = await supabase.functions.invoke('update-deal-status', {
        body: { id, status: updates.status },
      })
      if (error) throw new Error(error.message || 'Failed to update status')
      return (data as { deal: Deal }).deal
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['deal', variables.id] })
    }
  })
}

export function useAddNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, author, body }: { dealId: string; author: string; body: string }) => {
      // DEMO MODE: return a synthetic note without persistence
      if (isDemoMode()) {
        const now = new Date().toISOString()
        return { id: `demo-note-${now}`, deal_id: dealId, author, body, created_at: now } as Note
      }
      const { data, error } = await supabase.functions.invoke('add-deal-note', {
        body: { dealId, author, body },
      })
      if (error) throw new Error(error.message || 'Failed to add note')
      const result = data as { note: Note }
      return result.note
    },
    onSuccess: (_note, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', variables.dealId] })
    }
  })
}