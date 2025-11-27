import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/components/language/language-provider'

export default function HelpPage() {
  const { lang } = useLanguage()
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{lang === 'es' ? 'Ayuda del CRM GoKapital' : 'GoKapital CRM Help'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <section>
            <h3 className="font-semibold">{lang === 'es' ? 'Sincronización de CognitoForms' : 'CognitoForms Sync'}</h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'es'
                ? 'Usa el botón "Sync CognitoForms" en el encabezado. El sistema respeta límites de tasa y filtra formularios permitidos.'
                : 'Use the "Sync CognitoForms" button in the header. The system respects rate limits and filters allowed forms.'}
            </p>
          </section>

          <section>
            <h3 className="font-semibold">{lang === 'es' ? 'Estados' : 'Statuses'}</h3>
            <p className="text-sm text-muted-foreground">
              new, in_review, missing_docs, submitted, approved, funded, declined.
            </p>
          </section>

          <section>
            <h3 className="font-semibold">{lang === 'es' ? 'Búsqueda y Paginación' : 'Search & Pagination'}</h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'es'
                ? 'La búsqueda es parcial y no sensible a mayúsculas. La paginación es del lado del servidor.'
                : 'Search is partial and case-insensitive. Pagination is server-side.'}
            </p>
          </section>

          <section>
            <h3 className="font-semibold">{lang === 'es' ? 'Cuentas de Prueba' : 'Test Accounts'}</h3>
            <p className="text-sm text-muted-foreground">
              {lang === 'es'
                ? 'Crea un usuario temporal con 50 tratos de demostración desde la página de inicio de sesión.'
                : 'Create a temporary user with 50 demo deals from the login page.'}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}