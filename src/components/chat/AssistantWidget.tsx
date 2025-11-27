import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/components/language/language-provider'
import { getAssistantResponse, presetPrompts } from '@/lib/assistant-knowledge'

type Message = { role: 'user' | 'assistant'; text: string }

export default function AssistantWidget() {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const title = lang === 'es' ? 'Asistente' : 'Assistant'

  useEffect(() => {
    const off = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', off)
    return () => window.removeEventListener('keydown', off)
  }, [])

  const handleAsk = async (question?: string) => {
    const q = (question ?? input).trim()
    if (!q) return
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', text: q }])

    try {
      const answer = await getAssistantResponse(q, lang, supabase)
      setMessages((m) => [...m, { role: 'assistant', text: answer }])
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: lang === 'es' ? 'Ocurrió un error.' : 'An error occurred.' }])
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  const quickPrompts = useMemo(() => presetPrompts(lang), [lang])

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open ? (
        <Button className="bg-[#1f3b77]" onClick={() => setOpen(true)}>
          {title}
        </Button>
      ) : (
        <Card className="w-[360px] shadow-lg">
          <CardContent className="p-3">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">{title}</div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>×</Button>
            </div>

            <div className="space-x-2 mb-3 flex flex-wrap">
              {quickPrompts.map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => handleAsk(p)}>{p}</Button>
              ))}
            </div>

            <div className="h-48 overflow-y-auto border rounded p-2 space-y-2 bg-muted/20">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  {lang === 'es' ? 'Haz una pregunta sobre el CRM o tu base de datos.' : 'Ask a question about the CRM or your database.'}
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`text-sm ${m.role === 'assistant' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    <span className="font-medium">{m.role === 'assistant' ? (lang === 'es' ? 'Asistente' : 'Assistant') : (lang === 'es' ? 'Tú' : 'You')}:</span> {m.text}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                placeholder={lang === 'es' ? 'Escribe tu pregunta...' : 'Type your question...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
              />
              <Button onClick={() => handleAsk()} disabled={loading}>
                {loading ? (lang === 'es' ? 'Cargando...' : 'Loading...') : (lang === 'es' ? 'Enviar' : 'Send')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}