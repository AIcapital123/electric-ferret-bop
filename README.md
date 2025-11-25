# GoKapital LiveDealUpdate CRM

A modern CRM system that automatically creates and updates deals from CognitoForms submissions arriving by email.

## Features

- **Automatic Email Processing**: Monitors deals@gokapital.com for CognitoForms submissions
- **AI-Powered Parsing**: Uses AI to extract deal information from emails
- **Smart Dashboard**: Filterable, sortable table view of all deals
- **Deal Management**: Detailed deal view with notes, status tracking, and AI insights
- **Real-time Sync**: Automatic email synchronization every 15 minutes

## Setup

### 1. Supabase Setup

1. Create a new Supabase project
2. Copy the SQL schema from `supabase/schema.sql` and run it in the SQL editor
3. Get your project URL and anon key from Settings > API

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

## Usage

1. **Dashboard**: View all deals in a table format with filtering and sorting
2. **Deal Details**: Click on any deal to view full details, add notes, and update status
3. **Email Sync**: The system automatically syncs emails every 15 minutes
4. **Manual Sync**: Use the "Sync Emails" button for immediate synchronization

## Email Processing

The system processes emails from `notifications@cognitoforms.com` containing loan application data. It extracts:

- Client information (name, email, phone)
- Loan details (type, amount, purpose)
- Employment information
- Contact details (address, city, state)

## AI Features

- **Email Parsing**: AI fallback for complex email formats
- **Deal Summaries**: Automatic generation of client summaries
- **Next Best Actions**: AI-suggested follow-up actions

## Database Schema

- **deals**: Main deal information
- **notes**: Internal notes and comments
- **emails**: Original email data for reference