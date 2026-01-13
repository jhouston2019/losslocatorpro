/**
 * NEWS/RSS FEED INGESTION FUNCTION
 * 
 * Ingests loss-related incidents from news sources and RSS feeds.
 * Uses NLP to extract location, incident type, and date from news articles.
 * 
 * Loss Locator Pro aggregates and organizes multi-source loss signals
 * into confidence-scored loss intelligence.
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';
import Parser from 'rss-parser';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
const rssParser = new Parser();

// ============================================================================
// TYPES
// ============================================================================

interface NewsArticle {
  id: string;
  title: string;
  content?: string;
  description?: string;
  link: string;
  pubDate: string;
  source: string;
}

interface ExtractedIncident {
  eventType: string | null;
  location: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  date: string;
  severity: number;
}

interface IngestionResult {
  success: boolean;
  signalsIngested: number;
  signalsSkipped: number;
  errors: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOURCE_TYPE = 'news';
const CONFIDENCE_BASE = 0.60; // News reports have moderate confidence

// RSS feeds to monitor (configurable)
const RSS_FEEDS = [
  {
    name: 'Local_News_Fire',
    url: process.env.NEWS_RSS_FEED_1,
    keywords: ['fire', 'blaze', 'burns', 'flames']
  },
  {
    name: 'Emergency_News',
    url: process.env.NEWS_RSS_FEED_2,
    keywords: ['fire', 'disaster', 'emergency', 'damage']
  }
];

// Event type keywords for NLP extraction
// Maps to loss_events.event_type values: 'Fire', 'Wind', 'Hail', 'Freeze'
const EVENT_KEYWORDS = {
  Fire: ['fire', 'blaze', 'flames', 'burning', 'burns', 'burned', 'arson'],
  Wind: ['wind', 'windstorm', 'gust', 'hurricane', 'tornado'],
  Hail: ['hail', 'hailstorm', 'hailstone'],
  Freeze: ['freeze', 'frozen', 'ice storm', 'winter storm']
};

// State abbreviation mapping for extraction
const STATE_ABBR = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// ============================================================================
// RSS FEED FETCHING
// ============================================================================

/**
 * Fetch articles from RSS feeds
 */
async function fetchRSSFeeds(): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];
  
  for (const feed of RSS_FEEDS) {
    if (!feed.url) {
      console.log(`RSS feed ${feed.name} not configured`);
      continue;
    }
    
    try {
      console.log(`Fetching RSS feed: ${feed.name}`);
      
      const parsedFeed = await rssParser.parseURL(feed.url);
      
      // Filter articles by keywords
      const relevantArticles = parsedFeed.items.filter((item: any) => {
        const text = `${item.title} ${item.contentSnippet || item.description || ''}`.toLowerCase();
        return feed.keywords.some(keyword => text.includes(keyword.toLowerCase()));
      });
      
      console.log(`Found ${relevantArticles.length} relevant articles from ${feed.name}`);
      
      // Convert to NewsArticle format
      for (const item of relevantArticles) {
        articles.push({
          id: item.guid || item.link || '',
          title: item.title || '',
          content: item.content || '',
          description: item.contentSnippet || item.description || '',
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.name
        });
      }
      
    } catch (error) {
      console.error(`Error fetching RSS feed ${feed.name}:`, error);
    }
  }
  
  return articles;
}

// ============================================================================
// NLP EXTRACTION
// ============================================================================

/**
 * Extract incident details from article text using simple NLP
 * For production, consider using a proper NLP library or API
 */
function extractIncidentFromArticle(article: NewsArticle): ExtractedIncident | null {
  const text = `${article.title} ${article.description || article.content || ''}`;
  
  // Extract event type
  let eventType: string | null = null;
  let highestMatchCount = 0;
  
  for (const [type, keywords] of Object.entries(EVENT_KEYWORDS)) {
    const matchCount = keywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    ).length;
    
    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount;
      eventType = type;
    }
  }
  
  if (!eventType) {
    return null; // No recognizable event type
  }
  
  // Extract location information
  const location: ExtractedIncident['location'] = {};
  
  // Extract state (look for state abbreviations)
  for (const state of STATE_ABBR) {
    const stateRegex = new RegExp(`\\b${state}\\b`, 'i');
    if (stateRegex.test(text)) {
      location.state = state;
      break;
    }
  }
  
  // Extract ZIP code
  const zipMatch = text.match(/\b\d{5}\b/);
  if (zipMatch) {
    location.zip = zipMatch[0];
  }
  
  // Extract city (simple pattern: "in [City]" or "[City],")
  const cityMatch = text.match(/\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (cityMatch) {
    location.city = cityMatch[1];
  }
  
  // Calculate severity based on keywords (0-1 scale for loss_events)
  let severity = 0.50; // Default moderate
  
  const severeKeywords = ['destroyed', 'total loss', 'severe', 'major', 'extensive'];
  const moderateKeywords = ['damaged', 'minor', 'contained'];
  
  const textLower = text.toLowerCase();
  
  if (severeKeywords.some(kw => textLower.includes(kw))) {
    severity = 0.80;
  } else if (moderateKeywords.some(kw => textLower.includes(kw))) {
    severity = 0.40;
  }
  
  // Use article publication date
  const date = article.pubDate;
  
  return {
    eventType,
    location,
    date,
    severity
  };
}

