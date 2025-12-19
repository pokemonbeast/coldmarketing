/**
 * Lead Extraction Service
 * 
 * Extracts unique emails from GMB (Google My Business) scrape results.
 * Deduplicates by domain (1 email per domain) and includes company metadata.
 */

export interface GmbScrapedItem {
  title?: string;
  email?: string;
  emails?: string[];
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  postalCode?: string;
  categoryName?: string;
  categories?: string[];
  domain?: string;
  [key: string]: unknown;
}

export interface ExtractedLead {
  email: string;
  domain: string;
  companyName: string | null;
  leadType: 'business' | 'person';
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string;
  state: string;
  countryCode: string;
  industry: string;
}

export interface ExtractionResult {
  leads: ExtractedLead[];
  totalEmailsFound: number;
  uniqueDomainsFound: number;
  skippedInvalidEmails: number;
}

/**
 * Validates an email address
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) return false;
  
  // Filter out common invalid patterns
  const invalidPatterns = [
    'example.com',
    'test.com',
    'localhost',
    'godaddy.com', // Often filler emails
    'wix.com',
    'squarespace.com',
    '@google.com/maps', // Sometimes URLs get parsed as emails
  ];
  
  const lowerEmail = email.toLowerCase();
  for (const pattern of invalidPatterns) {
    if (lowerEmail.includes(pattern)) return false;
  }
  
  // Filter out URLs that got incorrectly parsed
  if (email.includes('http') || email.includes('www.') || email.includes('//')) {
    return false;
  }
  
  return true;
}

/**
 * Extracts domain from email address
 */
function extractDomain(email: string): string | null {
  if (!email) return null;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;
  return parts[1];
}

/**
 * Cleans and normalizes an email address
 */
function cleanEmail(email: string): string {
  return email.trim().toLowerCase().replace(/^%20/, '').replace(/%20$/, '');
}

/**
 * Extracts unique leads from GMB scrape results
 * 
 * @param items - Array of scraped GMB items
 * @param defaultIndustry - Fallback industry if not found in item
 * @returns ExtractionResult with unique leads (1 per domain)
 */
export function extractLeadsFromGmbScrape(
  items: GmbScrapedItem[],
  defaultIndustry: string = 'Unknown'
): ExtractionResult {
  const emailsByDomain = new Map<string, ExtractedLead>();
  let totalEmailsFound = 0;
  let skippedInvalidEmails = 0;

  for (const item of items) {
    // Collect all emails from the item
    const itemEmails: string[] = [];
    
    // Direct email field
    if (item.email && typeof item.email === 'string') {
      itemEmails.push(item.email);
    }
    
    // Emails array
    if (item.emails && Array.isArray(item.emails)) {
      for (const email of item.emails) {
        if (email && typeof email === 'string') {
          itemEmails.push(email);
        }
      }
    }

    // Process each email
    for (const rawEmail of itemEmails) {
      totalEmailsFound++;
      
      const email = cleanEmail(rawEmail);
      
      if (!isValidEmail(email)) {
        skippedInvalidEmails++;
        continue;
      }
      
      const domain = extractDomain(email);
      if (!domain) {
        skippedInvalidEmails++;
        continue;
      }
      
      // Only keep 1 email per domain (first one wins)
      if (emailsByDomain.has(domain)) {
        continue;
      }
      
      // Extract location info with fallbacks
      const city = item.city || '';
      const state = item.state || '';
      const countryCode = item.countryCode || 'US';
      
      // Extract industry from categoryName or first category
      const industry = item.categoryName 
        || (item.categories && item.categories.length > 0 ? item.categories[0] : null)
        || defaultIndustry;
      
      const lead: ExtractedLead = {
        email,
        domain,
        companyName: item.title || null,
        leadType: 'business', // GMB scrapes are always business leads
        phone: item.phone || item.phoneUnformatted || null,
        website: item.website || null,
        address: item.address || null,
        city,
        state,
        countryCode,
        industry,
      };
      
      emailsByDomain.set(domain, lead);
    }
  }

  return {
    leads: Array.from(emailsByDomain.values()),
    totalEmailsFound,
    uniqueDomainsFound: emailsByDomain.size,
    skippedInvalidEmails,
  };
}

/**
 * Groups leads by location for batch processing
 */
export function groupLeadsByLocation(
  leads: ExtractedLead[]
): Map<string, ExtractedLead[]> {
  const groups = new Map<string, ExtractedLead[]>();
  
  for (const lead of leads) {
    const key = `${lead.leadType}|${lead.industry}|${lead.city}|${lead.state}|${lead.countryCode}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(lead);
  }
  
  return groups;
}

/**
 * Parse location key back into components
 */
export function parseLocationKey(key: string): {
  leadType: 'business' | 'person';
  industry: string;
  city: string;
  state: string;
  countryCode: string;
} {
  const [leadType, industry, city, state, countryCode] = key.split('|');
  return {
    leadType: leadType as 'business' | 'person',
    industry,
    city,
    state,
    countryCode,
  };
}


