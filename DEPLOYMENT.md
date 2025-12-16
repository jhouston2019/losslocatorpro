# Loss Locator Pro - Deployment Guide

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Node.js**: Version 18+ installed locally

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: `loss-locator-pro`
   - Database Password: (save this securely)
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migration
1. Go to SQL Editor in Supabase Dashboard
2. Open `supabase/schema.sql` from this repo
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run" to execute
6. Verify tables created in Table Editor

### 1.3 Seed Initial Data
1. In SQL Editor, open new query
2. Copy contents of `supabase/seed.sql`
3. Paste and run
4. Verify data in Table Editor:
   - `loss_events`: Should have 15 rows
   - `properties`: Should have 3 rows
   - `routing_queue`: Should have 5 rows

### 1.4 Create First User
1. Go to Authentication > Users
2. Click "Invite User"
3. Enter your email
4. Check email and complete signup
5. After signup, set role in SQL Editor:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-email@company.com';
```

### 1.5 Get API Keys
1. Go to Project Settings > API
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key

## Step 2: Local Development

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Configure Environment Variables
1. Copy `env.example` to `.env.local`:
```bash
cp env.example .env.local
```

2. Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.3 Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and login with your Supabase user credentials.

## Step 3: Netlify Deployment

### 3.1 Connect Repository
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect to your Git provider (GitHub, GitLab, etc.)
4. Select the `losslocatorpro` repository

### 3.2 Configure Build Settings
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Base directory**: (leave empty)

### 3.3 Set Environment Variables
In Netlify dashboard > Site settings > Environment variables, add:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
```

### 3.4 Deploy
1. Click "Deploy site"
2. Wait for build to complete (~2-3 minutes)
3. Visit your site URL (e.g., `https://your-site.netlify.app`)

## Step 4: Post-Deployment

### 4.1 Test Authentication
1. Visit your deployed site
2. Login with Supabase user credentials
3. Verify redirect to dashboard

### 4.2 Test Data Loading
1. Check Dashboard loads metrics
2. Check Loss Feed shows events
3. Check Lead Routing shows queue
4. Check Property pages load details

### 4.3 Test Persistence
1. Assign a lead in Lead Routing
2. Refresh page
3. Verify assignment persists

### 4.4 Configure Admin Settings
1. Go to Admin page
2. Set thresholds as needed
3. Save settings
4. Verify they persist

## Step 5: User Management

### Add New Users
1. In Supabase Dashboard > Authentication > Users
2. Click "Invite User"
3. Enter email
4. User receives invite email
5. After signup, set their role:
```sql
UPDATE users 
SET role = 'ops'  -- or 'admin' or 'viewer'
WHERE email = 'new-user@company.com';
```

### User Roles
- **admin**: Full access, can modify settings
- **ops**: Can view and update events/leads
- **viewer**: Read-only access

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify Node.js version is 18+
- Check build logs for specific errors

### Authentication Not Working
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify user exists in Supabase Auth

### Data Not Loading
- Check Supabase tables have data
- Verify RLS policies are enabled
- Check browser console for errors
- Verify user is authenticated

### Map Not Showing
- Ensure loss events have `lat` and `lng` values
- Check browser console for Leaflet errors
- Verify Leaflet CSS is loading

## Maintenance

### Backup Data
Supabase provides automatic backups. For manual backup:
1. Go to Database > Backups
2. Click "Create backup"

### Monitor Usage
1. Supabase Dashboard > Reports
2. Check database size, API requests
3. Monitor authentication activity

### Update Dependencies
```bash
npm update
npm audit fix
```

## Security Checklist

- [ ] Environment variables set in Netlify (not committed to repo)
- [ ] Supabase RLS policies enabled
- [ ] Only invited users can access
- [ ] Service role key (if used) is kept secret
- [ ] Regular backups configured
- [ ] HTTPS enabled (automatic with Netlify)

## Support

For issues:
1. Check Supabase logs
2. Check Netlify deploy logs
3. Check browser console
4. Review this deployment guide

## Cost Estimate

- **Supabase Free Tier**: 500MB database, 50,000 monthly active users
- **Netlify Free Tier**: 100GB bandwidth, 300 build minutes
- **Total**: $0/month for small internal teams

Upgrade as needed based on usage.

