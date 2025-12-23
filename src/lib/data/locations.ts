/**
 * Location Data Utilities
 * 
 * Provides access to US and Canada states/provinces and cities
 * using the country-state-city package.
 */

import { State, City, IState, ICity } from 'country-state-city';

// Supported countries for GMB Lead Finder
export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'AU', name: 'Australia' },
] as const;

export type SupportedCountryCode = 'US' | 'CA' | 'GB' | 'DE' | 'AU';

export interface GMBTarget {
  industry: string;
  country: SupportedCountryCode;
  countryName: string;
  state: string | null;      // null = "Anywhere in Country"
  stateCode: string | null;
  city: string | null;       // null = "Anywhere in State/Country"
  // Status tracking (set by backend after scraping)
  fulfilled_at?: string | null;    // When this target was fulfilled (ISO timestamp)
  cache_id?: string | null;        // Reference to gmb_scrape_cache entry used
  result_count?: number | null;    // How many results were found
}

// Cache for states and cities to avoid repeated lookups
const statesCache: Record<string, IState[]> = {};
const citiesCache: Record<string, ICity[]> = {};

/**
 * Get all states/provinces for a country
 */
export function getStates(countryCode: SupportedCountryCode): IState[] {
  if (!statesCache[countryCode]) {
    statesCache[countryCode] = State.getStatesOfCountry(countryCode);
  }
  return statesCache[countryCode];
}

/**
 * Get all cities for a state
 */
export function getCities(countryCode: SupportedCountryCode, stateCode: string): ICity[] {
  const cacheKey = `${countryCode}-${stateCode}`;
  if (!citiesCache[cacheKey]) {
    citiesCache[cacheKey] = City.getCitiesOfState(countryCode, stateCode);
  }
  return citiesCache[cacheKey];
}

/**
 * Get state name from state code
 */
export function getStateName(countryCode: SupportedCountryCode, stateCode: string): string | null {
  const states = getStates(countryCode);
  const state = states.find(s => s.isoCode === stateCode);
  return state?.name || null;
}

/**
 * Get country name from country code
 */
export function getCountryName(countryCode: SupportedCountryCode): string {
  const country = SUPPORTED_COUNTRIES.find(c => c.code === countryCode);
  return country?.name || countryCode;
}

/**
 * Format a GMB target for display
 */
export function formatGMBTarget(target: GMBTarget): string {
  const parts: string[] = [target.industry];
  
  if (!target.state && !target.city) {
    // Anywhere in country
    parts.push(`Anywhere in ${target.countryName}`);
  } else if (!target.city) {
    // Anywhere in state
    parts.push(`Anywhere in ${target.state}, ${target.country}`);
  } else {
    // Specific city
    parts.push(`${target.city}, ${target.stateCode}, ${target.country}`);
  }
  
  return parts.join(' in ');
}

/**
 * Validate a GMB target
 */
export function validateGMBTarget(target: Partial<GMBTarget>): string | null {
  if (!target.industry?.trim()) {
    return 'Industry is required';
  }
  
  if (!target.country) {
    return 'Country is required';
  }
  
  if (!SUPPORTED_COUNTRIES.some(c => c.code === target.country)) {
    return 'Invalid country selected';
  }
  
  // If state is provided, validate it exists
  if (target.stateCode) {
    const states = getStates(target.country as SupportedCountryCode);
    if (!states.some(s => s.isoCode === target.stateCode)) {
      return 'Invalid state selected';
    }
  }
  
  // If city is provided, state must also be provided
  if (target.city && !target.stateCode) {
    return 'State is required when city is specified';
  }
  
  return null;
}

/**
 * Create a GMB target object
 */
export function createGMBTarget(params: {
  industry: string;
  country: SupportedCountryCode;
  stateCode?: string | null;
  city?: string | null;
}): GMBTarget {
  const countryName = getCountryName(params.country);
  const stateName = params.stateCode 
    ? getStateName(params.country, params.stateCode) 
    : null;
  
  return {
    industry: params.industry.trim(),
    country: params.country,
    countryName,
    state: stateName,
    stateCode: params.stateCode || null,
    city: params.city?.trim() || null,
  };
}

/**
 * Check if two GMB targets are duplicates
 */
export function isDuplicateTarget(existing: GMBTarget[], newTarget: GMBTarget): boolean {
  return existing.some(t => 
    t.industry.toLowerCase() === newTarget.industry.toLowerCase() &&
    t.country === newTarget.country &&
    t.stateCode === newTarget.stateCode &&
    t.city?.toLowerCase() === newTarget.city?.toLowerCase()
  );
}

/**
 * Generate a cache key for a GMB target
 * Used to look up cached scrape results in gmb_scrape_cache table
 */
export function generateCacheKey(target: GMBTarget): string {
  const parts = [
    target.industry.toLowerCase().trim(),
    target.country,
    target.stateCode || '',
    (target.city || '').toLowerCase().trim()
  ];
  return parts.join('|');
}

/**
 * Check if a target has been fulfilled (already scraped)
 */
export function isTargetFulfilled(target: GMBTarget): boolean {
  return target.fulfilled_at != null;
}

/**
 * Get unfulfilled targets from a list
 */
export function getUnfulfilledTargets(targets: GMBTarget[]): GMBTarget[] {
  return targets.filter(t => !isTargetFulfilled(t));
}

/**
 * Check if all targets are fulfilled
 */
export function areAllTargetsFulfilled(targets: GMBTarget[]): boolean {
  if (targets.length === 0) return false;
  return targets.every(t => isTargetFulfilled(t));
}

