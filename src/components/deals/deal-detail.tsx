import { useParams } from 'react-router-dom'
import { useDeal, useDealNotes, useDealEmails, useUpdateDeal, useAddNote } from '@/hooks/use-deals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'
import { Mail, Phone, MapPin, DollarSign, User, Building, FileText, MessageSquare, CalendarIcon } from 'lucide-react'
import { useLanguage } from '@/components/language/language-provider'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'

export function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: deal, isLoading: dealLoading } = useDeal(id!)
  const { data: notes } = useDealNotes(id!)
  const { data: emails } = useDealEmails(id!)
  const { mutate: updateDeal } = useUpdateDeal()
  const { mutate: addNote } = useAddNote()
  const { t } = useLanguage()
  
  const [noteText, setNoteText] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  if (dealLoading) {
    return <div className="container mx-auto p-6">{t('loading_deal_details')}</div>
  }

  if (!deal) {
    return <div className="container mx-auto p-6">{t('deal_not_found')}</div>
  }

  const handleStatusChange = (newStatus: string) => {
    updateDeal(
      { id: deal.id, updates: { status: newStatus as any } },
      {
        onSuccess: () => toast.success('Status updated successfully'),
        onError: () => toast.error('Failed to update status')
      }
    )
  }

  const handleAddNote = () => {
    if (!noteText.trim()) return
    
    setIsAddingNote(true)
    addNote(
      { dealId: deal.id, author: 'Current User', body: noteText },
      {
        onSuccess: () => {
          setNoteText('')
          toast.success('Note added successfully')
        },
        onError: () => toast.error('Failed to add note'),
        onSettled: () => setIsAddingNote(false)
      }
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      new: 'default' as const,
      in_progress: 'secondary' as const,
      funded: 'outline' as const,
      lost: 'destructive' as const
    }
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">{t('nav_dashboard')}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/deals">{t('nav_deals')}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{deal.client_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{deal.client_name}</h1>
          <p className="text-muted-foreground">{deal.legal_company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deal.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t('status')} - NEW</SelectItem>
              <SelectItem value="in_progress">{t('status')} - IN PROGRESS</SelectItem>
              <SelectItem value="funded">{t('status')} - FUNDED</SelectItem>
              <SelectItem value="lost">{t('status')} - LOST</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('loan_type')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deal.loan_type}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('loan_amount')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${deal.loan_amount_sought.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('date_submitted')}</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(deal.date_submitted), 'MMM dd, yyyy')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('status')}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusBadge(deal.status)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('contact_information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.client_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${deal.client_email}`} className="text-blue-600 hover:underline">
                  {deal.client_email}
                </a>
              </div>
            )}
            {deal.client_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${deal.client_phone}`} className="text-blue-600 hover:underline">
                  {deal.client_phone}
                </a>
              </div>
            )}
            {(deal.city || deal.state) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[deal.city, deal.state].filter(Boolean).join(', ')}
                  {deal.zip && ` ${deal.zip}`}
                </span>
              </div>
            )}
            {deal.purpose && (
              <div>
                <span className="font-medium">{t('loan_purpose')}: </span>
                <span>{deal.purpose}</span>
              </div>
            )}
            {deal.referral && (
              <div>
                <span className="font-medium">{t('referral')}: </span>
                <span>{deal.referral}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {t('employment_information')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.employment_type && (
              <div>
                <span className="font-medium">{t('employment_type')}: </span>
                <span>{deal.employment_type}</span>
              </div>
            )}
            {deal.employer_name && (
              <div>
                <span className="font-medium">{t('employer')}: </span>
                <span>{deal.employer_name}</span>
              </div>
            )}
            {deal.job_title && (
              <div>
                <span className="font-medium">{t('job_title')}: </span>
                <span>{deal.job_title}</span>
              </div>
            )}
            {deal.salary && (
              <div>
                <span className="font-medium">{t('annual_salary')}: </span>
                <span>${deal.salary.toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      {(deal.ai_summary || deal.next_best_action) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('ai_insights')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.ai_summary && (
              <div>
                <h4 className="font-medium mb-2">{t('summary')}</h4>
                <p className="text-sm text-muted-foreground">{deal.ai_summary}</p>
              </div>
            )}
            {deal.next_best_action && (
              <div>
                <h4 className="font-medium mb-2">{t('next_best_action')}</h4>
                <p className="text-sm text-muted-foreground">{deal.next_best_action}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('notes')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={`${t('add_note')}...`}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
            />
            <Button onClick={handleAddNote} disabled={isAddingNote || !noteText.trim()}>
              {isAddingNote ? t('adding') : t('add_note')}
            </Button>
          </div>
          
          {notes && notes.length > 0 && (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="border-l-2 border-muted pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">{note.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Emails */}
      {emails && emails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('original_emails')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {emails.map((email) => (
              <div key={email.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{email.subject}</h4>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(email.sent_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {email.raw_body}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}