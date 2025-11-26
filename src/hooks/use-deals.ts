import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Deal, DealFilters } from '@/types/database'
import { supabase } from '@/lib/supabase'

export function useDeals(filters: DealFilters = {}, page: number = 1) {
  return useQuery({
    queryKey: ['deals', filters, page],
    queryFn: async (): Promise<{ deals: Deal[]; total: number; page: number; pageSize: number }> => {
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters, page, pageSize: 25 },
      })
      if (error) {
        throw new Error(error.message || 'Failed to load deals')
      }
      const result = data as { deals: Deal[]; total: number; page: number; pageSize: number }
      return result
    }
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: async (): Promise<Deal | null> => {
      const { data, error } = await supabase.functions.invoke('list-deals', {
        body: { filters: {}, page: 1, pageSize: 100 }
      })
      if (error) throw new Error(error.message || 'Failed to load deal')
      const result = data as { deals: Deal[] }
      const deals = result.deals || []
      return deals.find((d) => d.id === id) || null
    }
  })
}

export function useDealNotes(dealId: string) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    // Return empty list for now to satisfy typings; can be wired later
    queryFn: async (): Promise<any[]> => []
  })
}

export function useDealEmails(dealId: string) {
  return useQuery({
    queryKey: ['deal-emails', dealId],
    // Return empty list for now to satisfy typings; can be wired later
    queryFn: async (): Promise<any[]> => []
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Deal> }) => {
      // Placeholder mutation; update via edge function later
      return { id, ...updates } as Deal
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
      return { id: crypto.randomUUID(), deal_id: dealId, author, body, created_at: new Date().toISOString() }
    },
    onSuccess: (_note, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', variables.dealId] })
    }
  })
}