import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Deal, Note, Email, DealFilters } from '@/types/database'
import { supabase } from '@/lib/supabase'

export function useDeals(filters?: DealFilters) {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters: filters || {} },
      })
      if (error) {
        throw new Error(error.message || 'Failed to load deals')
      }
      const result = data as { deals: Deal[] }
      return result.deals || []
    }
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async (): Promise<Deal | null> => {
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters: {} },
      })
      if (error) throw new Error(error.message || 'Failed to load deal')
      const result = data as { deals: Deal[] }
      const deals = result.deals || []
      return deals.find(d => d.id === id) || null
    }
  })
}

export function useDealNotes(dealId: string) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async (): Promise<Note[]> => []
  })
}

export function useDealEmails(dealId: string) {
  return useQuery({
    queryKey: ['deal-emails', dealId],
    queryFn: async (): Promise<Email[]> => []
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      // Optionally, update via edge function; for now, return merged
      return { id, ...updates } as Deal
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
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