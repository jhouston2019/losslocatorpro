import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types';

// ============================================================================
// PHONE NUMBER ENRICHMENT (SELECTIVE)
// ============================================================================
// Appends phone numbers to high-value properties only
// Runs every 2 hours via Netlify scheduled functions
// Only enriches commercial properties meeting admin thresholds

interface ContactEnrichmentResult {
  phone_primary?: string;
  phone_secondary?: string;
  phone_type?: 'mobile' | 'landline' | 'voip' | 'unknown';
  phone_confidence?: number; // 0-100
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 25; // Process this many properties per run
const MIN_CONFIDENCE = 50; // Minimum phone confidence score to accept
const COMMERCIAL_ONLY = true; // Only enrich commercial properties
const MIN_INCOME_PERCENTILE = 0; // Will be overridden by admin settings

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate phone number format
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // US phone numbers should be 10 or 11 digits
  if (digits.length === 10 || digits.length === 11) {
    return true;
  }
  
  return false;
}

/**
 * Format phone number to standard format
 */
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
}

/**
 * Enrich contact information using external API
 * In production, this would call a real contact enrichment service
 * Examples: ZoomInfo, Apollo.io, Clearbit, Hunter.io
 */
async function enrichContactInfo(
  ownerName: string,
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<ContactEnrichmentResult | null> {
  // TODO: Replace with actual contact enrichment API
  // Examples:
  // - ZoomInfo API
  // - Apollo.io API
  // - Clearbit Enrichment
  // - Hunter.io
  // - RocketReach
  
  console.log(`🔍 Enriching contact for: ${ownerName} at ${address}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Mock implementation for demonstration
  // In production, this data comes from real enrichment APIs
  
  // Simulate 70% success rate
  if (Math.random() > 0.7) {
    console.log(`⚠️ No contact data found for ${ownerName}`);
    return null;
  }
  
  // Generate mock phone data
  const areaCode = zip ? zip.slice(0, 3) : '555';
  const exchange = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  
  const phoneNumber = `(${areaCode}) ${exchange}-${lineNumber}`;
  
  // Random phone type
  const phoneTypes: ('mobile' | 'landline' | 'voip')[] = ['mobile', 'landline', 'voip'];
  const phoneType = phoneTypes[Math.floor(Math.random() * phoneTypes.length)];
  
  // Random confidence (50-95)
  const confidence = Math.floor(Math.random() * 45) + 50;
  
  // Sometimes include secondary phone
  let secondaryPhone: string | undefined;
  if (Math.random() > 0.7) {
    const secExchange = Math.floor(Math.random() * 900) + 100;
    const secLineNumber = Math.floor(Math.random() * 9000) + 1000;
    secondaryPhone = `(${areaCode}) ${secExchange}-${secLineNumber}`;
  }
  
  return {
    phone_primary: phoneNumber,
    phone_secondary: secondaryPhone,
    phone_type: phoneType,
    phone_confidence: confidence,
  };
}

// ============================================================================
// MAIN ENRICHMENT LOGIC
// ============================================================================

const handler: Handler = async (event, context) => {
  console.log('📞 Starting phone enrichment...');
  
  const startTime = Date.now();
  let enrichedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Fetch admin settings to get thresholds
    console.log('⚙️ Fetching admin settings...');
    
    const { data: adminSettings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('min_income_percentile, min_phone_confidence, phone_required_routing, commercial_only_routing')
      .limit(1)
      .single();
    
    if (settingsError) {
      console.warn('⚠️ Could not fetch admin settings, using defaults:', settingsError);
    }
    
    const minIncomePercentile = adminSettings?.min_income_percentile || MIN_INCOME_PERCENTILE;
    const minPhoneConfidence = adminSettings?.min_phone_confidence || MIN_CONFIDENCE;
    const commercialOnly = adminSettings?.commercial_only_routing ?? COMMERCIAL_ONLY;
    
    console.log(`📊 Thresholds: Income ≥${minIncomePercentile}%, Confidence ≥${minPhoneConfidence}%, Commercial Only: ${commercialOnly}`);
    
    // Build query for properties needing phone enrichment
    let query = supabase
      .from('loss_properties')
      .select('id, loss_id, owner_name, address, city, state_code, zip')
      .is('phone_primary', null)
      .not('owner_name', 'is', null);
    
    // Apply commercial-only filter if enabled
    if (commercialOnly) {
      query = query.in('owner_type', ['LLC', 'Corp']);
    }
    
    const { data: properties, error: fetchError } = await query
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);
    
    if (fetchError) {
      throw new Error(`Failed to fetch properties: ${fetchError.message}`);
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ No properties need phone enrichment');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No properties to enrich',
          enriched: 0,
          skipped: 0,
          errors: 0,
          duration: Date.now() - startTime,
        }),
      };
    }
    
    console.log(`📊 Processing ${properties.length} properties...`);
    
    // Process each property
    for (const property of properties) {
      try {
        // Check income threshold if ZIP demographics available
        if (minIncomePercentile > 0 && property.zip) {
          const { data: zipDemo, error: zipError } = await supabase
            .from('zip_demographics')
            .select('income_percentile')
            .eq('zip', property.zip)
            .limit(1)
            .single();
          
          if (!zipError && zipDemo) {
            if ((zipDemo.income_percentile || 0) < minIncomePercentile) {
              console.log(`⏭️ Property ${property.id} below income threshold (${zipDemo.income_percentile}% < ${minIncomePercentile}%)`);
              skippedCount++;
              continue;
            }
          }
        }
        
        // Enrich contact information
        const contactInfo = await enrichContactInfo(
          property.owner_name!,
          property.address,
          property.city || undefined,
          property.state_code || undefined,
          property.zip || undefined
        );
        
        if (!contactInfo) {
          console.log(`⚠️ No contact data found for property ${property.id}`);
          skippedCount++;
          continue;
        }
        
        // Check confidence threshold
        if ((contactInfo.phone_confidence || 0) < minPhoneConfidence) {
          console.log(`⏭️ Phone confidence too low for property ${property.id} (${contactInfo.phone_confidence}% < ${minPhoneConfidence}%)`);
          skippedCount++;
          continue;
        }
        
        // Validate phone number
        if (!contactInfo.phone_primary || !isValidPhoneNumber(contactInfo.phone_primary)) {
          console.log(`⚠️ Invalid phone number for property ${property.id}`);
          skippedCount++;
          continue;
        }
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(contactInfo.phone_primary);
        const formattedSecondary = contactInfo.phone_secondary 
          ? formatPhoneNumber(contactInfo.phone_secondary) 
          : null;
        
        // Update property with phone information
        const { error: updateError } = await supabase
          .from('loss_properties')
          .update({
            phone_primary: formattedPhone,
            phone_secondary: formattedSecondary,
            phone_type: contactInfo.phone_type || 'unknown',
            phone_confidence: contactInfo.phone_confidence || 0,
          })
          .eq('id', property.id);
        
        if (updateError) {
          console.error(`❌ Error updating property ${property.id}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Enriched property ${property.id} with phone: ${formattedPhone} (${contactInfo.phone_confidence}% confidence)`);
          enrichedCount++;
        }
        
      } catch (propertyError) {
        console.error(`Error processing property ${property.id}:`, propertyError);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    const summary = {
      success: true,
      enriched: enrichedCount,
      skipped: skippedCount,
      errors: errorCount,
      total: properties.length,
      duration,
    };
    
    console.log('🎉 Phone enrichment complete:', summary);
    
    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    };
    
  } catch (error) {
    console.error('❌ Fatal error during phone enrichment:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        enriched: enrichedCount,
        skipped: skippedCount,
        errors: errorCount,
        duration: Date.now() - startTime,
      }),
    };
  }
};

// Export as scheduled function (runs every 2 hours)
export { handler };

