import type { SupabaseClient } from '@supabase/supabase-js'

export function presetPrompts(lang: 'en' | 'es') {
  return [
    lang === 'es' ? '¿Cómo sincronizo CognitoForms?' : 'How do I sync CognitoForms?',
    lang === 'es' ? 'Explica los estados.' : 'Explain the statuses.',
    lang === 'es' ? 'Muestra mis totales del pipeline.' : 'Show my pipeline totals.',
  ]
}

export async function getAssistantResponse(question: string, lang: 'en' | 'es', supabase: SupabaseClient): Promise<string> {
  const q = question.toLowerCase()

  // Knowledge responses
  if (q.includes('sync') && q.includes('cognito')) {
    return lang === 'es'
      ? 'Para sincronizar CognitoForms, haz clic en "Sync CognitoForms" en el encabezado, inicia sesión y elige el rango de fechas; respetamos los límites de tasa y los formularios permitidos.'
      : 'To sync CognitoForms, click "Sync CognitoForms" in the header, ensure you are signed in, choose the date range; we respect rate limits and only include allowed forms.'
  }

  if (q.includes('status') || q.includes('estados')) {
    return lang === 'es'
      ? 'Estados canónicos: new, in_review, missing_docs, submitted, approved, funded, declined.'
      : 'Canonical statuses: new, in_review, missing_docs, submitted, approved, funded, declined.'
  }

  // Use edge function stats to avoid client RLS issues
  const fetchStats = async () => {
    const { data, error } = await supabase.functions.invoke('deal-stats', { method: 'POST' })
    if (error) throw new Error(error.message || 'Failed to load stats')
    return data as {
      success: boolean
      total: number
      fundedThisMonth: number
      countsByStatus: Record<string, number>
      totalPipelineSum: number
    }
  }

  if (q.includes('how many deals') || q.includes('¿cuántos tratos') || q.includes('cuantos deals')) {
    const stats = await fetchStats()
    return lang === 'es' ? `Tienes ${stats.total ?? 0} tratos.` : `You have ${stats.total ?? 0} deals.`
  }

  if (q.includes('funded this month') || q.includes('financiados este mes')) {
    const stats = await fetchStats()
    return lang === 'es' ? `Financiados este mes: ${stats.fundedThisMonth ?? 0}.` : `Funded this month: ${stats.fundedThisMonth ?? 0}.`
  }

  if (q.includes('counts by status') || q.includes('conteos por estado')) {
    const stats = await fetchStats()
    const statuses = ['new','in_review','missing_docs','submitted','approved','funded','declined']
    const list = statuses.map(s => `${s}: ${stats.countsByStatus[s] ?? 0}`).join(', ')
    return lang === 'es' ? `Conteos: ${list}.` : `Counts: ${list}.`
  }

  if (q.includes('pipeline') && q.includes('total')) {
    const stats = await fetchStats()
    const total = Math.round(stats.totalPipelineSum || 0).toLocaleString()
    return lang === 'es' ? `Total del pipeline: $${total}.` : `Total pipeline amount: $${total}.`
  }

  // Default fallback
  return lang === 'es'
    ? 'Puedo ayudarte con sincronización, filtros, estados y consultas de solo lectura. Prueba con "Muestra mis totales del pipeline".'
    : 'I can help with syncing, filters, statuses, and read-only queries. Try "Show my pipeline totals."'
}