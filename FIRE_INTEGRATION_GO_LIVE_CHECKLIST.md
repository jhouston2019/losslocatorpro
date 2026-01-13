# Fire Incident Integration - Go-Live Verification Checklist

Complete this checklist before and after deploying the fire incident integration to production.

---

## Pre-Deployment Checklist

### Database Migration
- [ ] Review migration file: `supabase/migrations/007_add_fire_incident_fields.sql`
- [ ] Verify migration uses `ADD COLUMN IF NOT EXISTS` (safe)
- [ ] Test migration on staging database first
- [ ] Apply migration to production database
- [ ] Verify new columns exist:
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'loss_events' 
    AND column_name IN ('address', 'confidence_score', 'raw_payload');
  ```
- [ ] Verify indexes were created:
  ```sql
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename = 'loss_events' 
    AND indexname LIKE '%fire%' OR indexname LIKE '%confidence%' OR indexname LIKE '%address%';
  ```

### Environment Variables
- [ ] Set `FIRE_COMMERCIAL_API_URL` in Netlify
- [ ] Set `FIRE_COMMERCIAL_API_KEY` in Netlify
- [ ] Set `FIRE_STATE_API_URL` in Netlify
- [ ] Set `FIRE_STATE_API_KEY` in Netlify
- [ ] Verify `SUPABASE_URL` is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] Verify `CRON_SECRET` is set (optional but recommended)
- [ ] Test API credentials manually:
  ```bash
  curl -H "Authorization: Bearer YOUR_KEY" https://api.example.com/incidents
  ```

### Code Review
- [ ] Review `netlify/functions/ingest-fire-commercial.ts`
- [ ] Review `netlify/functions/ingest-fire-state.ts`
- [ ] Verify deduplication logic is correct
- [ ] Verify confidence escalation logic is correct
- [ ] Check error handling is comprehensive
- [ ] Confirm no hardcoded values
- [ ] Verify logging is adequate

### Scheduling Configuration
- [ ] Review `netlify.toml` scheduling
- [ ] Confirm commercial feed runs every 3 hours
- [ ] Confirm state feed runs daily at 1 AM UTC
- [ ] Verify no conflicts with existing schedules
- [ ] Check function timeout is adequate (300s)

### Testing
- [ ] Run linter on new functions (no errors)
- [ ] Test environment validation (missing vars should fail fast)
- [ ] Test with mock data (if available)
- [ ] Verify TypeScript compilation succeeds
- [ ] Check for any console warnings

---

## Deployment Steps

### 1. Deploy Code
- [ ] Commit all changes to git
- [ ] Push to main branch (or staging first)
- [ ] Wait for Netlify build to complete
- [ ] Verify build succeeded (no errors)
- [ ] Check Netlify function logs for deployment

### 2. Verify Functions Deployed
- [ ] Check Netlify dashboard shows new functions
- [ ] Verify `ingest-fire-commercial` is listed
- [ ] Verify `ingest-fire-state` is listed
- [ ] Check scheduled triggers are configured
- [ ] Confirm function URLs are accessible

### 3. Manual Test Run
- [ ] Trigger commercial function manually:
  ```bash
  curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-fire-commercial \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- [ ] Check response status code (200 = success)
- [ ] Review response body for metrics
- [ ] Trigger state function manually:
  ```bash
  curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-fire-state \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
  ```
- [ ] Check response status code (200 = success)
- [ ] Review response body for metrics

---

## Post-Deployment Verification

### Database Verification
- [ ] Check fire events were inserted:
  ```sql
  SELECT COUNT(*) FROM loss_events WHERE event_type = 'Fire';
  ```
- [ ] Verify commercial source exists:
  ```sql
  SELECT COUNT(*) FROM loss_events WHERE source = 'fire_commercial';
  ```
- [ ] Verify state source exists:
  ```sql
  SELECT COUNT(*) FROM loss_events WHERE source = 'fire_state';
  ```
- [ ] Check new fields are populated:
  ```sql
  SELECT 
    COUNT(*) as total,
    COUNT(address) as with_address,
    COUNT(confidence_score) as with_confidence,
    COUNT(raw_payload) as with_payload
  FROM loss_events 
  WHERE event_type = 'Fire' 
    AND source IN ('fire_commercial', 'fire_state');
  ```

### Data Quality Checks
- [ ] Verify event_type is 'Fire' (not lowercase):
  ```sql
  SELECT DISTINCT event_type FROM loss_events WHERE source IN ('fire_commercial', 'fire_state');
  ```
