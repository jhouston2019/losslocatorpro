# LOSS SIGNALS SYSTEM DOCUMENTATION

## Overview

**Loss Locator Pro aggregates and organizes multi-source loss signals into confidence-scored loss intelligence.**

This system ingests loss signals from multiple external sources, deduplicates them through spatial and temporal clustering, and produces confidence-scored loss clusters that augment (not replace) existing weather-based loss events.

## Architecture

### Data Flow

```
External Sources → Ingestion Functions → loss_signals table
                                              ↓
                                    Clustering Engine
                                              ↓
                                    loss_clusters table
                                              ↓
                                         UI Layer
```

### Key Components

1. **loss_signals**: Raw signals from multiple sources
2. **loss_clusters**: Deduplicated, confidence-scored intelligence
3. **loss_cluster_signals**: Join table linking signals to clusters
4. **Ingestion Functions**: Daily batch jobs per source type
5. **Clustering Engine**: Deduplication and confidence scoring
6. **Data Layer**: UI consumption functions

## Database Schema

### loss_signals

Stores raw loss signals from external sources.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| source_type | TEXT | weather \| fire_report \| cad \| news \| declaration |
| source_name | TEXT | Specific source (e.g., "NFIRS", "PulsePoint") |
| external_id | TEXT | Original ID from source system |
| event_type | TEXT | fire \| wind \| hail \| flood \| freeze \| tornado \| other |
| occurred_at | TIMESTAMP | When the event occurred |
| reported_at | TIMESTAMP | When the signal was reported |
| lat, lng | NUMERIC | Coordinates |
| geometry | JSONB | GeoJSON (point or polygon) |
| address_text | TEXT | Full address |
| city, state_code, zip | TEXT | Location components |
| severity_raw | NUMERIC | Raw severity from source (0-100) |
| confidence_raw | NUMERIC | Source-specific confidence (0-1) |
| raw_data | JSONB | Full raw payload for audit |
| created_at | TIMESTAMP | Ingestion timestamp |

**Unique constraint**: (source_type, source_name, external_id) prevents duplicate ingestion.

### loss_clusters

Deduplicated, confidence-scored loss intelligence.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_type | TEXT | Standardized event type |
| center_lat, center_lng | NUMERIC | Cluster centroid |
| geometry | JSONB | GeoJSON polygon of cluster extent |
| address_text, city, state_code, zip | TEXT | Location data |
| time_window_start, time_window_end | TIMESTAMP | Temporal bounds |
| confidence_score | INTEGER | Composite score (0-100) |
| verification_status | TEXT | probable \| reported \| confirmed |
| signal_count | INTEGER | Number of contributing signals |
| source_types | TEXT[] | Array of source types |
| created_at, updated_at | TIMESTAMP | Timestamps |

### loss_cluster_signals

Join table linking signals to clusters.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| cluster_id | UUID | Foreign key to loss_clusters |
| signal_id | UUID | Foreign key to loss_signals |
| created_at | TIMESTAMP | Link timestamp |

**Unique constraint**: (signal_id) ensures each signal belongs to only one cluster.

## Ingestion Functions

### 1. Fire Incident Ingestion

**Function**: `ingest-fire-incidents.ts`  
**Schedule**: Daily at 1 AM UTC  
**Sources**: NFIRS, state fire marshal APIs, fire department feeds

**Configuration**:
- `FIRE_INCIDENT_API_URL`: API endpoint
- `FIRE_INCIDENT_API_KEY`: Authentication key

**Signal Properties**:
- source_type: `fire_report`
- confidence_raw: 0.65
- Severity calculated from estimated loss

### 2. CAD/911 Feed Ingestion

**Function**: `ingest-cad-feeds.ts`  
**Schedule**: Daily at 2 AM UTC  
**Sources**: PulsePoint, Active911, municipal CAD systems

**Configuration**:
- `PULSEPOINT_API_URL`, `PULSEPOINT_API_KEY`
- `ACTIVE911_API_URL`, `ACTIVE911_API_KEY`
- `MUNICIPAL_CAD_API_URL`, `MUNICIPAL_CAD_API_KEY`