/**
 * Geocode location to get lat/lng
 * For production, integrate with a geocoding service (Google Maps, Mapbox, etc.)
 */
async function geocodeLocation(location: ExtractedIncident['location']): Promise<{ lat: number; lng: number } | null> {
  // IMPLEMENTATION NOTE:
  // This is a placeholder. In production, integrate with a geocoding service.
  // Example: Google Maps Geocoding API, Mapbox Geocoding API, or OpenStreetMap Nominatim
  
  const geocodingApiKey = process.env.GEOCODING_API_KEY;
  const geocodingApiUrl = process.env.GEOCODING_API_URL;
  
  if (!geocodingApiKey || !geocodingApiUrl) {
    return null; // Geocoding not configured
  }
  
  try {
    // Build address string
    const addressParts = [
      location.address,
      location.city,
      location.state,
      location.zip
    ].filter(Boolean);
    
    if (addressParts.length === 0) {
      return null;
    }
    
    const address = addressParts.join(', ');
    
    const response = await fetch(
      `${geocodingApiUrl}?address=${encodeURIComponent(address)}&key=${geocodingApiKey}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      };
    }
    
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
}

// ============================================================================
// INGESTION LOGIC
// ============================================================================

/**
 * Ingest news articles into loss_events table
 */
async function ingestNewsArticles(): Promise<IngestionResult> {
  const result: IngestionResult = {
    success: false,
    signalsIngested: 0,
    signalsSkipped: 0,
    errors: []
  };
  
  try {
    console.log('Fetching news articles from RSS feeds...');
    
    const articles = await fetchRSSFeeds();
    
    console.log(`Retrieved ${articles.length} relevant articles`);
    
    // Process each article
    for (const article of articles) {
      try {
        // Extract incident details
        const incident = extractIncidentFromArticle(article);
        
        if (!incident || !incident.eventType) {
          result.signalsSkipped++;
          continue;
        }
        
        // Attempt to geocode location
        const coords = await geocodeLocation(incident.location);
        
        // Combine source_type and source_name for the source field
        const source = `${SOURCE_TYPE}:${article.source}`;
        
        // Use ZIP or placeholder
        const zip = incident.location.zip || '00000';
        
        // Build event data for loss_events table
        const eventData = {
          // Core fields (mapped to loss_events schema)
          event_type: incident.eventType,
          event_timestamp: new Date(incident.date).toISOString(),
          severity: incident.severity,
          zip: zip,
          state_code: incident.location.state || null,
          
          // Coordinate fields (populate both new and legacy)
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
          
          // Source tracking and deduplication
          source: source,
          source_event_id: article.id,
          
          // Confidence and priority
          claim_probability: CONFIDENCE_BASE,
          priority_score: Math.round(incident.severity * 100),
          
          // Status and property type
          status: 'Unreviewed' as const,
          property_type: 'residential' as const
        };
        
        // Insert into loss_events
        const { error } = await supabase
          .from('loss_events')
          .upsert(eventData, {
            onConflict: 'source,source_event_id',
            ignoreDuplicates: true
          });
        
        if (error) {
          if (error.code === '23505') {
            result.signalsSkipped++;
          } else {
            result.errors.push(`Error inserting event ${article.id}: ${error.message}`);
          }
        } else {
          result.signalsIngested++;
        }
        
      } catch (error: any) {
        result.errors.push(`Error processing article ${article.id}: ${error.message}`);
      }
    }
    
    result.success = true;
    
  } catch (error: any) {
    result.errors.push(`Fatal error: ${error.message}`);
  }
  
  return result;
}

// ============================================================================
// NETLIFY FUNCTION HANDLER
// ============================================================================

export const handler: Handler = async (event: HandlerEvent) => {
  // Verify this is a scheduled function call or authenticated request
  const authHeader = event.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  
  console.log('Starting news feed ingestion...');
  
  try {
    const result = await ingestNewsArticles();
    
    console.log('News feed ingestion complete:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'News feed ingestion complete',
        result
      })
    };
    
  } catch (error: any) {
    console.error('News feed ingestion failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'News feed ingestion failed',
        message: error.message
      })
    };
  }
};





