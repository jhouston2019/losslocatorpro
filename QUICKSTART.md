# Loss Locator Pro - Quick Start Guide

Get up and running in 15 minutes.

## 🚀 5-Minute Supabase Setup

### 1. Create Project (2 min)
1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Click "New Project"
3. Name: `loss-locator-pro`
4. Set database password (save it!)
5. Choose region → Create

### 2. Run Database Setup (2 min)
1. Open SQL Editor in Supabase
2. Copy/paste contents of `supabase/schema.sql`
3. Click "Run"
4. Copy/paste contents of `supabase/seed.sql`
5. Click "Run"

### 3. Create Your User (1 min)
1. Go to Authentication → Users
2. Click "Invite User"
3. Enter your email
4. Check email → Complete signup
5. In SQL Editor, run:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@company.com';
```

### 4. Get API Keys (30 sec)
1. Go to Settings → API
2. Copy **Project URL**
3. Copy **anon public** key

---

## 💻 5-Minute Local Setup

### 1. Install Dependencies (2 min)
```bash
npm install
```

### 2. Configure Environment (1 min)
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start Development Server (30 sec)
```bash
npm run dev
```

### 4. Test It (1 min)
1. Visit http://localhost:3000
2. Login with your Supabase email/password
3. You should see the dashboard with data!

---

## 🌐 5-Minute Netlify Deployment

### 1. Connect Repository (1 min)
1. Go to [netlify.com](https://netlify.com) → Login
2. "Add new site" → "Import existing project"
3. Connect to GitHub/GitLab
4. Select `losslocatorpro` repo

### 2. Configure Build (1 min)
- Build command: `npm run build`
- Publish directory: `.next`
- Click "Deploy"

### 3. Set Environment Variables (2 min)
1. Go to Site settings → Environment variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
3. Trigger redeploy

### 4. Test Production (1 min)
1. Visit your Netlify URL
2. Login
3. Verify everything works!

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Can login with Supabase credentials
- [ ] Dashboard shows 15 loss events
- [ ] Loss Feed displays and filters work
- [ ] Lead Routing shows 5 queue entries
- [ ] Can assign a lead (persists after refresh)
- [ ] Property page loads (try /property/10001)
- [ ] Map shows markers
- [ ] Admin settings load and save
- [ ] Sign out works

---

## 🆘 Quick Troubleshooting

### Can't Login
- Check Supabase URL and key in `.env.local`
- Verify user exists in Supabase Auth
- Check browser console for errors

### No Data Showing
- Verify seed.sql ran successfully
- Check Supabase Table Editor for data
- Check browser console for errors

### Build Fails
- Run `npm install` again
- Check Node.js version (need 18+)
- Verify environment variables are set

### Map Not Showing
- Check browser console for Leaflet errors
- Verify events have lat/lng coordinates
- Try refreshing the page

---

## 📚 Next Steps

Once everything works:

1. **Add More Users**
   - Invite via Supabase Auth
   - Set roles in SQL

2. **Customize Settings**
   - Go to Admin page
   - Set thresholds
   - Configure automation

3. **Add Real Data**
   - Insert actual loss events
   - Add real properties
   - Create routing entries

4. **Read Full Docs**
   - [README.md](./README.md) - Overview
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment
   - [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) - What was built

---

## 🎯 Common Tasks

### Add a New User
```sql
-- After they sign up via invitation:
UPDATE users SET role = 'ops' WHERE email = 'new-user@company.com';
```

### Add a Loss Event
```sql
INSERT INTO loss_events (event_type, severity, event_timestamp, zip, lat, lng, income_band, property_type, claim_probability, priority_score)
VALUES ('Hail', 85, NOW(), '75001', 32.7767, -96.7970, '80th percentile', 'Single Family', 0.85, 95);
```

### Check Database Size
```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
```

---

## 💡 Pro Tips

1. **Bookmark Your Supabase Dashboard** - You'll use it often
2. **Save Your Database Password** - You'll need it for backups
3. **Test Locally First** - Before deploying to production
4. **Monitor Supabase Usage** - Stay within free tier limits
5. **Keep Dependencies Updated** - Run `npm update` monthly

---

## 🎉 You're Done!

Your internal loss intelligence platform is ready to use.

**What you have:**
- ✅ Secure authentication
- ✅ Real-time data
- ✅ Persistent storage
- ✅ Professional UI
- ✅ Production-ready

**Time invested:** ~15 minutes  
**Value delivered:** Enterprise-grade internal tool  
**Cost:** $0/month (free tiers)

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting.

