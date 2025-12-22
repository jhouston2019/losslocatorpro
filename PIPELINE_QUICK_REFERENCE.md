# Live Data Ingestion Pipeline - Quick Reference

## 🚀 One-Command Deploy

```bash
# Deploy everything
git add .
git commit -m "feat: Complete live data ingestion pipeline (A+B+C)"
git push origin main
```

## ⚙️ Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # CRITICAL
```

## 📊 Pipeline Overview

| Phase | Function | Schedule | Purpose |
|-------|----------|----------|---------|
| **A** | `ingest-noaa-events` | Every 15 min | Fetch NOAA weather events |
| **B** | `enrich-properties` | Every hour | Resolve properties & owners |
| **C** | `enrich-phones` | Every 2 hours | Add phone numbers (selective) |

## 🔍 Quick Verification

### Check Phase A (NOAA Events)
```sql
SELECT COUNT(*) FROM loss_events WHERE source = 'NOAA';
```

### Check Phase B (Properties)
```sql
SELECT COUNT(*) FROM loss_properties WHERE owner_name IS NOT NULL;
```

### Check Phase C (Phones)
```sql
SELECT COUNT(*) FROM loss_properties WHERE phone_primary IS NOT NULL;
```

## 📝 View Logs

```bash
# Phase A
netlify functions:log ingest-noaa-events

# Phase B
netlify functions:log enrich-properties

# Phase C
netlify functions:log enrich-phones
```

## 🧪 Manual Testing

```bash
# Test each phase
netlify functions:invoke ingest-noaa-events
netlify functions:invoke enrich-properties
netlify functions:invoke enrich-phones
```

## ⚙️ Admin Thresholds

Control Phase C behavior via `admin_settings`:

```sql
UPDATE admin_settings SET
  min_income_percentile = 60,      -- Only enrich high-income ZIPs
  min_phone_confidence = 70,       -- Require 70%+ confidence
  commercial_only_routing = true;  -- Commercial properties only
```

## 🎯 Expected Timeline

| Time | What Happens |
|------|--------------|
| **0:00** | Deploy code |
| **0:15** | Phase A runs → Events appear |
| **1:00** | Phase B runs → Properties added |
| **2:00** | Phase C runs → Phones enriched |
| **2:05** | Routing queue has call-ready leads |

## 📊 Success Indicators

✅ Netlify Functions show "Scheduled" badges  
✅ `loss_events` has rows with `source='NOAA'`  
✅ `loss_properties` has rows with `owner_name`  
✅ `loss_properties` has rows with `phone_primary`  
✅ Loss Feed auto-populates  
✅ Routing Queue fills automatically  

## 🐛 Common Issues

### No Events
- Check NOAA feed accessibility
- Verify service role key set
- Check function logs

### No Properties
- Wait 1 hour for first run
- Verify events have lat/lng
- Check function logs

### No Phones
- Check admin thresholds (may be too strict)
- Verify commercial_only_routing setting
- Review skip reasons in logs

## 📖 Full Documentation

- **Quick Start:** `NOAA_QUICK_START.md`
- **Complete Guide:** `LIVE_INGESTION_COMPLETE_GUIDE.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Phase A Details:** `NOAA_INGESTION_DEPLOYMENT.md`

## 🔐 Security Checklist

- ✅ Service role key set (Netlify env vars)
- ✅ Never commit keys to git
- ✅ Functions run server-side only
- ✅ All operations logged
- ✅ Admin thresholds enforced

## 📈 Monitoring Query

```sql
-- Daily pipeline summary
SELECT 
  DATE(le.created_at) as date,
  COUNT(DISTINCT le.id) as events,
  COUNT(DISTINCT lp.id) as properties,
  COUNT(DISTINCT CASE WHEN lp.phone_primary IS NOT NULL THEN lp.id END) as with_phones
FROM loss_events le
LEFT JOIN loss_properties lp ON le.id = lp.loss_id
WHERE le.source = 'NOAA'
  AND le.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(le.created_at)
ORDER BY date DESC;
```

## 🎯 What You Get

**Before:** Manual data uploads, incomplete information, no automation

**After:**
- ✅ Live severe weather events (automatic)
- ✅ Impacted properties identified
- ✅ Owner information resolved
- ✅ Phone numbers on high-value leads
- ✅ Call-ready routing queue
- ✅ Zero manual intervention

---

**That's it!** Your Loss Locator Pro is now fully automated.