**Signal Properties**:
- source_type: `cad`
- confidence_raw: 0.55
- Only fire-related call types ingested
- Severity based on call type and priority

### 3. News/RSS Feed Ingestion

**Function**: `ingest-news-feeds.ts`  
**Schedule**: Daily at 3 AM UTC  
**Sources**: News RSS feeds, emergency reporting feeds

**Configuration**:
- `NEWS_RSS_FEED_1`, `NEWS_RSS_FEED_2`: RSS feed URLs
- `GEOCODING_API_URL`, `GEOCODING_API_KEY`: For address geocoding

**Signal Properties**:
- source_type: `news`
- confidence_raw: 0.60
- Uses NLP to extract event type, location, date
- Geocoding for lat/lng

**NLP Extraction**:
- Event type: Keyword matching
- Location: State abbreviations, ZIP codes, city patterns
- Severity: Keywords like "destroyed", "damaged", etc.

## Clustering Engine

**Function**: `cluster-loss-signals.ts`  
**Schedule**: Daily at 4 AM UTC (after all ingestion)

### Clustering Rules

Signals are clustered together if they match ALL criteria:

1. **Same event type**: fire, wind, hail, etc.
2. **Spatial proximity**: Within 5 km
3. **Temporal proximity**: Within 24 hours

### Deduplication Logic

- Multiple signals from same incident → Single cluster
- Signals without coordinates → Skipped
- Low-quality single-source signals → Suppressed

### Suppression Rules

Single-source signals are suppressed if:
- confidence_raw < 0.70 AND
- severity_raw < 60

Multi-source signals are NEVER suppressed.

## Confidence Scoring

**Conservative, transparent scoring system.**

### Base Scores by Source Type

| Source Type | Score Added |
|-------------|-------------|
| Weather only | +40 |
| Fire report | +25 |
| CAD call | +20 |
| News confirmation | +15 |
| Partner confirmation (future) | +20 |

**Maximum score**: 100 (capped)

### Verification Status

| Confidence Score | Status | Meaning |
|------------------|--------|---------|
| < 60 | probable | Weather-derived or single low-confidence source |
| 60-85 | reported | Multiple sources or high-confidence single source |
| > 85 | confirmed | Multi-source verification |

### Critical Rules

❌ **NEVER show "confirmed" without non-weather source**  
✅ Weather + any other source = minimum "reported"  
✅ Weather + 2+ other sources = "confirmed"

## UI Integration

### Data Layer Functions

**File**: `lib/lossSignalsData.ts`

#### getLossClusters(filters?)

Fetch loss clusters with optional filters:
- eventType
- confidenceTier (probable | reported | confirmed)
- minConfidence
- stateCode
- startDate, endDate
- sourceTypes

#### getLossClusterById(clusterId)

Get single cluster with full signal details.

#### getRecentLossClusters(days, limit)

Get recent clusters for dashboard (default 7 days).

#### getLossClustersByBounds(minLat, maxLat, minLng, maxLng, filters?)

Get clusters within map viewport.

#### getLossClusterStats(days)

Get statistics for dashboard metrics.

#### getVerificationBadge(cluster)

Get badge info for display:
- "Weather-Derived"
- "Reported Incident"
- "Multi-Source Confirmed"

### Display Guidelines

**Map Overlays**:
- Clusters augment existing weather layers
- Color by verification status
- Size by signal count or confidence
- Popup shows source composition

**Filters**:
- Event type
- Confidence tier
- Time window
- Source presence (e.g., "Has non-weather source")

**Badges**:
- Weather-Derived: Blue
- Reported Incident: Amber
- Multi-Source Confirmed: Green

## Scheduling

All functions run daily in staggered sequence:

