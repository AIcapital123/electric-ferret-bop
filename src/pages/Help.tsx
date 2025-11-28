import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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

          <section className="pt-2">
            <h3 className="font-semibold mb-2">{lang === 'es' ? 'Preguntas Frecuentes (FAQ)' : 'Frequently Asked Questions (FAQ)'}</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo configuro la clave de API de CognitoForms?' : 'How do I set the CognitoForms API key?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'En Supabase → Edge Functions → cognito-sync → Manage Secrets, agrega COGNITO_API_KEY con tu clave de API de CognitoForms.'
                    : 'In Supabase → Edge Functions → cognito-sync → Manage Secrets, add COGNITO_API_KEY with your CognitoForms API key.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-2">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Qué pongo en COGNITO_ORG_ID?' : 'What should I put in COGNITO_ORG_ID?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Puedes usar el GUID de la organización o el nombre/slug (por ejemplo, "gokapitalinc"); el sistema lo resolverá automáticamente al GUID.'
                    : 'You can use either the organization GUID or the name/slug (e.g., "gokapitalinc"); the system will auto-resolve it to the GUID.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-3">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo despliego la función Edge "cognito-sync"?' : 'How do I deploy the "cognito-sync" Edge Function?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Usa el panel de Supabase. Ve a Edge Functions, selecciona "cognito-sync" y despliega. Asegúrate de que el estado sea ACTIVO.'
                    : 'Use the Supabase dashboard. Go to Edge Functions, select "cognito-sync", and deploy. Ensure its status is ACTIVE.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-4">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo veo los registros de la función si falla?' : 'How can I see function logs if it fails?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'En Supabase → Edge Functions → cognito-sync → Logs, revisa los errores más recientes y códigos de estado.'
                    : 'In Supabase → Edge Functions → cognito-sync → Logs, review the latest errors and status codes.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-5">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? 'Veo "Edge Function returned a non-2xx status code". ¿Qué hago?' : 'I see "Edge Function returned a non-2xx status code". What should I do?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-1">
                  <p>
                    {lang === 'es'
                      ? '1) Verifica que COGNITO_API_KEY/COGNITO_API_TOKEN y COGNITO_ORG_ID existan en Manage Secrets.'
                      : '1) Verify COGNITO_API_KEY/COGNITO_API_TOKEN and COGNITO_ORG_ID exist in Manage Secrets.'}
                  </p>
                  <p>
                    {lang === 'es'
                      ? '2) Asegura que la función "cognito-sync" esté ACTIVA.'
                      : '2) Ensure the "cognito-sync" function is ACTIVE.'}
                  </p>
                  <p>
                    {lang === 'es'
                      ? '3) Revisa los logs para ver el mensaje de error exacto.'
                      : '3) Check logs for the exact error message.'}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-6">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Por qué el selector de rango de fechas aparece vacío?' : 'Why does the date range selector appear blank?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'El rango por defecto es 1 mes. Si se veía vacío, ahora se corrige y mostrará "1 month ago" por defecto.'
                    : 'The default range is 1 month. If it appeared blank before, it\'s now fixed and will show "1 month ago" by default.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-7">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo sé si la sincronización funcionó?' : 'How do I know if the sync worked?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Verás una notificación con el conteo de "created/updated" y la tabla se actualizará.'
                    : 'You\'ll see a toast with "created/updated" counts and the table will refresh.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-8">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Qué formularios de Cognito se sincronizan?' : 'Which Cognito forms are synced?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Por defecto se consultan todos los formularios de la organización; puedes limitar por IDs si lo necesitas.'
                    : 'By default, all forms in the organization are queried; you can limit by form IDs if needed.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-9">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo limpio errores antiguos?' : 'How do I clear old errors?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Reintenta la acción tras corregir secretos o despliegues; los logs muestran nuevos eventos en la parte superior.'
                    : 'Retry the action after fixing secrets or deployments; logs show new events at the top.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-10">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Cómo exporto los resultados?' : 'How can I export the results?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Usa el botón "Export CSV" en el tablero de operaciones para descargar un archivo CSV.'
                    : 'Use the "Export CSV" button on the deals dashboard to download a CSV file.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-11">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Puedo crear datos de demostración rápidamente?' : 'Can I quickly create demo data?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'Sí, crea una cuenta de prueba desde la página de inicio de sesión y obtendrás 50 operaciones de ejemplo.'
                    : 'Yes, create a test account from the login page to get 50 sample deals.'}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="faq-12">
                <AccordionTrigger className="text-left">
                  {lang === 'es' ? '¿Qué significan los estados del trato?' : 'What do deal statuses mean?'}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {lang === 'es'
                    ? 'new: nuevo, in_review: en revisión, missing_docs: faltan documentos, submitted: enviado, approved: aprobado, funded: financiado, declined: rechazado.'
                    : 'new, in_review, missing_docs, submitted, approved, funded, declined.'}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}