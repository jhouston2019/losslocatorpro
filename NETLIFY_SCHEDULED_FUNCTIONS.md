# Netlify Scheduled Functions Configuration

## Important Note

Netlify scheduled functions **cannot be configured in `netlify.toml`**. They must be configured through the Netlify UI or API.

## Loss Signal Ingestion Pipeline Schedule

Configure these scheduled functions in the Netlify dashboard under **Functions > Scheduled functions**:

### 1. NOAA Weather Events
- **Function**: `ingest-noaa-events`
- **Schedule**: `0 0 * * *` (Daily at midnight UTC)
- **Description**: Ingest weather events from NOAA

### 2. Commercial Fire Incidents
- **Function**: `ingest-fire-commercial`
- **Schedule**: `0 */3 * * *` (Every 3 hours)
- **Description**: Ingest commercial fire incidents

### 3. State/NFIRS Fire Incidents
- **Function**: `ingest-fire-state`
- **Schedule**: `0 1 * * *` (Daily at 1 AM UTC)
- **Description**: Ingest state fire incidents

### 4. Fire Incident Reports (Legacy)
- **Function**: `ingest-fire-incidents`
- **Schedule**: `0 2 * * *` (Daily at 2 AM UTC)
- **Description**: Legacy fire incident ingestion

### 5. CAD/911 Feeds
- **Function**: `ingest-cad-feeds`
- **Schedule**: `0 3 * * *` (Daily at 3 AM UTC)
- **Description**: Ingest CAD/911 dispatch feeds

### 6. News/RSS Feeds
- **Function**: `ingest-news-feeds`
- **Schedule**: `0 4 * * *` (Daily at 4 AM UTC)
- **Description**: Ingest news and RSS feeds

### 7. Loss Signal Clustering Engine
- **Function**: `cluster-loss-signals`
- **Schedule**: `0 5 * * *` (Daily at 5 AM UTC)
- **Description**: Run clustering/deduplication engine

### 8. Property Enrichment
- **Function**: `enrich-properties`
- **Schedule**: `0 5 * * *` (Daily at 5 AM UTC)
- **Description**: Enrich property data

### 9. Phone Enrichment
- **Function**: `enrich-phones`
- **Schedule**: `0 6 * * *` (Daily at 6 AM UTC)
- **Description**: Enrich phone data

## How to Configure in Netlify UI

1. Go to your site in Netlify dashboard
2. Navigate to **Functions** tab
3. Click **Scheduled functions**
4. For each function above:
   - Click **Add scheduled function**
   - Enter the function name
   - Enter the cron schedule
   - Save

## Environment Variables Required

Set these in **Site settings > Environment variables**:

### Required for all ingestion functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (for authentication)

### Fire Incident APIs (NEW - REQUIRED):
- `FIRE_COMMERCIAL_API_URL`
- `FIRE_COMMERCIAL_API_KEY`
- `FIRE_STATE_API_URL`
- `FIRE_STATE_API_KEY`

### Optional API keys (configure as needed):
- `FIRE_INCIDENT_API_URL` (legacy)
- `FIRE_INCIDENT_API_KEY` (legacy)
- `PULSEPOINT_API_URL`
- `PULSEPOINT_API_KEY`
- `ACTIVE911_API_URL`
- `ACTIVE911_API_KEY`
- `MUNICIPAL_CAD_API_URL`
- `MUNICIPAL_CAD_API_KEY`
- `NEWS_RSS_FEED_1`
- `NEWS_RSS_FEED_2`
- `GEOCODING_API_URL`
- `GEOCODING_API_KEY`

## Pipeline Sequence

The functions are staggered to avoid rate limits:

```
00:00 UTC - NOAA Weather Events (baseline)
01:00 UTC - State Fire Incidents
02:00 UTC - Fire Incidents (legacy)
03:00 UTC - CAD/911 Feeds
04:00 UTC - News/RSS Feeds
05:00 UTC - Clustering Engine + Property Enrichment
06:00 UTC - Phone Enrichment
```

Plus:
- Commercial Fire Incidents run every 3 hours continuously

## Alternative: Use Netlify API

You can also configure scheduled functions via the Netlify API:

```bash
curl -X POST "https://api.netlify.com/api/v1/sites/{site_id}/scheduled_functions" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ingest-noaa-events",
    "schedule": "0 0 * * *"
  }'
```

Repeat for each function in the list above.