```
00:00 UTC - NOAA weather ingestion (existing)
01:00 UTC - Fire incident ingestion
02:00 UTC - CAD/911 feed ingestion
03:00 UTC - News/RSS feed ingestion
04:00 UTC - Clustering engine
05:00 UTC - Property enrichment (existing)
06:00 UTC - Phone enrichment (existing)
```

**Staggering prevents**:
- API rate limit issues
- Database lock contention
- Resource exhaustion

## Monitoring

### Ingestion Logs

Table: `loss_signal_ingestion_log`

Tracks each ingestion run:
- source_type, source_name
- started_at, completed_at
- status (running | success | partial | failed)
- signals_ingested, signals_skipped
- error_message

**Query recent runs**:
```sql
SELECT * FROM loss_signal_ingestion_log
ORDER BY started_at DESC
LIMIT 20;
```

### Health Checks

**Daily ingestion success rate**:
```sql
SELECT 
  source_type,
  source_name,
  COUNT(*) as runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes
FROM loss_signal_ingestion_log
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY source_type, source_name;
```

**Signal volume by source**:
```sql
SELECT 
  source_type,
  COUNT(*) as signal_count,
  COUNT(DISTINCT DATE(created_at)) as days_active
FROM loss_signals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY source_type;
```

**Cluster quality metrics**:
```sql
SELECT 
  verification_status,
  COUNT(*) as cluster_count,
  AVG(signal_count) as avg_signals_per_cluster,
  AVG(confidence_score) as avg_confidence
FROM loss_clusters
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY verification_status;
```

## Deployment

### Database Migration

```bash
# Run migration to create tables
psql $DATABASE_URL < supabase/migrations/006_loss_signals_system.sql
```

### Environment Variables

**Required** (set in Netlify dashboard):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` (for function authentication)

**Optional** (configure as sources become available):
- Fire incident API credentials
- CAD feed API credentials
- News RSS feed URLs
- Geocoding API credentials

### Function Deployment

Functions deploy automatically with Netlify builds.

**Manual trigger** (for testing):
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/ingest-fire-incidents \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Validation

### Pre-Launch Checklist

✅ Multiple sources collapse into single clusters  
✅ Duplicate news/fire reports do not create noise  
✅ Confidence scores behave monotonically  
✅ No false "confirmed" states without non-weather sources  
✅ Existing dashboard still functions  
✅ Weather layers remain intact  
✅ Ingestion logs capture all runs  
✅ Clustering runs after all ingestion completes

### Test Scenarios

1. **Single weather signal** → Probable cluster (40-50 confidence)
2. **Weather + fire report** → Reported cluster (65+ confidence)
3. **Weather + CAD + news** → Confirmed cluster (85+ confidence)
4. **Duplicate signals** → Single cluster, multiple signals linked
5. **Low-quality single source** → Suppressed, no cluster created

## Troubleshooting

### No signals ingested

- Check API credentials in environment variables
- Verify API endpoints are accessible
- Review ingestion logs for error messages
- Check rate limits on external APIs

### Clusters not created

- Verify clustering function ran after ingestion
- Check if signals have valid coordinates
- Review suppression rules (low confidence + low severity)
- Ensure signals are within clustering thresholds (5km, 24h)

### Incorrect confidence scores

- Verify source_type values are correct
- Check signal composition (weather vs non-weather)
- Review confidence calculation logic
- Ensure verification status mapping is correct

## Future Enhancements

### Phase 2 Sources

- Federal disaster declarations (FEMA)
- Insurance claim data (partner integration)
- Social media signals (Twitter/X, Facebook)
- Satellite imagery analysis

### Phase 2 Features

- Real-time ingestion (vs daily batch)
- Machine learning for event classification
- Predictive clustering (forecast-based)
- Partner confirmation workflow (+20 confidence)

## Support

For issues or questions:
1. Check ingestion logs: `loss_signal_ingestion_log`
2. Review function logs in Netlify dashboard
3. Verify environment variables are set
4. Test individual functions manually

---

**Remember**: Loss Locator Pro does not ingest "losses". It ingests loss signals from multiple sources and converts them into organized loss intelligence.







