# Loss Locator Pro - Setup Checklist

Use this checklist to ensure proper setup and deployment.

## ☑️ Pre-Deployment Checklist

### Supabase Setup
- [ ] Created Supabase project
- [ ] Ran `schema.sql` migration successfully
- [ ] Ran `seed.sql` to populate initial data
- [ ] Verified tables exist in Table Editor:
  - [ ] users
  - [ ] loss_events (15 rows)
  - [ ] properties (3 rows)
  - [ ] routing_queue (5 rows)
  - [ ] admin_settings (1 row)
- [ ] Created first admin user via invitation
- [ ] Set user role to 'admin' in SQL
- [ ] Copied Project URL from settings
- [ ] Copied anon public key from settings
- [ ] Verified RLS is enabled on all tables

### Local Development
- [ ] Node.js 18+ installed
- [ ] Cloned repository
- [ ] Ran `npm install` successfully
- [ ] Created `.env.local` file
- [ ] Added `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Added `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Ran `npm run dev` successfully
- [ ] Visited http://localhost:3000
- [ ] Successfully logged in
- [ ] Dashboard loads with data
- [ ] Loss Feed shows events
- [ ] Lead Routing shows queue
- [ ] Property pages load
- [ ] Map shows markers
- [ ] Admin settings load

### Code Quality
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No linting errors (`npm run lint`)
- [ ] All pages load without console errors
- [ ] Authentication works
- [ ] Data persists after refresh

## ☑️ Deployment Checklist

### Netlify Setup
- [ ] Connected repository to Netlify
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `.next`
- [ ] Added environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Triggered first deploy
- [ ] Deploy succeeded (check logs)
- [ ] Site is live at Netlify URL

### Post-Deployment Testing
- [ ] Visited deployed site URL
- [ ] Login page loads
- [ ] Successfully logged in with Supabase user
- [ ] Redirected to dashboard after login
- [ ] Dashboard shows correct metrics
- [ ] Loss Feed loads all events
- [ ] Filters work on Loss Feed
- [ ] Lead Routing loads queue
- [ ] Can assign a lead
- [ ] Assignment persists after refresh
- [ ] Property pages load correctly
- [ ] Map shows event markers
- [ ] Markers are clickable
- [ ] Admin settings load
- [ ] Can save admin settings
- [ ] Settings persist after refresh
- [ ] Sign out works
- [ ] After sign out, redirected to login
- [ ] Cannot access internal pages when logged out

## ☑️ User Management Checklist

### Adding Users
- [ ] Know how to invite users via Supabase
- [ ] Know how to set user roles
- [ ] Tested inviting a new user
- [ ] New user received invitation email
- [ ] New user completed signup
- [ ] Set appropriate role for new user
- [ ] New user can login
- [ ] New user sees appropriate access based on role

### Role Verification
- [ ] Admin can access all pages
- [ ] Admin can modify settings
- [ ] Ops can view and update data
- [ ] Viewer has read-only access (if implemented)

## ☑️ Data Verification Checklist

### Dashboard
- [ ] Daily loss count is accurate
- [ ] High-value ZIPs display correctly
- [ ] Events by category shows breakdown
- [ ] Lead conversion percentages calculate
- [ ] Top 10 events by severity display
- [ ] Map shows event markers

### Loss Feed
- [ ] All 15 events display
- [ ] Event type filter works
- [ ] Severity threshold filter works
- [ ] Income band filter works
- [ ] Claim probability filter works
- [ ] Status filter works
- [ ] Search works
- [ ] Timestamp sorting works
- [ ] Property links work

### Lead Routing
- [ ] All routing queue entries display
- [ ] Status filters work
- [ ] Can open assignment panel
- [ ] Can enter assignee name
- [ ] Can select assignee type
- [ ] Can select priority
- [ ] Can add notes
- [ ] Save persists to database
- [ ] Refresh shows saved data

### Property Intelligence
- [ ] Property details load
- [ ] Address displays correctly
- [ ] Property attributes show
- [ ] Event timeline displays
- [ ] Risk tags display
- [ ] Recommended actions show
- [ ] Route lead button works
- [ ] Creates routing queue entry

### Admin Panel
- [ ] Settings load from database
- [ ] Can modify severity threshold
- [ ] Can modify claim probability threshold
- [ ] Can toggle auto-create lead
- [ ] Can toggle nightly export
- [ ] Save persists to database
- [ ] Refresh shows saved settings

## ☑️ Security Checklist

- [ ] Environment variables not in repository
- [ ] `.env.local` in `.gitignore`
- [ ] Supabase RLS enabled on all tables
- [ ] Only authenticated users can access data
- [ ] Middleware protects internal routes
- [ ] Login required for all pages except /login
- [ ] Service role key (if used) is secret
- [ ] HTTPS enabled on production
- [ ] No sensitive data in client-side code

## ☑️ Performance Checklist

- [ ] Initial page load < 3 seconds
- [ ] Dashboard loads data quickly
- [ ] Loss Feed filters respond instantly
- [ ] Map renders without lag
- [ ] No console errors or warnings
- [ ] Images optimized
- [ ] Lighthouse score > 80

## ☑️ Documentation Checklist

- [ ] README.md is up to date
- [ ] DEPLOYMENT.md is accurate
- [ ] supabase/README.md is clear
- [ ] env.example has all required variables
- [ ] Code comments are helpful
- [ ] Database schema is documented

## ☑️ Maintenance Checklist

### Regular Tasks
- [ ] Monitor Supabase usage
- [ ] Check for database growth
- [ ] Review user access
- [ ] Update dependencies monthly
- [ ] Check for security updates
- [ ] Backup database regularly

### Monitoring
- [ ] Supabase logs reviewed
- [ ] Netlify deploy logs reviewed
- [ ] No authentication errors
- [ ] No database errors
- [ ] API requests within limits

## 🎉 Launch Checklist

Before announcing to team:
- [ ] All above checklists completed
- [ ] Tested with multiple users
- [ ] Documented any known issues
- [ ] Created user guide (if needed)
- [ ] Set up support process
- [ ] Communicated access instructions
- [ ] Provided login credentials
- [ ] Explained key features
- [ ] Gathered initial feedback

## ✅ Success Criteria

Your Loss Locator Pro deployment is successful when:
- ✅ Users can login with Supabase credentials
- ✅ All pages load without errors
- ✅ Data persists across sessions
- ✅ Lead assignments save correctly
- ✅ Admin settings persist
- ✅ Map shows event markers
- ✅ No console errors in production
- ✅ Team can use system effectively

---

**Congratulations! Your internal loss intelligence platform is ready for production use.**









