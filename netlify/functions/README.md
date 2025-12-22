# Netlify Functions - Loss Locator Pro

## Overview

This directory contains serverless functions that run on Netlify's infrastructure as part of the **live data ingestion pipeline**.

## 🔄 Complete Pipeline

```
Phase A (15 min) → Phase B (1 hour) → Phase C (2 hours) → Call-Ready Leads
NOAA Events      → Properties       → Phone Numbers    → Routing Queue
```

## Functions

### `ingest-noaa-events.ts` (Phase A)

**Purpose:** Automatically ingest live severe weather events from NOAA feeds

**Type:** Scheduled Function

**Schedule:** Every 15 minutes (`*/15 * * * *`)

**Responsibilities:**
- Fetch NOAA severe weather data
- Normalize event types (Hail, Wind, Fire, Freeze)
- Reverse geocode coordinates to ZIP codes
- Calculate severity scores and claim probabilities
- Insert events into Supabase database
- Prevent duplicate ingestion

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for RLS bypass)

**Authentication:**
Uses Supabase service role key to bypass Row Level Security (RLS) policies for automated ingestion.

**Error Handling:**
- Graceful API failures (primary + fallback feeds)
- Individual event errors don't stop batch processing
- Comprehensive logging for debugging
- Duplicate detection and skipping

**Logging:**
All operations are logged with emoji indicators:
- 🌩️ Function start
- 📡 Data fetching
- 📊 Event processing
- ✅ Successful insertion
- ⏭️ Duplicate skipped
- ⚠️ Warning (non-critical)
- ❌ Error (needs attention)
- 🎉 Completion summary

**Response Format:**
```json
{
  "success": true,
  "inserted": 15,
  "skipped": 3,
  "errors": 0,
  "total": 18,
  "duration": 4523
}
```

**Testing:**
```bash
# Test locally
netlify functions:invoke ingest-noaa-events

# View logs
netlify functions:log ingest-noaa-events
```

---

### `enrich-properties.ts` (Phase B)

**Purpose:** Resolve impacted properties and ownership information for loss events

**Type:** Scheduled Function

**Schedule:** Every hour (`0 * * * *`)

**Responsibilities:**
- Find loss events without properties
- Search for impacted properties within radius
- Resolve owner names and types (LLC/Corp/Individual)
- Determine property type (residential/commercial)
- Insert into loss_properties table
- Prioritize commercial properties

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Configuration:**
- `IMPACT_RADIUS_MILES`: 5 miles (search radius)
- `BATCH_SIZE`: 50 events per run
- `COMMERCIAL_PRIORITY`: true

**Response Format:**
```json
{
  "success": true,
  "enriched": 20,
  "skipped": 5,
  "errors": 0,
  "total": 25,
  "duration": 3421
}
```

**Testing:**
```bash
netlify functions:invoke enrich-properties
netlify functions:log enrich-properties
```

---

### `enrich-phones.ts` (Phase C)

**Purpose:** Append phone numbers to high-value properties only

**Type:** Scheduled Function

**Schedule:** Every 2 hours (`0 */2 * * *`)

**Responsibilities:**
- Find properties without phone numbers
- Apply filters (commercial, income threshold, owner exists)
- Call contact enrichment API
- Validate phone confidence score
- Update loss_properties with phone data
- Respect admin thresholds

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Configuration:**
- `BATCH_SIZE`: 25 properties per run
- `MIN_CONFIDENCE`: 50% (minimum phone confidence)
- `COMMERCIAL_ONLY`: true (configurable via admin settings)

**Admin Settings Integration:**
Respects these settings from `admin_settings` table:
- `min_income_percentile`
- `min_phone_confidence`
- `commercial_only_routing`
- `phone_required_routing`

**Response Format:**
```json
{
  "success": true,
  "enriched": 12,
  "skipped": 8,
  "errors": 0,
  "total": 20,
  "duration": 5234
}
```

**Testing:**
```bash
netlify functions:invoke enrich-phones
netlify functions:log enrich-phones
```

## Adding New Functions

To add a new serverless function:

1. Create a new `.ts` file in this directory
2. Export a `handler` function
3. Add configuration to `netlify.toml` if needed
4. Deploy via git push

Example:
```typescript
import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Hello World' }),
  };
};
```

## Scheduled Functions

Scheduled functions are configured in `netlify.toml`:

```toml
[functions."function-name"]
  schedule = "*/15 * * * *"  # Cron expression
```

Cron format: `minute hour day month weekday`

Examples:
- `*/15 * * * *` - Every 15 minutes
- `0 * * * *` - Every hour
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday

## Security

### Service Role Key
- Required for functions that need to bypass RLS
- Set in Netlify environment variables
- NEVER commit to git
- NEVER expose to client-side code

### Best Practices
1. Use service role key only when necessary
2. Validate all inputs
3. Log all operations
4. Handle errors gracefully
5. Use TypeScript for type safety

## Monitoring

### View Logs
```bash
# All functions
netlify functions:list

# Specific function
netlify functions:log ingest-noaa-events
```

### Netlify Dashboard
1. Go to Functions tab
2. Click on function name
3. View logs, metrics, and configuration

## Troubleshooting

### Function Not Executing
1. Check Netlify deploy logs
2. Verify function is deployed
3. Check scheduled configuration
4. Review function logs

### Environment Variables Missing
```bash
# List variables
netlify env:list

# Set variable
netlify env:set KEY value
```

### Database Connection Issues
1. Verify Supabase URL and keys
2. Check service role key is correct
3. Test connection manually
4. Review RLS policies

## Documentation

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [Environment Variables](https://docs.netlify.com/environment-variables/overview/)

## Support

For issues with:
- **NOAA Ingestion:** See `NOAA_INGESTION_DEPLOYMENT.md`
- **Netlify Functions:** See Netlify documentation
- **Supabase:** See Supabase documentation

