# GoKapital CRM Deployment Guide

This document outlines environment configuration, Supabase Edge Functions deployment, CognitoForms webhook setup, and testing.

## 1) Environment Variables

Set these in two places:

- Frontend (.env or hosting provider environment):
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
  - VITE_DEFAULT_PAGE_SIZE
  - VITE_GOKAPITAL_PRIMARY_COLOR

- Supabase -> Edge Functions -> Manage Secrets:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - COGNITO_API_KEY
  - COGNITO_ORG_ID
  - COGNITO_FORM_IDS
  - COGNITO_WEBHOOK_SECRET
  - LOG_LEVEL (optional)

## 2) Database Migration

Run the SQL in `supabase/migrations/20251127_crm_schema.sql` via Supabase SQL editor.

Verify:
- deals table columns exist (cognito_* fields, user_id, created_at)
- Indexes created (created_at, status, loan_type, loan_amount_sought, user_id, source)
- RLS enabled and policy allows reading own records

## 3) Edge Functions

Functions:
- `cognito-sync`: manual sync (GET) and webhook ingestion (POST)
- `create-test-account`: creates a demo user and seeds 50 deals

Ensure secrets are set, then deploy both functions from Supabase Dashboard (or CLI if preferred).

## 4) CognitoForms Webhook

- Webhook URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/cognito-sync`
- Method: POST
- Format: JSON
- Include a shared secret (e.g., as a query or custom header) that matches `COGNITO_WEBHOOK_SECRET`.

## 5) Frontend

- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` match the project.
- Build and deploy the app to your hosting platform.
- Login:
  - Use Google or “Use Test Account” to quickly create and sign in to a demo user.

## 6) Testing Checklist

- Create Test Account:
  - Click “Use Test Account” on login page
  - Confirm 50 seeded deals appear on dashboard
- Manual Sync:
  - Trigger sync in settings or via dashboard action
  - Confirm new Cognito entries appear; duplicates are skipped
- Webhook:
  - Submit entry in CognitoForms
  - Confirm deal created within seconds
- RLS:
  - Non-owner users cannot read other users’ deals

## 7) Troubleshooting

- Missing env vars:
  - Edge functions will respond with `Missing ... env vars` errors
- Duplicates:
  - Unique index on (cognito_form_id, cognito_entry_id) enforces deduplication
- Authentication:
  - If Google sign-in fails, ensure provider is enabled and accounts table policies permit insert/update