- [ ] Check confidence scores are valid (0.75, 0.85, or 0.95):
  ```sql
  SELECT DISTINCT confidence_score FROM loss_events WHERE source IN ('fire_commercial', 'fire_state');
  ```
- [ ] Verify coordinates are populated:
  ```sql
  SELECT 
    source,
    COUNT(*) as total,
    COUNT(latitude) as with_coords,
    ROUND(100.0 * COUNT(latitude) / COUNT(*), 2) as coord_pct
  FROM loss_events 
  WHERE source IN ('fire_commercial', 'fire_state')
  GROUP BY source;
  ```
- [ ] Check severity values are 0-1 scale:
  ```sql
  SELECT MIN(severity), MAX(severity), AVG(severity)
  FROM loss_events 
  WHERE source IN ('fire_commercial', 'fire_state');
  ```

### Deduplication Verification
- [ ] Check for duplicate source_event_ids (should be 0):
  ```sql
  SELECT source, source_event_id, COUNT(*) as duplicates
  FROM loss_events
  WHERE source IN ('fire_commercial', 'fire_state')
  GROUP BY source, source_event_id
  HAVING COUNT(*) > 1;
  ```
- [ ] Look for corroborated events (confidence = 0.95):
  ```sql
  SELECT COUNT(*) as corroborated_events
  FROM loss_events 
  WHERE event_type = 'Fire' 
    AND confidence_score >= 0.95;
  ```
- [ ] Check for nearby duplicates that should have been caught:
  ```sql
  -- Use query from FIRE_DEDUP_SQL_QUERIES.md
  ```

### Logging Verification
- [ ] Check Netlify function logs for commercial feed
- [ ] Verify log shows: fetched, inserted, skipped, corroborated counts
- [ ] Check for any error messages
- [ ] Verify confidence escalation messages (✨)
- [ ] Check Netlify function logs for state feed
- [ ] Verify similar metrics and messages

### Performance Verification
- [ ] Check function execution time (should be < 300s)
- [ ] Verify no timeout errors
- [ ] Check API response times (logged in function)
- [ ] Monitor database query performance
- [ ] Verify indexes are being used (EXPLAIN ANALYZE)

---

## Monitoring Setup

### Alerts to Configure
- [ ] Alert if function fails 3 times in a row
- [ ] Alert if no events inserted for 24 hours
- [ ] Alert if error rate > 10%
- [ ] Alert if function execution time > 240s
- [ ] Alert if API returns 401/403 (auth failure)

### Metrics to Track
- [ ] Daily ingestion count by source
- [ ] Corroboration rate (% of events at 0.95 confidence)
- [ ] Data quality metrics (address %, coordinates %)
- [ ] Deduplication effectiveness (skipped count)
- [ ] Function execution time trends

### Dashboards to Create
- [ ] Fire incident ingestion overview
- [ ] Deduplication effectiveness
- [ ] Data quality trends
- [ ] Geographic distribution
- [ ] Confidence score distribution

---

## First 24 Hours Checklist

### Hour 0-1 (Immediate)
- [ ] Monitor first commercial run (should happen within 3h)
- [ ] Check logs for errors
- [ ] Verify events inserted
- [ ] Confirm no duplicates created

### Hour 1-2 (State Feed)
- [ ] Monitor state feed run (1 AM UTC)
- [ ] Check for corroboration events
- [ ] Verify confidence escalation works
- [ ] Look for any errors

### Hour 3-6 (Second Commercial Run)
- [ ] Monitor second commercial run
- [ ] Check for additional corroborations
- [ ] Verify deduplication still working
- [ ] Compare metrics to first run

### Hour 24 (Full Day Review)
- [ ] Run executive summary query
- [ ] Check total events ingested
- [ ] Verify corroboration rate is reasonable (10-30%)
- [ ] Review any errors or warnings
- [ ] Check data quality metrics

---

## First Week Checklist

### Daily Tasks
- [ ] Review function logs for errors
- [ ] Check ingestion counts
- [ ] Monitor corroboration rate
- [ ] Verify no duplicate events
- [ ] Check data quality metrics

