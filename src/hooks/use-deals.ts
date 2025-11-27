import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Deal, DealFilters, Note } from '@/types/database'
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
    },
    refetchOnWindowFocus: false,
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
    },
    refetchOnWindowFocus: false,
  })
}

export function useDealNotes(dealId: string) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async (): Promise<Note[]> => {
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