# ⚡ CMS Compliance Bridge: Production Deployment Guide

Your autonomous revenue recovery engine is ready. Follow these steps to complete the production handover.

## 1. Supabase Setup (MANDATORY)
Run the following SQL in your Supabase SQL Editor to provision the required tables and columns:

```sql
-- Healthcare Denial Leads (Revenue Tracking)
CREATE TABLE IF NOT EXISTS healthcare_denial_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    username TEXT,
    title TEXT,
    url TEXT UNIQUE,
    pain_point TEXT,
    insurance_type TEXT,
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'New',
    estimated_value NUMERIC DEFAULT 0,
    due_at TIMESTAMPTZ,
    drafted_appeal TEXT,
    edited_appeal TEXT,
    clinical_synthesis TEXT,
    submission_status TEXT DEFAULT 'Pending',
    submitted_at TIMESTAMPTZ,
    submission_log TEXT,
    final_outcome TEXT DEFAULT 'Pending',
    settled_at TIMESTAMPTZ,
    recovered_amount NUMERIC DEFAULT 0,
    strategy TEXT,
    reason_code TEXT
);

-- Payer Directory (Self-Healing persisted fax numbers)
CREATE TABLE IF NOT EXISTS payer_directory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payer_name TEXT UNIQUE,
    verified_fax TEXT,
    last_verified_by TEXT
);

-- Payer Rules Engine (Programmable Defense)
CREATE TABLE IF NOT EXISTS payer_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payer_name TEXT,
    reason_code TEXT,
    strategy TEXT
);
```

## 2. Vercel Environment Variables
Add these keys in your Vercel Project Settings:

| Key | Value |
|---|---|
| `SUPABASE_URL` | Your Project URL |
| `SUPABASE_ANON_KEY` | Your Anon/Public Key |
| `PHAXIO_KEY` | Your Phaxio API Key |
| `PHAXIO_SECRET` | Your Phaxio API Secret |
| `CRON_SECRET` | Any random string (used for Vercel Cron auth) |
| `FHIR_BASE_URL` | Optional: Your Epic/Cerner Sandbox URL |

## 3. Local Heartbeat Monitor
Ensure your local `monitor-denials.js` is running via OpenClaw's heartbeat. It will automatically detect failed transmissions and trigger **Agentic Self-Healing** to find new fax numbers for you.

---
**Status:** All clinical and regulatory engines are synchronized. Deployment complete. ⚡