### Weekly Review
- [ ] Run data quality report
- [ ] Analyze geographic distribution
- [ ] Review confidence score distribution
- [ ] Check for any stuck events (should be corroborated but aren't)
- [ ] Verify API costs are within budget
- [ ] Review function execution times

### Optimization Opportunities
- [ ] Identify states with low data quality
- [ ] Find events missing coordinates
- [ ] Optimize slow deduplication queries
- [ ] Adjust confidence thresholds if needed
- [ ] Fine-tune severity calculations

---

## Rollback Criteria

### Immediate Rollback If:
- [ ] Function fails on every run (100% error rate)
- [ ] Creating massive duplicate records
- [ ] Corrupting existing data
- [ ] Causing database performance issues
- [ ] Exceeding API rate limits and getting blocked

### Consider Rollback If:
- [ ] Error rate > 50% for 24 hours
- [ ] No events inserted for 24 hours (API issue)
- [ ] Deduplication not working (many duplicates)
- [ ] Confidence escalation not working
- [ ] Significant cost overruns

### Rollback Procedure
1. [ ] Disable scheduled functions in `netlify.toml`
2. [ ] Redeploy to stop scheduled runs
3. [ ] Investigate root cause
4. [ ] Fix issues
5. [ ] Test in staging
6. [ ] Re-enable functions

---

## Success Criteria

### Must Have (Week 1)
- [ ] Both feeds running successfully
- [ ] No duplicate events created
- [ ] Corroboration working (some events at 0.95 confidence)
- [ ] Error rate < 10%
- [ ] Data quality acceptable (>50% with coordinates)

### Should Have (Week 2)
- [ ] Corroboration rate 10-30%
- [ ] Error rate < 5%
- [ ] Data quality improving (>70% with coordinates)
- [ ] Function execution time stable
- [ ] No manual intervention needed

### Nice to Have (Month 1)
- [ ] Corroboration rate 20-40%
- [ ] Error rate < 2%
- [ ] Data quality high (>80% with coordinates)
- [ ] Automated alerting working
- [ ] Cost optimization complete

---

## Troubleshooting Guide

### Issue: No Events Inserted
**Symptoms:** `inserted: 0` in logs  
**Possible Causes:**
- API credentials invalid
- API endpoint changed
- API rate limit exceeded
- All events are duplicates
- Network connectivity issue

**Diagnosis:**
```bash
# Test API manually
curl -H "Authorization: Bearer KEY" https://api.example.com/incidents

# Check for existing events
SELECT COUNT(*) FROM loss_events WHERE source = 'fire_commercial';
```

**Resolution:**
1. Verify API credentials
2. Check API documentation for changes
3. Review rate limits
4. Check network connectivity

---

### Issue: Many Duplicates Created
**Symptoms:** Same event appears multiple times  
**Possible Causes:**
- Deduplication logic not running
- Source_event_id not unique
- Coordinates missing or incorrect
- Time window too narrow

**Diagnosis:**
```sql
-- Find duplicates
SELECT source_event_id, COUNT(*) 
FROM loss_events 
WHERE source = 'fire_commercial'
GROUP BY source_event_id 
HAVING COUNT(*) > 1;
```

**Resolution:**
1. Review deduplication logic
2. Check source_event_id format
3. Verify coordinates are accurate
4. Consider adjusting thresholds

---

### Issue: No Corroboration Happening
**Symptoms:** No events at 0.95 confidence  
**Possible Causes:**
- Sources reporting different events
- Distance threshold too strict
- Time window too narrow
- Coordinates inaccurate

**Diagnosis:**
```sql
-- Find potential corroborations
-- Use query from FIRE_DEDUP_SQL_QUERIES.md
```

**Resolution:**
1. Check if sources overlap geographically
2. Review distance/time thresholds
3. Verify coordinate accuracy
4. Consider adjusting thresholds

---

### Issue: Function Timeout
**Symptoms:** Function execution > 300s  
**Possible Causes:**
- Too many events to process
- Slow API responses
- Slow database queries
- Inefficient deduplication

**Diagnosis:**
```bash
# Check function logs for timing
# Review database query performance
EXPLAIN ANALYZE SELECT ...
```

**Resolution:**
1. Optimize database queries
2. Add indexes if needed
3. Batch process events
4. Increase timeout (if justified)

---

## Sign-Off

### Pre-Deployment
- [ ] Technical Lead: _________________ Date: _______
- [ ] Database Admin: _________________ Date: _______
- [ ] DevOps: ________________________ Date: _______

### Post-Deployment (24h)
- [ ] Technical Lead: _________________ Date: _______
- [ ] Verified by: ____________________ Date: _______

### Production Approval (Week 1)
- [ ] Product Owner: __________________ Date: _______
- [ ] Technical Lead: _________________ Date: _______

---

## Notes

Use this space to document any issues, observations, or deviations from the plan:

```
[Date] [Name] - [Notes]




```

---

**Checklist Version:** 1.0  
**Last Updated:** December 31, 2025  
**Owner:** Technical Team



