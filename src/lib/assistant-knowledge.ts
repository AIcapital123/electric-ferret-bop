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
      ? 'Para sincronizar CognitoForms, haz clic en “Sync CognitoForms” en el encabezado, inicia sesión y elige el rango de fechas; respetamos los límites de tasa y los formularios permitidos.'
      : 'To sync CognitoForms, click “Sync CognitoForms” in the header, ensure you are signed in, choose the date range; we respect rate limits and only include allowed forms.'
  }

  if (q.includes('status') || q.includes('estados')) {
    return lang === 'es'
      ? 'Estados canónicos: new, in_review, missing_docs, submitted, approved, funded, declined.'
      : 'Canonical statuses: new, in_review, missing_docs, submitted, approved, funded, declined.'
  }

  // DB-aware queries (read-only)
  if (q.includes('how many deals') || q.includes('¿cuántos tratos') || q.includes('cuantos deals')) {
    const { count } = await supabase.from('deals').select('*', { count: 'exact', head: true })
    return lang === 'es' ? `Tienes ${count ?? 0} tratos.` : `You have ${count ?? 0} deals.`
  }

  if (q.includes('funded this month') || q.includes('financiados este mes')) {
    const start = new Date(); start.setDate(1)
    const end = new Date(start); end.setMonth(end.getMonth() + 1)
    const { count } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'funded')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
    return lang === 'es' ? `Financiados este mes: ${count ?? 0}.` : `Funded this month: ${count ?? 0}.`
  }

  if (q.includes('counts by status') || q.includes('conteos por estado')) {
    const statuses = ['new','in_review','missing_docs','submitted','approved','funded','declined']
    const results: string[] = []
    for (const s of statuses) {
      const { count } = await supabase.from('deals').select('*', { count: 'exact', head: true }).eq('status', s)
      results.push(`${s}: ${count ?? 0}`)
    }
    return lang === 'es' ? `Conteos: ${results.join(', ')}.` : `Counts: ${results.join(', ')}.`
  }

  if (q.includes('pipeline') && q.includes('total')) {
    const { data, error } = await supabase.from('deals').select('loan_amount,status').neq('status','declined')
    if (error) throw error
    const total = (data || []).reduce((sum, d: any) => sum + Number(d.loan_amount || 0), 0)
    return lang === 'es' ? `Total del pipeline: $${Math.round(total).toLocaleString()}.` : `Total pipeline amount: $${Math.round(total).toLocaleString()}.`
  }

  // Default fallback
  return lang === 'es'
    ? 'Puedo ayudarte con sincronización, filtros, estados y consultas de solo lectura. Prueba con “Muestra mis totales del pipeline”.'
    : 'I can help with syncing, filters, statuses, and read-only queries. Try “Show my pipeline totals.”'
}