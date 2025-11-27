# CognitoForms Webhook Setup

## 1) Webhook URL
https://ehzwwaoivcfaxnzobyat.supabase.co/functions/v1/cognito-sync

## 2) Configure in CognitoForms
- Open your CognitoForms form
- Go to Settings → Webhooks
- Click “Add Webhook”
- Paste the URL above
- Select “Entry Created”
- Set format to JSON
- Save

## 3) Test
- Submit a test entry
- Open the GoKapital CRM dashboard
- The new deal should appear automatically

## 4) Manual Sync
Use the “Sync CognitoForms” button in the dashboard to pull recent entries from all forms (last 30 days).