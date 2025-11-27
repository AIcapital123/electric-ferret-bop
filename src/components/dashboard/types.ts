export type Deal = {
  id: string;
  legal_company_name: string;
  client_name?: string | null;
  loan_amount_sought: number;
  loan_amount?: number | null;
  revenue_annual?: number | null;
  loan_type?: string | null;
  client_email: string | null;
  client_phone: string | null;
  status: string;
  created_at: string;
  raw_email?: string | null;
  source?: string | null;
  cognito_entry_id?: string | null;
  cognito_form_id?: string | null;
  cognito_entry_number?: number | null;
  gmail_message_id?: string | null;
};