import { supabase } from '@/lib/supabase'
import type { DealFilters } from '@/types/database'

export type DealsResult = {
  deals: Array<{
    id: string
    date_submitted: string
    loan_type: string
    legal_company_name: string
    client_name: string
    loan_amount_sought: number
    status: string
    source: string
    created_at: string
  }>
  total: number
  page: number
  pageSize: number
}

export async function fetchDeals(filters: DealFilters = {}, page = 1, pageSize = Number(import.meta.env.VITE_DEFAULT_PAGE_SIZE) || 25, retries = 1): Promise<DealsResult> {
  const body = { filters, page, pageSize }
  try {
    const { data, error } = await supabase.functions.invoke('list-deals', { body })
    if (error) throw new Error(error.message || 'Failed to load deals')
    return data as DealsResult
  } catch (e) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 400))
      return fetchDeals(filters, page, pageSize, retries - 1)
    }
    throw e
  }
}